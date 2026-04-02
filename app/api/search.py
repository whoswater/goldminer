"""搜索记录 & 股票搜索建议 API"""
import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request
from app.config import DATA_DIR
from app.utils.stock_list_cache import search_stocks, get_stock_name

search_api = Blueprint('search_api', __name__)

HISTORY_FILE = os.path.join(DATA_DIR, 'search_history.json')


def _load_history() -> list:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def _save_history(history: list):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


@search_api.route('/search/suggest')
def search_suggest():
    """股票搜索建议（按代码/名称模糊匹配）"""
    keyword = request.args.get('q', '').strip()
    limit = min(request.args.get('limit', 15, type=int), 50)
    results = search_stocks(keyword, limit=limit)
    return jsonify(results)


@search_api.route('/search/record', methods=['POST'])
def record_search():
    """记录一次搜索"""
    data = request.get_json(silent=True) or {}
    code = data.get('code', '').strip()
    if not code:
        return jsonify({'ok': False}), 400

    # 从股票列表缓存取名称
    name = get_stock_name(code)
    price = None
    # 尝试取实时价格
    try:
        from app.api.realtime import _get_all_spot
        spot_df = _get_all_spot()
        if spot_df is not None and not spot_df.empty:
            row = spot_df[spot_df['code'] == code]
            if not row.empty:
                price = float(row.iloc[0].get('price', 0))
                if not name:
                    name = str(row.iloc[0].get('name', ''))
    except Exception:
        pass
    if not name:
        try:
            from app.utils.file_storage import load_latest_valuation
            df = load_latest_valuation()
            if not df.empty:
                row = df[df['code'].astype(str) == str(code)]
                if not row.empty:
                    name = str(row.iloc[0].get('name', ''))
                    if price is None:
                        price = float(row.iloc[0].get('price', 0))
        except Exception:
            pass

    record = {
        'code': code,
        'name': name,
        'price': price,
        'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }

    history = _load_history()
    history.insert(0, record)
    # 保留最近100条
    history = history[:100]
    _save_history(history)

    return jsonify({'ok': True})


@search_api.route('/search/history')
def get_history():
    """获取搜索记录"""
    return jsonify(_load_history())


@search_api.route('/search/clear', methods=['POST'])
def clear_history():
    """清空搜索记录"""
    _save_history([])
    return jsonify({'ok': True})
