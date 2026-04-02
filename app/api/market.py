import logging
import os
from flask import Blueprint, jsonify, request
from app.utils.file_storage import load_pe_trend, load_latest_valuation
from app.config import ANNOUNCEMENTS_DIR

logger = logging.getLogger(__name__)

market_api = Blueprint('market_api', __name__)


@market_api.route('/market/pe_trend')
def pe_trend():
    """全市场平均PE近30天走势"""
    data = load_pe_trend(30)
    return jsonify(data)


@market_api.route('/industry/comparison')
def industry_comparison():
    """各行业当前PE与历史中位数对比"""
    df = load_latest_valuation()
    if df.empty:
        return jsonify([])

    result = []
    for industry, group in df.groupby('industry'):
        pe_values = group['pe'].dropna()
        if pe_values.empty:
            continue
        result.append({
            'industry': industry,
            'current_pe': round(pe_values.mean(), 2),
            'median_pe': round(pe_values.median(), 2),
            'count': len(group),
        })
    result.sort(key=lambda x: x['current_pe'])
    return jsonify(result)


@market_api.route('/market/update_valuation', methods=['POST'])
def trigger_update_valuation():
    """手动触发全部股票估值更新"""
    import threading
    from app.tasks.valuation_updater import update_valuation

    def _run():
        try:
            update_valuation()
        except Exception as e:
            logger.error(f'手动估值更新失败: {e}')

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return jsonify({'ok': True, 'message': '估值更新已在后台启动'})


@market_api.route('/market/update_stock', methods=['POST'])
def trigger_update_stock():
    """手动更新单只股票估值"""
    code = request.json.get('code', '').strip() if request.is_json else ''
    if not code:
        return jsonify({'ok': False, 'error': '缺少股票代码'}), 400

    from app.tasks.valuation_updater import update_single_stock
    try:
        result = update_single_stock(code)
        return jsonify({'ok': True, 'data': result})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@market_api.route('/market/crawl_history', methods=['POST'])
def trigger_crawl_history():
    """手动触发批量拉取公告"""
    days = request.json.get('days', 7) if request.is_json else 7
    days = min(int(days), 30)
    from app.tasks.crawler import crawl_history
    total = crawl_history(days=days)
    return jsonify({'ok': True, 'days': days, 'total': total})


@market_api.route('/market/stats')
def market_stats():
    """数据统计概览"""
    ann_files = sorted([f for f in os.listdir(ANNOUNCEMENTS_DIR) if f.endswith('.csv')]) if os.path.exists(ANNOUNCEMENTS_DIR) else []
    total_anns = 0
    for f in ann_files:
        import pandas as pd
        df = pd.read_csv(os.path.join(ANNOUNCEMENTS_DIR, f), encoding='utf-8-sig', dtype=str)
        total_anns += len(df)

    return jsonify({
        'announcement_days': len(ann_files),
        'announcement_total': total_anns,
        'date_range': [ann_files[0].replace('.csv', ''), ann_files[-1].replace('.csv', '')] if ann_files else [],
    })
