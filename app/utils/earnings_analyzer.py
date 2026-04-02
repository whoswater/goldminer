"""
业绩公告分析器
从公告标题中提取业绩信号：超预期(预增/扭亏) vs 低于预期(预减/首亏)
"""
import re
import pandas as pd

# 业绩相关公告类型关键词
EARNINGS_ANNOUNCE_TYPES = ['业绩预告', '业绩快报', '年报', '季报', '半年报', '业绩预增', '业绩预减']

# 正面信号关键词（按强度排序）
POSITIVE_KEYWORDS = [
    ('预增', '业绩预增'),
    ('扭亏', '扭亏为盈'),
    ('略增', '业绩略增'),
    ('续盈', '持续盈利'),
    ('大幅增长', '业绩大幅增长'),
    ('超预期', '业绩超预期'),
    ('同比增长', '同比增长'),
    ('净利润增', '净利润增长'),
    ('营收增', '营收增长'),
    ('盈利增', '盈利增长'),
]

# 负面信号关键词
NEGATIVE_KEYWORDS = [
    ('预减', '业绩预减'),
    ('首亏', '首次亏损'),
    ('略减', '业绩略减'),
    ('续亏', '持续亏损'),
    ('大幅下降', '业绩大幅下降'),
    ('亏损', '亏损'),
    ('同比下降', '同比下降'),
    ('净利润降', '净利润下降'),
    ('净利润减', '净利润减少'),
]

# 提取增长率的正则模式
GROWTH_PATTERNS = [
    re.compile(r'(?:增长|增加|上升|提高|增幅)[约为]?(\d+\.?\d*)\s*%'),
    re.compile(r'(\d+\.?\d*)\s*%\s*(?:至|到|[-–~～])\s*(\d+\.?\d*)\s*%'),
    re.compile(r'同比(?:增长|增加)[约为]?(\d+\.?\d*)\s*%'),
    re.compile(r'(?:下降|减少|下滑|降幅)[约为]?(\d+\.?\d*)\s*%'),
    re.compile(r'(?:预计|预估).*?净利润.*?(\d+\.?\d*)\s*(?:亿|万)'),
]


def analyze_announcement(title: str, announce_type: str = '') -> dict | None:
    """
    分析单条公告，返回业绩信号。
    :return: dict with keys: signal, signal_text, keywords, growth_pct, strength
             or None if not earnings-related
    """
    if not title:
        return None

    combined = f'{announce_type} {title}'

    # 判断是否为业绩相关公告
    is_earnings = any(kw in combined for kw in EARNINGS_ANNOUNCE_TYPES)
    has_signal = False

    # 正面信号检测
    pos_matches = []
    for keyword, label in POSITIVE_KEYWORDS:
        if keyword in title:
            pos_matches.append(label)
            has_signal = True

    # 负面信号检测
    neg_matches = []
    for keyword, label in NEGATIVE_KEYWORDS:
        if keyword in title:
            neg_matches.append(label)
            has_signal = True

    if not is_earnings and not has_signal:
        return None

    # 判断信号方向
    if pos_matches and not neg_matches:
        signal = 'positive'
        signal_text = '超预期'
        keywords = pos_matches
    elif neg_matches and not pos_matches:
        signal = 'negative'
        signal_text = '低于预期'
        keywords = neg_matches
    elif pos_matches and neg_matches:
        signal = 'positive' if len(pos_matches) >= len(neg_matches) else 'negative'
        signal_text = '超预期' if signal == 'positive' else '低于预期'
        keywords = pos_matches + neg_matches
    else:
        signal = 'neutral'
        signal_text = '业绩公告'
        keywords = []

    # 提取增长率
    growth_pct = None
    for pat in GROWTH_PATTERNS:
        m = pat.search(title)
        if m:
            try:
                growth_pct = float(m.group(1))
                if any(kw in title for kw, _ in NEGATIVE_KEYWORDS[:5]):
                    growth_pct = -growth_pct
            except (ValueError, IndexError):
                pass
            break

    # 信号强度 (1-5)
    strength = 1
    if growth_pct is not None:
        if abs(growth_pct) >= 100:
            strength = 5
        elif abs(growth_pct) >= 50:
            strength = 4
        elif abs(growth_pct) >= 30:
            strength = 3
        elif abs(growth_pct) >= 10:
            strength = 2
    elif len(keywords) >= 2:
        strength = 3
    elif any(k in ('业绩预增', '扭亏为盈', '首次亏损', '业绩预减') for k in keywords):
        strength = 3

    return {
        'signal': signal,
        'signal_text': signal_text,
        'keywords': ','.join(keywords),
        'growth_pct': growth_pct,
        'strength': strength,
    }


def analyze_announcements(df: pd.DataFrame) -> pd.DataFrame:
    """
    批量分析公告DataFrame，返回仅包含业绩相关公告的DataFrame，
    附加列: signal, signal_text, keywords, growth_pct, strength
    """
    if df.empty:
        return pd.DataFrame()

    results = []
    for _, row in df.iterrows():
        title = str(row.get('title', ''))
        ann_type = str(row.get('announce_type', ''))
        analysis = analyze_announcement(title, ann_type)
        if analysis:
            record = row.to_dict()
            record.update(analysis)
            results.append(record)

    if not results:
        return pd.DataFrame()

    result_df = pd.DataFrame(results)
    # 按强度降序排列
    result_df = result_df.sort_values('strength', ascending=False)
    return result_df
