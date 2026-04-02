from flask import Blueprint, jsonify, request
from app.utils.file_storage import load_latest_earnings, load_all_announcements
from app.utils.earnings_analyzer import analyze_announcements
from app.api.announcements import SECTOR_CODES

earnings_api = Blueprint('earnings_api', __name__)


@earnings_api.route('/earnings/surprises')
def earnings_surprises():
    """业绩超预期列表（近30天，支持筛选）"""
    signal = request.args.get('signal', '').strip()  # positive / negative / all
    sector = request.args.get('sector', '').strip()
    days = min(request.args.get('days', 30, type=int), 90)
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 200)

    df = load_latest_earnings(days)

    # 如果没有预分析数据，实时分析
    if df.empty:
        ann_df = load_all_announcements()
        if not ann_df.empty:
            df = analyze_announcements(ann_df)

    if df.empty:
        return jsonify({'data': [], 'total': 0, 'page': page, 'positive': 0, 'negative': 0})

    # 统计
    total_positive = len(df[df['signal'] == 'positive'])
    total_negative = len(df[df['signal'] == 'negative'])

    # 筛选
    if signal and signal != 'all':
        df = df[df['signal'] == signal]
    if sector and sector in SECTOR_CODES:
        codes = SECTOR_CODES[sector]
        df = df[df['stock_code'].astype(str).isin(codes)]

    # 去重：同一公司只保留最新/最强的信号
    if 'stock_code' in df.columns and 'strength' in df.columns:
        df['strength'] = df['strength'].astype(float)
        df = df.sort_values(['strength', 'publish_date'], ascending=[False, False])
        df = df.drop_duplicates(subset='stock_code', keep='first')

    total = len(df)
    start = (page - 1) * per_page
    data = df.iloc[start:start + per_page].to_dict('records')

    return jsonify({
        'data': data,
        'total': total,
        'page': page,
        'per_page': per_page,
        'positive': total_positive,
        'negative': total_negative,
    })


@earnings_api.route('/earnings/stock/<code>')
def stock_earnings(code):
    """单只股票的业绩信号历史"""
    df = load_latest_earnings(90)
    if df.empty:
        return jsonify([])

    filtered = df[df['stock_code'].astype(str) == str(code)]
    filtered = filtered.sort_values('publish_date', ascending=False) if 'publish_date' in filtered.columns else filtered
    return jsonify(filtered.to_dict('records'))


@earnings_api.route('/earnings/summary')
def earnings_summary():
    """业绩信号汇总统计"""
    df = load_latest_earnings(30)

    if df.empty:
        return jsonify({
            'total': 0, 'positive': 0, 'negative': 0, 'neutral': 0,
            'top_positive': [], 'top_negative': [],
        })

    positive_df = df[df['signal'] == 'positive'].copy()
    negative_df = df[df['signal'] == 'negative'].copy()

    # 去重取最强信号
    if not positive_df.empty and 'stock_code' in positive_df.columns:
        positive_df['strength'] = positive_df['strength'].astype(float)
        positive_df = positive_df.sort_values('strength', ascending=False)
        positive_df = positive_df.drop_duplicates(subset='stock_code', keep='first')

    if not negative_df.empty and 'stock_code' in negative_df.columns:
        negative_df['strength'] = negative_df['strength'].astype(float)
        negative_df = negative_df.sort_values('strength', ascending=False)
        negative_df = negative_df.drop_duplicates(subset='stock_code', keep='first')

    return jsonify({
        'total': len(df),
        'positive': len(positive_df),
        'negative': len(negative_df),
        'neutral': len(df[df['signal'] == 'neutral']),
        'top_positive': positive_df.head(10).to_dict('records'),
        'top_negative': negative_df.head(5).to_dict('records'),
    })
