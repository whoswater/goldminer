"""
实时行情 & K线数据 API
数据源: akshare (新浪接口 stock_zh_a_spot / stock_zh_a_daily)
- 实时行情: 缓存60秒，首次加载约30秒拉全市场5000+只
- K线数据: 新浪日K，前复权，按需拉取不缓存
"""
import logging
import time
import threading
import pandas as pd
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

realtime_api = Blueprint('realtime_api', __name__)

# ── 实时行情缓存（线程安全） ─────────────────────────
_spot_lock = threading.Lock()
_spot_cache = {'data': None, 'ts': 0, 'loading': False}
SPOT_CACHE_TTL = 60  # 缓存60秒


def _do_fetch_spot() -> pd.DataFrame | None:
    """底层拉取（带重试）"""
    import akshare as ak
    for attempt in range(3):
        try:
            df = ak.stock_zh_a_spot()
            df = df.rename(columns={
                '代码': 'symbol', '名称': 'name', '最新价': 'price',
                '涨跌额': 'change', '涨跌幅': 'pct_change',
                '买入': 'bid', '卖出': 'ask', '昨收': 'prev_close',
                '今开': 'open', '最高': 'high', '最低': 'low',
                '成交量': 'volume', '成交额': 'amount', '时间戳': 'timestamp',
            })
            df['code'] = df['symbol'].str.replace(r'^(sh|sz|bj)', '', regex=True)
            for col in ['price', 'change', 'pct_change', 'prev_close', 'open', 'high', 'low', 'volume', 'amount']:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            return df
        except Exception as e:
            logger.warning(f'实时行情获取失败(第{attempt+1}次): {e}')
            if attempt < 2:
                time.sleep(2)
    return None


def _get_all_spot() -> pd.DataFrame:
    """获取全市场实时行情（带缓存 + 后台刷新）"""
    now = time.time()
    # 缓存有效直接返回
    if _spot_cache['data'] is not None and (now - _spot_cache['ts']) < SPOT_CACHE_TTL:
        return _spot_cache['data']

    with _spot_lock:
        # 双重检查
        if _spot_cache['data'] is not None and (time.time() - _spot_cache['ts']) < SPOT_CACHE_TTL:
            return _spot_cache['data']
        if _spot_cache['loading']:
            # 正在加载，返回旧数据（可能为空）
            return _spot_cache['data'] if _spot_cache['data'] is not None else pd.DataFrame()

        _spot_cache['loading'] = True

    # 在当前线程拉取（首次必须等待）
    df = _do_fetch_spot()
    with _spot_lock:
        _spot_cache['loading'] = False
        if df is not None and not df.empty:
            _spot_cache['data'] = df
            _spot_cache['ts'] = time.time()
            logger.info(f'实时行情刷新: {len(df)}只股票')
            return df

    # 拉取失败，返回旧缓存
    return _spot_cache['data'] if _spot_cache['data'] is not None else pd.DataFrame()


# ── API 路由 ─────────────────────────────────────────

@realtime_api.route('/realtime/all')
def realtime_all():
    """全市场实时行情（分页 + 搜索 + 排序）"""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 200)
    keyword = request.args.get('keyword', '').strip()
    sort_by = request.args.get('sort', '')
    order = request.args.get('order', 'desc')

    df = _get_all_spot()
    if df.empty:
        return jsonify({'data': [], 'total': 0, 'page': page, 'loading': _spot_cache['loading']})

    if keyword:
        mask = (
            df['code'].astype(str).str.contains(keyword, na=False) |
            df['name'].astype(str).str.contains(keyword, na=False)
        )
        df = df[mask]

    if sort_by and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=(order == 'asc'))

    total = len(df)
    start = (page - 1) * per_page
    cols = ['code', 'name', 'price', 'change', 'pct_change', 'prev_close',
            'open', 'high', 'low', 'volume', 'amount']
    out_cols = [c for c in cols if c in df.columns]
    data = df.iloc[start:start + per_page][out_cols].to_dict('records')

    return jsonify({
        'data': data,
        'total': total,
        'page': page,
        'per_page': per_page,
        'cache_age': round(time.time() - _spot_cache['ts'], 1) if _spot_cache['ts'] > 0 else None,
    })


@realtime_api.route('/realtime/quote/<code>')
def realtime_quote(code):
    """单只股票实时行情"""
    df = _get_all_spot()
    if df.empty:
        return jsonify({'error': '行情加载中，请稍后刷新'}), 503

    row = df[df['code'] == code]
    if row.empty:
        return jsonify({'error': '未找到该股票'}), 404

    r = row.iloc[0]
    cols = ['code', 'name', 'price', 'change', 'pct_change', 'prev_close',
            'open', 'high', 'low', 'volume', 'amount']
    result = {}
    for c in cols:
        if c in r.index:
            v = r[c]
            result[c] = float(v) if c != 'code' and c != 'name' else str(v)
    return jsonify(result)


@realtime_api.route('/realtime/kline/<code>')
def realtime_kline(code):
    """日K线数据 (新浪 stock_zh_a_daily, 前复权)"""
    days = min(request.args.get('days', 180, type=int), 1000)

    from datetime import datetime, timedelta
    end_date = datetime.now().strftime('%Y%m%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y%m%d')

    # 新浪格式 symbol
    if code.startswith('6') or code.startswith('5'):
        symbol = f'sh{code}'
    elif code.startswith('9'):
        symbol = f'bj{code}'
    else:
        symbol = f'sz{code}'

    try:
        import akshare as ak
        df = ak.stock_zh_a_daily(symbol=symbol, start_date=start_date,
                                  end_date=end_date, adjust='qfq')
        if df.empty:
            return jsonify([])

        df['date'] = df['date'].astype(str)
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        records = []
        for _, r in df.iterrows():
            records.append({
                'date': r['date'],
                'open': round(float(r['open']), 2),
                'close': round(float(r['close']), 2),
                'low': round(float(r['low']), 2),
                'high': round(float(r['high']), 2),
                'volume': int(r['volume']),
            })
        return jsonify(records)
    except Exception as e:
        logger.warning(f'K线数据获取失败 {code}: {e}')
        return jsonify({'error': f'K线加载失败: {e}'}), 503
