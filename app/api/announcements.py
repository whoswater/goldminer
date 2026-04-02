from flask import Blueprint, jsonify, request
from app.utils.file_storage import load_all_announcements

announcements_api = Blueprint('announcements_api', __name__)

# 板块代码集合
SECTOR_CODES = {
    'baijiu': {'600519','000858','000568','002304','600809','000799','603369',
               '600559','000596','600702','603589','600779','000860','603198'},
    'pork':   {'002714','300498','002157','600975','603363','002567','001209',
               '002311','300735','600985'},
    'gpu':    {'300474','688256','300223','688047','002049','688037','603019',
               '300101','688041','002371'},
}


@announcements_api.route('/announcements')
def list_announcements():
    """公告列表（分页、多条件筛选）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 200)  # 上限200
    stock_code = request.args.get('stock_code', '').strip()
    stock_name = request.args.get('stock_name', '').strip()
    announce_type = request.args.get('type', '').strip()
    sector = request.args.get('sector', '').strip()

    df = load_all_announcements()
    if df.empty:
        return jsonify({'data': [], 'total': 0, 'page': page, 'per_page': per_page})

    if stock_code:
        df = df[df['stock_code'].astype(str).str.contains(stock_code)]
    if stock_name:
        df = df[df['stock_name'].astype(str).str.contains(stock_name)]
    if announce_type:
        df = df[df['announce_type'].astype(str).str.contains(announce_type)]
    if sector and sector in SECTOR_CODES:
        codes = SECTOR_CODES[sector]
        df = df[df['stock_code'].astype(str).isin(codes)]

    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    data = df.iloc[start:end].to_dict('records')

    return jsonify({
        'data': data,
        'total': total,
        'page': page,
        'per_page': per_page,
    })
