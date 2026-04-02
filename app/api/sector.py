from flask import Blueprint, jsonify, request
from app.utils.file_storage import load_latest_valuation
from app.config import FOCUS_SECTORS

sector_api = Blueprint('sector_api', __name__)


@sector_api.route('/sector/list')
def sector_list():
    """返回重点关注板块列表"""
    return jsonify(FOCUS_SECTORS)


@sector_api.route('/sector/<name>/stocks')
def sector_stocks(name):
    """返回某板块所有股票及估值"""
    df = load_latest_valuation()
    if df.empty:
        return jsonify([])

    # 板块名匹配（白酒、猪肉/养殖业、GPU/算力）
    sector_map = {
        '白酒': ['白酒'],
        '猪肉': ['猪肉', '养殖业'],
        'GPU': ['GPU', '算力'],
    }
    industries = sector_map.get(name, [name])
    filtered = df[df['industry'].isin(industries)].copy()
    filtered = filtered.sort_values('price', ascending=False)
    return jsonify(filtered.to_dict('records'))


@sector_api.route('/sector/<name>/summary')
def sector_summary(name):
    """板块汇总信息"""
    df = load_latest_valuation()
    if df.empty:
        return jsonify({})

    sector_map = {
        '白酒': ['白酒'],
        '猪肉': ['猪肉', '养殖业'],
        'GPU': ['GPU', '算力'],
    }
    industries = sector_map.get(name, [name])
    filtered = df[df['industry'].isin(industries)]

    if filtered.empty:
        return jsonify({})

    return jsonify({
        'name': name,
        'config': FOCUS_SECTORS.get(name, {}),
        'count': len(filtered),
        'avg_pe': round(filtered['pe'].mean(), 2),
        'avg_pb': round(filtered['pb'].mean(), 2),
        'avg_price': round(filtered['price'].mean(), 2),
    })
