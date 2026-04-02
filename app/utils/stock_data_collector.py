"""
全面的个股数据采集器
汇总一切可获得的信息：基本面、业绩预告、财务摘要、分析师预测、新闻、K线
所有外部数据源并行采集，大幅缩短总耗时。
"""
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)


def collect_stock_data(code: str) -> dict:
    """
    并行采集个股的所有可用数据。
    网络请求全部并发执行，总耗时 ≈ 最慢的单个请求。
    """
    result = {
        'code': code,
        'collect_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'basic_info': None,
        'realtime_quote': None,
        'financial_summary': None,
        'earnings_forecast': None,
        'earnings_express': None,
        'analyst_forecast': None,
        'news': None,
        'announcements': None,
        'earnings_signals': None,
        'kline_trend': None,
        'valuation': None,
        'fund_flow': None,          # 主力资金流向
        'top_holders': None,        # 十大流通股东
        'income_statement': None,   # 利润表（按报告期）
        'cash_flow': None,          # 现金流量表
    }

    # 定义所有采集任务（网络任务 + 本地任务）
    tasks = {
        'basic_info': lambda: _fetch_basic_info(code),
        'realtime_quote': lambda: _fetch_realtime_quote(code),
        'financial_summary': lambda: _fetch_financial_summary(code),
        '_earnings_combined': lambda: _fetch_earnings_combined(code),
        'analyst_forecast': lambda: _fetch_analyst_forecast(code),
        'news': lambda: _fetch_news(code),
        'kline_trend': lambda: _fetch_kline_trend(code),
        'fund_flow': lambda: _fetch_fund_flow(code),
        'top_holders': lambda: _fetch_top_holders(code),
        'income_statement': lambda: _fetch_income_statement(code),
        'cash_flow': lambda: _fetch_cash_flow(code),
        'announcements': lambda: _fetch_local_announcements(code),
        'earnings_signals': lambda: _fetch_local_earnings_signals(code),
        'valuation': lambda: _fetch_local_valuation(code),
    }

    # 并行执行所有任务
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(fn): key for key, fn in tasks.items()}
        for future in as_completed(futures):
            key = futures[future]
            try:
                val = future.result()
                if val is None:
                    continue
                if key == '_earnings_combined':
                    # 拆分回 forecast 和 express
                    if val.get('forecast'):
                        result['earnings_forecast'] = val['forecast']
                    if val.get('express'):
                        result['earnings_express'] = val['express']
                else:
                    result[key] = val
            except Exception as e:
                logger.warning(f'[{code}] {key} 异常: {e}')

    # 兜底：如果 basic_info 采集失败，从本地股票列表缓存补全名称
    if not result['basic_info']:
        try:
            from app.utils.stock_list_cache import get_stock_name
            name = get_stock_name(code)
            if name:
                result['basic_info'] = {'股票简称': name, '股票代码': code}
                logger.info(f'[{code}] 基本信息: 从本地缓存补全 ({name})')
        except Exception:
            pass

    return result


# ── 各数据源的独立采集函数 ──────────────────────────

def _fetch_basic_info(code):
    import akshare as ak
    for attempt in range(2):
        try:
            df = ak.stock_individual_info_em(symbol=code)
            info = {row['item']: row['value'] for _, row in df.iterrows()}
            logger.info(f'[{code}] 基本信息: OK')
            return info
        except Exception as e:
            if attempt == 1:
                logger.warning(f'[{code}] 基本信息失败: {e}')
    return None


def _fetch_realtime_quote(code):
    # 优先实时缓存
    try:
        from app.api.realtime import _get_all_spot
        spot_df = _get_all_spot()
        if spot_df is not None and not spot_df.empty:
            row = spot_df[spot_df['code'] == code]
            if not row.empty:
                r = row.iloc[0]
                logger.info(f'[{code}] 实时行情: OK (实时)')
                return {
                    'price': float(r.get('price', 0)),
                    'open': float(r.get('open', 0)),
                    'high': float(r.get('high', 0)),
                    'low': float(r.get('low', 0)),
                    'volume': int(r.get('volume', 0)),
                    'amount': float(r.get('amount', 0)),
                    'change': float(r.get('change', 0)),
                    'pct_change': float(r.get('pct_change', 0)),
                    'prev_close': float(r.get('prev_close', 0)),
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'source': 'realtime',
                }
    except Exception:
        pass

    # 降级日K
    try:
        import akshare as ak
        symbol = _to_sina_symbol(code)
        end_date = datetime.now().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=10)).strftime('%Y%m%d')
        df = ak.stock_zh_a_daily(symbol=symbol, start_date=start_date,
                                  end_date=end_date, adjust='qfq')
        if not df.empty:
            r = df.iloc[-1]
            logger.info(f'[{code}] 实时行情: OK (日K降级)')
            return {
                'price': float(r['close']), 'open': float(r['open']),
                'high': float(r['high']), 'low': float(r['low']),
                'volume': int(r['volume']), 'date': str(r['date']),
                'source': 'daily_k',
            }
    except Exception as e:
        logger.warning(f'[{code}] 行情失败: {e}')
    return None


def _fetch_financial_summary(code):
    import akshare as ak
    try:
        df = ak.stock_financial_abstract(symbol=code)
        if df.empty:
            return None
        key_indicators = ['归母净利润', '营业总收入', '营业成本', '毛利率',
                        '净利率', '加权ROE', '基本每股收益', '每股净资产',
                        '经营现金流', '总资产', '总负债', '资产负债率']
        date_cols = [c for c in df.columns if c not in ['选项', '指标'] and c.isdigit()]
        recent_cols = sorted(date_cols, reverse=True)[:4]
        summary = {}
        for _, row in df.iterrows():
            indicator = row['指标']
            if indicator in key_indicators:
                values = {}
                for col in recent_cols:
                    val = row.get(col)
                    if val is not None and str(val) != 'nan':
                        try:
                            values[col] = float(val)
                        except (ValueError, TypeError):
                            values[col] = str(val)
                if values:
                    summary[indicator] = values
        logger.info(f'[{code}] 财务摘要: OK, {len(summary)}个指标')
        return summary if summary else None
    except Exception as e:
        logger.warning(f'[{code}] 财务摘要失败: {e}')
        return None


def _fetch_earnings_combined(code):
    """业绩预告 + 业绩快报合并查询，共享报告期遍历，减少API调用"""
    import akshare as ak
    result = {'forecast': None, 'express': None}
    periods = _recent_report_dates()

    # 预告和快报并行查询（各自只查第一个命中的报告期）
    def _try_forecast():
        for period in periods:
            try:
                df = ak.stock_yjyg_em(date=period)
                if df is None or df.empty:
                    continue
                match = df[df['股票代码'] == code]
                if not match.empty:
                    records = []
                    for _, row in match.iterrows():
                        records.append({
                            'indicator': row.get('预测指标', ''),
                            'change_desc': row.get('业绩变动', ''),
                            'forecast_value': _safe_float(row.get('预测数值')),
                            'change_pct': _safe_float(row.get('业绩变动幅度')),
                            'change_reason': row.get('业绩变动原因', ''),
                            'forecast_type': row.get('预告类型', ''),
                            'prev_value': _safe_float(row.get('上年同期值')),
                            'announce_date': str(row.get('公告日期', '')),
                            'period': period,
                        })
                    logger.info(f'[{code}] 业绩预告: OK, {len(records)}条')
                    return records
            except Exception as e:
                logger.warning(f'[{code}] 业绩预告({period})失败: {e}')
        return None

    def _try_express():
        for period in periods:
            try:
                df = ak.stock_yjkb_em(date=period)
                if df is None or df.empty:
                    continue
                match = df[df['股票代码'] == code]
                if not match.empty:
                    row = match.iloc[0]
                    logger.info(f'[{code}] 业绩快报: OK')
                    return {
                        'eps': _safe_float(row.get('每股收益')),
                        'revenue': _safe_float(row.get('营业收入-营业收入')),
                        'revenue_prev': _safe_float(row.get('营业收入-去年同期')),
                        'revenue_yoy': _safe_float(row.get('营业收入-同比增长')),
                        'profit': _safe_float(row.get('净利润-净利润')),
                        'profit_prev': _safe_float(row.get('净利润-去年同期')),
                        'profit_yoy': _safe_float(row.get('净利润-同比增长')),
                        'bvps': _safe_float(row.get('每股净资产')),
                        'roe': _safe_float(row.get('净资产收益率')),
                        'industry': row.get('所处行业', ''),
                        'announce_date': str(row.get('公告日期', '')),
                        'period': period,
                    }
            except Exception as e:
                logger.warning(f'[{code}] 业绩快报({period})失败: {e}')
        return None

    # 预告和快报也并行
    with ThreadPoolExecutor(max_workers=2) as ex:
        f_forecast = ex.submit(_try_forecast)
        f_express = ex.submit(_try_express)
        result['forecast'] = f_forecast.result()
        result['express'] = f_express.result()

    return result


def _fetch_analyst_forecast(code):
    import akshare as ak
    try:
        df = ak.stock_profit_forecast_ths(symbol=code, indicator='预测年报每股收益')
        if df is None or df.empty:
            return None
        forecasts = []
        for _, row in df.iterrows():
            forecasts.append({
                'year': str(row.get('年度', '')),
                'analyst_count': int(row.get('预测机构数', 0)),
                'eps_min': _safe_float(row.get('最小值')),
                'eps_mean': _safe_float(row.get('均值')),
                'eps_max': _safe_float(row.get('最大值')),
                'industry_avg': _safe_float(row.get('行业平均数')),
            })
        logger.info(f'[{code}] 分析师预测: OK, {len(forecasts)}年')
        return forecasts
    except Exception as e:
        logger.warning(f'[{code}] 分析师预测失败: {e}')
        return None


def _fetch_news(code):
    import akshare as ak
    try:
        df = ak.stock_news_em(symbol=code)
        if df is None or df.empty:
            return None
        news = []
        for _, row in df.head(10).iterrows():
            news.append({
                'title': row.get('新闻标题', ''),
                'content': str(row.get('新闻内容', ''))[:500],
                'time': str(row.get('发布时间', '')),
                'source': row.get('文章来源', ''),
            })
        logger.info(f'[{code}] 新闻: OK, {len(news)}条')
        return news
    except Exception as e:
        logger.warning(f'[{code}] 新闻失败: {e}')
        return None


def _fetch_kline_trend(code):
    import akshare as ak
    try:
        symbol = _to_sina_symbol(code)
        end_date = datetime.now().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=180)).strftime('%Y%m%d')
        df = ak.stock_zh_a_daily(symbol=symbol, start_date=start_date,
                                  end_date=end_date, adjust='qfq')
        if df.empty or len(df) <= 5:
            return None
        closes = df['close'].astype(float).tolist()
        logger.info(f'[{code}] K线趋势: OK, {len(df)}天')
        return {
            'days': len(df),
            'latest_close': closes[-1],
            'high_180d': max(closes),
            'low_180d': min(closes),
            'change_30d_pct': round((closes[-1] / closes[-min(30, len(closes))] - 1) * 100, 2) if len(closes) > 1 else 0,
            'change_90d_pct': round((closes[-1] / closes[-min(90, len(closes))] - 1) * 100, 2) if len(closes) > 1 else 0,
            'ma20': round(sum(closes[-20:]) / min(20, len(closes)), 2),
            'ma60': round(sum(closes[-60:]) / min(60, len(closes)), 2),
        }
    except Exception as e:
        logger.warning(f'[{code}] K线趋势失败: {e}')
        return None


def _fetch_local_announcements(code):
    try:
        from app.utils.file_storage import load_all_announcements
        df = load_all_announcements()
        if df.empty:
            return None
        filtered = df[df['stock_code'].astype(str) == str(code)]
        if filtered.empty:
            return None
        return [{'title': r.get('title', ''), 'type': r.get('announce_type', ''),
                 'date': r.get('publish_date', '')} for _, r in filtered.head(15).iterrows()]
    except Exception:
        return None


def _fetch_local_earnings_signals(code):
    try:
        from app.utils.file_storage import load_latest_earnings
        df = load_latest_earnings(90)
        if df.empty:
            return None
        filtered = df[df['stock_code'].astype(str) == str(code)]
        if filtered.empty:
            return None
        return [{'signal': r.get('signal', ''), 'signal_text': r.get('signal_text', ''),
                 'keywords': r.get('keywords', ''), 'growth_pct': r.get('growth_pct', ''),
                 'strength': r.get('strength', ''), 'title': r.get('title', ''),
                 'date': r.get('publish_date', '')} for _, r in filtered.iterrows()]
    except Exception:
        return None


def _fetch_local_valuation(code):
    try:
        from app.utils.file_storage import load_latest_valuation
        df = load_latest_valuation()
        if df.empty:
            return None
        row = df[df['code'].astype(str) == str(code)]
        if row.empty:
            return None
        r = row.iloc[0]
        return {
            'price': float(r.get('price', 0)),
            'intrinsic_value': float(r.get('intrinsic_value', 0)),
            'pe': float(r.get('pe', 0)), 'pb': float(r.get('pb', 0)),
            'eps': float(r.get('eps', 0)), 'roe': float(r.get('roe', 0)),
            'industry': str(r.get('industry', '')),
        }
    except Exception:
        return None


def _fetch_fund_flow(code):
    """主力资金流向（近期）"""
    import akshare as ak
    try:
        market = 'sh' if code.startswith(('6', '5')) else 'sz'
        df = ak.stock_individual_fund_flow(stock=code, market=market)
        if df is None or df.empty:
            return None
        # 取最近10天
        recent = df.tail(10)
        records = []
        for _, row in recent.iterrows():
            records.append({
                'date': str(row.get('日期', '')),
                'close': _safe_float(row.get('收盘价')),
                'pct_change': _safe_float(row.get('涨跌幅')),
                'main_net': _safe_float(row.get('主力净流入-净额')),
                'main_pct': _safe_float(row.get('主力净流入-净占比')),
                'super_large_net': _safe_float(row.get('超大单净流入-净额')),
                'large_net': _safe_float(row.get('大单净流入-净额')),
            })
        # 汇总
        main_total = sum(r['main_net'] or 0 for r in records)
        logger.info(f'[{code}] 资金流向: OK, {len(records)}天')
        return {'days': records, 'main_net_total': main_total}
    except Exception as e:
        logger.warning(f'[{code}] 资金流向失败: {e}')
        return None


def _fetch_top_holders(code):
    """十大流通股东"""
    import akshare as ak
    try:
        df = ak.stock_circulate_stock_holder(symbol=code)
        if df is None or df.empty:
            return None
        latest_date = df['截止日期'].max()
        latest = df[df['截止日期'] == latest_date]
        holders = []
        for _, row in latest.iterrows():
            holders.append({
                'name': row.get('股东名称', ''),
                'shares': row.get('持股数量', 0),
                'pct': _safe_float(row.get('占流通股比例')),
                'type': row.get('股本性质', ''),
            })
        logger.info(f'[{code}] 股东: OK, 截止{latest_date}, {len(holders)}位')
        return {'date': str(latest_date), 'holders': holders}
    except Exception as e:
        logger.warning(f'[{code}] 股东失败: {e}')
        return None


def _fetch_income_statement(code):
    """利润表（按报告期，最近6期）"""
    import akshare as ak
    try:
        df = ak.stock_financial_benefit_ths(symbol=code, indicator="按报告期")
        if df is None or df.empty:
            return None
        records = []
        for _, row in df.head(6).iterrows():
            records.append({
                'period': str(row.get('报告期', '')),
                'net_profit': str(row.get('*净利润', '')),
                'revenue': str(row.get('*营业总收入', '')),
                'parent_net_profit': str(row.get('*归属于母公司所有者的净利润', '')),
                'deducted_profit': str(row.get('*扣除非经常性损益后的净利润', '')),
            })
        logger.info(f'[{code}] 利润表: OK, {len(records)}期')
        return records
    except Exception as e:
        logger.warning(f'[{code}] 利润表失败: {e}')
        return None


def _fetch_cash_flow(code):
    """现金流量表（按报告期，最近6期）"""
    import akshare as ak
    try:
        df = ak.stock_financial_cash_ths(symbol=code, indicator="按报告期")
        if df is None or df.empty:
            return None
        records = []
        for _, row in df.head(6).iterrows():
            records.append({
                'period': str(row.get('报告期', '')),
                'operating': str(row.get('*经营活动产生的现金流量净额', '')),
                'investing': str(row.get('*投资活动产生的现金流量净额', '')),
                'financing': str(row.get('*筹资活动产生的现金流量净额', '')),
                'ending_cash': str(row.get('*期末现金及现金等价物余额', '')),
            })
        logger.info(f'[{code}] 现金流: OK, {len(records)}期')
        return records
    except Exception as e:
        logger.warning(f'[{code}] 现金流失败: {e}')
        return None


def format_for_ai(data: dict) -> str:
    """将采集到的数据格式化为AI可读的文本"""
    parts = []
    code = data.get('code', '?')

    # 基本信息
    info = data.get('basic_info')
    if info:
        name = info.get('股票简称', '?')
        parts.append(f"## 基本信息\n股票: {name}({code}), 行业: {info.get('行业', '?')}, "
                     f"总市值: {_fmt_big_num(info.get('总市值'))}, 上市时间: {info.get('上市时间', '?')}")

    # 实时行情
    quote = data.get('realtime_quote')
    if quote:
        lines = [f"## 实时行情\n最新价: {quote['price']}, 日期: {quote['date']}"]
        if quote.get('pct_change') is not None:
            lines.append(f"涨跌幅: {quote['pct_change']}%, 涨跌额: {quote.get('change', '-')}")
        if quote.get('prev_close'):
            lines.append(f"昨收: {quote['prev_close']}, 今开: {quote['open']}, 最高: {quote['high']}, 最低: {quote['low']}")
        if quote.get('amount'):
            lines.append(f"成交额: {_fmt_big_num(quote['amount'])}")
        parts.append('\n'.join(lines))

    # ---- 以下按前瞻分析的优先级排列 ----

    # 分析师一致预测（最关键的锚点）
    af = data.get('analyst_forecast')
    if af:
        lines = ["## 分析师一致预期（市场预期锚点）"]
        for item in af:
            lines.append(f"- {item['year']}年: {item['analyst_count']}家机构预测, "
                        f"EPS均值 {item['eps_mean']}, 范围[{item['eps_min']}~{item['eps_max']}], "
                        f"行业均值 {item['industry_avg']}")
        parts.append('\n'.join(lines))

    # 估值（隐含增长预期）
    val = data.get('valuation')
    quote = data.get('realtime_quote')
    if val:
        lines = [f"## 当前估值（隐含市场预期）"]
        lines.append(f"PE: {val['pe']}, PB: {val['pb']}, 当前EPS: {val['eps']}, ROE: {val['roe']}")
        lines.append(f"当前价: {val['price']}, 内在价值模型估算: {val['intrinsic_value']}")
        if val['pe'] and val['pe'] > 0 and af:
            # 计算PE隐含的增长预期
            try:
                current_eps = float(val['eps'])
                implied_growth = None
                for item in af:
                    if item.get('eps_mean') and current_eps > 0:
                        implied_growth = round((float(item['eps_mean']) / current_eps - 1) * 100, 1)
                        lines.append(f"当前PE隐含：若{item['year']}年EPS达到一致预期{item['eps_mean']}，"
                                    f"意味着EPS需增长{implied_growth}%")
                        break
            except (ValueError, TypeError, ZeroDivisionError):
                pass
        parts.append('\n'.join(lines))

    # 业绩预告（已披露的最新信号）
    fc = data.get('earnings_forecast')
    if fc:
        lines = ["## 已披露业绩预告"]
        for item in fc:
            lines.append(f"- [{item['forecast_type']}] {item['indicator']}: "
                        f"变动{item['change_pct']}%, 预测值{_fmt_big_num(item['forecast_value'])}, "
                        f"上年同期{_fmt_big_num(item['prev_value'])}")
            if item.get('change_reason'):
                lines.append(f"  变动原因: {item['change_reason'][:300]}")
        parts.append('\n'.join(lines))

    # 业绩快报
    expr = data.get('earnings_express')
    if expr:
        parts.append(f"## 已披露业绩快报\n"
                     f"EPS: {expr['eps']}, 营收: {_fmt_big_num(expr['revenue'])}(同比{expr['revenue_yoy']}%), "
                     f"净利润: {_fmt_big_num(expr['profit'])}(同比{expr['profit_yoy']}%), "
                     f"ROE: {expr['roe']}%, 行业: {expr['industry']}")

    # 财务趋势（用于推断未来）
    fin = data.get('financial_summary')
    if fin:
        lines = ["## 财务趋势(最近几期，用于趋势外推)"]
        for indicator, values in fin.items():
            vals_str = ', '.join(f"{k}: {_fmt_big_num(v)}" for k, v in list(values.items())[:4])
            lines.append(f"- {indicator}: {vals_str}")
        # 计算增速趋势
        _append_growth_trend(lines, fin)
        parts.append('\n'.join(lines))

    # 价格趋势
    kline = data.get('kline_trend')
    if kline:
        parts.append(f"## 价格趋势\n"
                     f"近30天涨跌: {kline['change_30d_pct']}%, 近90天涨跌: {kline['change_90d_pct']}%, "
                     f"180天最高: {kline['high_180d']}, 180天最低: {kline['low_180d']}, "
                     f"MA20: {kline['ma20']}, MA60: {kline['ma60']}")

    # 利润表（季度趋势）
    income = data.get('income_statement')
    if income:
        lines = ["## 利润表（按报告期）"]
        for r in income:
            lines.append(f"- {r['period']}: 营收 {r['revenue']}, 归母净利润 {r['parent_net_profit']}, "
                        f"扣非净利润 {r['deducted_profit']}")
        parts.append('\n'.join(lines))

    # 现金流量表
    cf = data.get('cash_flow')
    if cf:
        lines = ["## 现金流量表（按报告期）"]
        for r in cf:
            lines.append(f"- {r['period']}: 经营现金流 {r['operating']}, "
                        f"投资现金流 {r['investing']}, 筹资现金流 {r['financing']}")
        parts.append('\n'.join(lines))

    # 主力资金流向
    ff = data.get('fund_flow')
    if ff:
        lines = ["## 主力资金流向（近期）"]
        total = ff.get('main_net_total', 0)
        lines.append(f"近{len(ff.get('days', []))}天主力净流入合计: {_fmt_big_num(total)}")
        for d in ff.get('days', [])[-5:]:  # 最近5天
            main = _fmt_big_num(d.get('main_net'))
            lines.append(f"- {d['date']}: 收盘{d.get('close')}, 涨跌{d.get('pct_change')}%, "
                        f"主力净流入 {main}({d.get('main_pct')}%)")
        parts.append('\n'.join(lines))

    # 十大流通股东
    holders = data.get('top_holders')
    if holders:
        lines = [f"## 十大流通股东（截止 {holders['date']}）"]
        for h in holders.get('holders', []):
            lines.append(f"- {h['name']}: {h.get('pct', '?')}% ({h.get('type', '')})")
        parts.append('\n'.join(lines))

    # 新闻（前瞻性催化剂）
    news = data.get('news')
    if news:
        lines = ["## 近期新闻（关注潜在催化剂）"]
        for n in news[:8]:
            lines.append(f"- [{n['time'][:10]}] {n['title']}")
            if n.get('content'):
                lines.append(f"  摘要: {n['content'][:200]}")
        parts.append('\n'.join(lines))

    # 业绩信号
    signals = data.get('earnings_signals')
    if signals:
        lines = ["## 公告中的业绩信号"]
        for s in signals:
            growth = f", 增长{s['growth_pct']}%" if s.get('growth_pct') and s['growth_pct'] != 'None' else ''
            lines.append(f"- [{s['date']}] {s['signal_text']}{growth}: {s['title']}")
        parts.append('\n'.join(lines))

    # 公告
    anns = data.get('announcements')
    if anns:
        lines = ["## 近期公告"]
        for a in anns[:10]:
            lines.append(f"- [{a['date']}] [{a['type']}] {a['title']}")
        parts.append('\n'.join(lines))

    return '\n\n'.join(parts)


def _append_growth_trend(lines: list, fin: dict):
    """从财务摘要中计算环比/同比增速趋势"""
    for key in ['归母净利润', '营业总收入']:
        values = fin.get(key)
        if not values:
            continue
        periods = sorted(values.keys(), reverse=True)
        if len(periods) >= 2:
            try:
                latest = float(values[periods[0]])
                prev = float(values[periods[1]])
                if prev and prev != 0:
                    growth = round((latest / prev - 1) * 100, 1)
                    lines.append(f"  → {key} 最近环比增速: {growth}% ({periods[0]} vs {periods[1]})")
            except (ValueError, TypeError):
                pass
        if len(periods) >= 4:
            try:
                latest = float(values[periods[0]])
                yoy = float(values[periods[3]])
                if yoy and yoy != 0:
                    growth = round((latest / yoy - 1) * 100, 1)
                    lines.append(f"  → {key} 同比增速: {growth}% ({periods[0]} vs {periods[3]})")
            except (ValueError, TypeError):
                pass


def _to_sina_symbol(code: str) -> str:
    if code.startswith('6') or code.startswith('5'):
        return f'sh{code}'
    elif code.startswith('9'):
        return f'bj{code}'
    return f'sz{code}'


def _safe_float(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
        if str(f) == 'nan':
            return None
        return f
    except (ValueError, TypeError):
        return None


def _fmt_big_num(v) -> str:
    if v is None:
        return '-'
    try:
        v = float(v)
    except (ValueError, TypeError):
        return str(v)
    if abs(v) >= 1e12:
        return f'{v/1e12:.2f}万亿'
    if abs(v) >= 1e8:
        return f'{v/1e8:.2f}亿'
    if abs(v) >= 1e4:
        return f'{v/1e4:.0f}万'
    return f'{v:.2f}'


def _recent_report_dates() -> list:
    """返回最近几个已过去的报告期 YYYYMMDD（从最近到最远）"""
    now = datetime.now()
    dates = []
    year = now.year
    quarters = [(year, '0930'), (year, '0630'), (year, '0331'),
                (year - 1, '1231'), (year - 1, '0930'), (year - 1, '0630'),
                (year - 1, '0331'), (year - 2, '1231')]
    for y, q in quarters:
        d = f'{y}{q}'
        # 只返回已过去的报告期
        if int(d) <= int(now.strftime('%Y%m%d')):
            dates.append(d)
    return dates[:3]  # 只查最近3个报告期，减少API调用
