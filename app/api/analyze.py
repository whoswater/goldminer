"""
综合分析 API — 两阶段异步：数据采集 → AI分析
阶段1完成即返回数据供前端渲染，阶段2(AI)完成后补充分析结果。
"""
import logging
import threading
from flask import Blueprint, jsonify, request

from app.utils.stock_data_collector import collect_stock_data, format_for_ai
from app.utils.ai_analyzer import analyze_with_ai, get_available_providers

logger = logging.getLogger(__name__)

analyze_api = Blueprint('analyze_api', __name__)

# 缓存 key = "code:provider"
_analyze_cache = {}


def _cache_key(code: str, provider: str) -> str:
    return f'{code}:{provider}'


@analyze_api.route('/ai/providers')
def list_providers():
    """返回可用的 AI 提供商列表"""
    return jsonify(get_available_providers())


@analyze_api.route('/analyze/<code>')
def analyze_stock(code):
    """
    两阶段分析：
    - status=running: 数据采集中
    - status=data_ready: 数据已就绪（前端可先渲染），AI分析仍在进行
    - status=done: AI分析也完成
    """
    code = code.strip()
    provider = request.args.get('provider', '').strip() or None
    key = _cache_key(code, provider or 'default')

    cached = _analyze_cache.get(key)
    if not cached:
        # 启动后台分析
        _analyze_cache[key] = {'status': 'running', 'progress': '开始采集数据...'}
        t = threading.Thread(target=_run_analysis, args=(code, provider, key), daemon=True)
        t.start()
        return jsonify({'status': 'running', 'message': '开始采集数据...'})

    status = cached['status']

    if status == 'running':
        return jsonify({'status': 'running', 'message': cached.get('progress', '采集中...')})

    if status == 'data_ready':
        # 数据已就绪，返回给前端先渲染，AI还在跑
        return jsonify({'status': 'data_ready', 'data': cached['result']})

    if status == 'done':
        return jsonify({'status': 'done', 'data': cached['result']})

    return jsonify({'status': 'running', 'message': '处理中...'})


def _run_analysis(code, provider, key):
    try:
        _analyze_cache[key]['progress'] = '正在并行采集数据...'
        stock_data = collect_stock_data(code)

        data_text = format_for_ai(stock_data)
        summary = _summarize_stock_data(stock_data)

        # 阶段1完成：数据就绪，前端可以先渲染
        _analyze_cache[key] = {
            'status': 'data_ready',
            'result': {
                'code': code,
                'provider': provider,
                'stock_data': summary,
                'ai_analysis': {'verdict': '分析中...', 'confidence': 0,
                                'summary': 'AI正在分析，请稍候...', 'analysis': '',
                                'key_factors': [], 'risks': []},
                'data_text': data_text,
            }
        }
        logger.info(f'[{code}] 数据采集完成，开始AI分析')

        # 阶段2：AI分析
        ai_result = analyze_with_ai(data_text, code, provider=provider)

        _analyze_cache[key] = {
            'status': 'done',
            'result': {
                'code': code,
                'provider': provider,
                'stock_data': summary,
                'ai_analysis': ai_result,
                'data_text': data_text,
            }
        }
        logger.info(f'[{code}] AI分析完成')

    except Exception as e:
        logger.error(f'[{code}] 分析失败: {e}')
        _analyze_cache[key] = {
            'status': 'done',
            'result': {
                'code': code, 'provider': provider, 'stock_data': {},
                'ai_analysis': {
                    'verdict': '不确定', 'confidence': 0,
                    'summary': f'分析出错: {str(e)[:200]}',
                    'analysis': '', 'key_factors': [], 'risks': [],
                },
                'data_text': '',
            }
        }


@analyze_api.route('/analyze/<code>/refresh', methods=['POST'])
def refresh_analysis(code):
    """强制重新分析"""
    keys_to_delete = [k for k in _analyze_cache if k.startswith(f'{code}:')]
    for k in keys_to_delete:
        del _analyze_cache[k]
    return jsonify({'ok': True})


def _summarize_stock_data(data: dict) -> dict:
    keys = ['code', 'basic_info', 'realtime_quote', 'kline_trend', 'valuation',
            'earnings_forecast', 'earnings_express', 'analyst_forecast',
            'earnings_signals', 'news', 'announcements',
            'fund_flow', 'top_holders', 'income_statement', 'cash_flow']
    summary = {k: data.get(k) for k in keys}
    fin = data.get('financial_summary')
    if fin:
        summary['financial_summary'] = {k: v for k, v in fin.items()}
    return summary
