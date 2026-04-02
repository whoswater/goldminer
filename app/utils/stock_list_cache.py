"""
A股股票列表本地缓存
启动时从 akshare 拉取全部 A 股代码+名称，存本地 JSON，后续直接读本地。
支持按代码/名称模糊搜索。
"""
import os
import json
import logging
import time
import threading
from app.config import DATA_DIR

logger = logging.getLogger(__name__)

STOCK_LIST_FILE = os.path.join(DATA_DIR, 'stock_list_all.json')
_cache_lock = threading.Lock()
_stock_list: list[dict] | None = None  # [{'code': '000001', 'name': '平安银行'}, ...]
_last_load_ts: float = 0


def _fetch_from_akshare() -> list[dict]:
    """从 akshare 拉取全部 A 股列表"""
    import akshare as ak
    df = ak.stock_info_a_code_name()
    stocks = []
    for _, row in df.iterrows():
        code = str(row.get('code', '')).strip()
        name = str(row.get('name', '')).strip()
        if code and name:
            stocks.append({'code': code, 'name': name})
    return stocks


def _save_to_file(stocks: list[dict]):
    os.makedirs(os.path.dirname(STOCK_LIST_FILE), exist_ok=True)
    with open(STOCK_LIST_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'update_time': time.strftime('%Y-%m-%d %H:%M:%S'),
            'count': len(stocks),
            'stocks': stocks,
        }, f, ensure_ascii=False)
    logger.info(f'股票列表已保存: {len(stocks)} 只')


def _load_from_file() -> list[dict] | None:
    if not os.path.exists(STOCK_LIST_FILE):
        return None
    try:
        with open(STOCK_LIST_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('stocks', [])
    except Exception as e:
        logger.warning(f'读取股票列表失败: {e}')
        return None


def init_stock_list():
    """初始化股票列表（先读本地，没有再拉远程）。在应用启动时调用。"""
    global _stock_list, _last_load_ts

    # 先尝试本地文件
    stocks = _load_from_file()
    if stocks and len(stocks) > 1000:
        with _cache_lock:
            _stock_list = stocks
            _last_load_ts = time.time()
        logger.info(f'股票列表已从本地加载: {len(stocks)} 只')
        # 后台异步刷新（如果文件超过24小时）
        try:
            mtime = os.path.getmtime(STOCK_LIST_FILE)
            if time.time() - mtime > 86400:
                threading.Thread(target=_refresh_async, daemon=True).start()
        except Exception:
            pass
        return

    # 本地没有，直接拉
    logger.info('股票列表本地不存在，从 akshare 拉取...')
    try:
        stocks = _fetch_from_akshare()
        if stocks:
            _save_to_file(stocks)
            with _cache_lock:
                _stock_list = stocks
                _last_load_ts = time.time()
            logger.info(f'股票列表初始化完成: {len(stocks)} 只')
    except Exception as e:
        logger.error(f'股票列表初始化失败: {e}')


def _refresh_async():
    """后台刷新股票列表"""
    global _stock_list, _last_load_ts
    try:
        stocks = _fetch_from_akshare()
        if stocks and len(stocks) > 1000:
            _save_to_file(stocks)
            with _cache_lock:
                _stock_list = stocks
                _last_load_ts = time.time()
            logger.info(f'股票列表后台刷新完成: {len(stocks)} 只')
    except Exception as e:
        logger.warning(f'股票列表后台刷新失败: {e}')


def get_stock_list() -> list[dict]:
    """获取完整股票列表"""
    if _stock_list is None:
        init_stock_list()
    return _stock_list or []


def search_stocks(keyword: str, limit: int = 20) -> list[dict]:
    """
    按代码或名称模糊搜索。
    代码前缀匹配优先，名称包含匹配其次。
    """
    keyword = keyword.strip()
    if not keyword:
        return []

    stocks = get_stock_list()
    if not stocks:
        return []

    code_prefix = []  # 代码前缀匹配
    code_contains = []  # 代码包含匹配
    name_matches = []  # 名称包含匹配

    kw_upper = keyword.upper()
    for s in stocks:
        code = s['code']
        name = s['name']
        if code.startswith(keyword):
            code_prefix.append(s)
        elif keyword in code:
            code_contains.append(s)
        elif keyword in name:
            name_matches.append(s)

    result = code_prefix + code_contains + name_matches
    return result[:limit]


def get_stock_name(code: str) -> str:
    """根据代码查名称"""
    stocks = get_stock_list()
    for s in stocks:
        if s['code'] == code:
            return s['name']
    return ''
