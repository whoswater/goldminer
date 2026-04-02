from flask import Blueprint, jsonify
from app.utils.file_storage import (
    load_latest_valuation, load_historical_pe, load_historical_pb,
    load_all_announcements,
)

stock_api = Blueprint('stock_api', __name__)


@stock_api.route('/stock/<code>/info')
def stock_info(code):
    """公司基本信息"""
    df = load_latest_valuation()
    if df.empty:
        return jsonify({'error': '暂无数据'}), 404

    row = df[df['code'].astype(str) == str(code)]
    if row.empty:
        return jsonify({'error': '未找到该股票'}), 404

    r = row.iloc[0]
    return jsonify({
        'code': str(r['code']),
        'name': str(r['name']),
        'industry': str(r.get('industry', '')),
        'price': float(r.get('price', 0)),
        'pe': float(r.get('pe', 0)),
        'pb': float(r.get('pb', 0)),
        'eps': float(r.get('eps', 0)),
        'bvps': float(r.get('bvps', 0)),
        'roe': float(r.get('roe', 0)),
    })


@stock_api.route('/stock/<code>/valuation')
def stock_valuation(code):
    """公司估值详情"""
    df = load_latest_valuation()
    if df.empty:
        return jsonify({'error': '暂无数据'}), 404

    row = df[df['code'].astype(str) == str(code)]
    if row.empty:
        return jsonify({'error': '未找到该股票'}), 404

    r = row.iloc[0]

    pe_hist = load_historical_pe(code)
    pb_hist = load_historical_pb(code)

    return jsonify({
        'code': str(r['code']),
        'name': str(r['name']),
        'price': float(r.get('price', 0)),
        'intrinsic_value': float(r.get('intrinsic_value', 0)),
        'undervalue_rate': float(r.get('undervalue_rate', 0)),
        'pe': float(r.get('pe', 0)),
        'pb': float(r.get('pb', 0)),
        'pe_history': pe_hist.to_dict('records'),
        'pb_history': pb_hist.to_dict('records'),
    })


@stock_api.route('/stock/<code>/announcements')
def stock_announcements(code):
    """该公司公告列表"""
    df = load_all_announcements()
    if df.empty:
        return jsonify([])

    filtered = df[df['stock_code'].astype(str) == str(code)]
    return jsonify(filtered.to_dict('records'))
