"""
公告爬虫: 批量抓取A股公告
数据源: akshare stock_notice_report (东方财富)
"""
import logging
from datetime import datetime, timedelta
import pandas as pd

logger = logging.getLogger(__name__)


def _fetch_via_akshare(date_str: str) -> pd.DataFrame:
    """
    通过 akshare 的 stock_notice_report 拉取指定日期的全部公告
    该接口返回数千条记录，涵盖全市场
    """
    import akshare as ak
    date_fmt = date_str.replace('-', '')
    df = ak.stock_notice_report(symbol="全部", date=date_fmt)

    # 统一列名
    col_map = {
        '代码': 'stock_code',
        '名称': 'stock_name',
        '公告标题': 'title',
        '公告类型': 'announce_type',
        '公告日期': 'publish_date',
        '网址': 'url',
        '公告链接': 'url',
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    for col in ['stock_code', 'stock_name', 'title', 'announce_type', 'publish_date', 'url']:
        if col not in df.columns:
            df[col] = ''

    df['id'] = [f'{date_str}-{i+1}' for i in range(len(df))]
    df['publish_date'] = date_str

    return df[['id', 'stock_code', 'stock_name', 'title', 'announce_type', 'publish_date', 'url']]


def _analyze_and_save_earnings(df: pd.DataFrame, date: str):
    """分析公告中的业绩信号并保存"""
    from app.utils.earnings_analyzer import analyze_announcements
    from app.utils.file_storage import save_earnings
    earnings_df = analyze_announcements(df)
    if not earnings_df.empty:
        save_earnings(earnings_df, date)
        pos = len(earnings_df[earnings_df['signal'] == 'positive'])
        neg = len(earnings_df[earnings_df['signal'] == 'negative'])
        logger.info(f'业绩信号: {date} 共{len(earnings_df)}条 (超预期{pos}, 低于预期{neg})')
    return earnings_df


def crawl_announcements():
    """爬取昨日全部公告"""
    from app.utils.file_storage import save_announcements
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    logger.info(f'开始爬取公告: {yesterday}')

    df = _fetch_via_akshare(yesterday)
    if df.empty:
        logger.warning(f'公告为空: {yesterday}（可能是非交易日）')
        return 0

    save_announcements(df, yesterday)
    _analyze_and_save_earnings(df, yesterday)
    logger.info(f'公告保存完成: {yesterday}, 共{len(df)}条')
    return len(df)


def crawl_history(days: int = 7):
    """批量爬取最近N天的公告"""
    from app.utils.file_storage import save_announcements
    total = 0
    for i in range(1, days + 1):
        date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        logger.info(f'批量爬取公告: {date} ({i}/{days})')
        try:
            df = _fetch_via_akshare(date)
            if df.empty:
                logger.info(f'  {date} 无公告（非交易日）')
                continue
            logger.info(f'  获取到 {len(df)} 条')
            save_announcements(df, date)
            _analyze_and_save_earnings(df, date)
            total += len(df)
        except Exception as e:
            logger.error(f'  爬取失败: {date} - {e}')
    logger.info(f'批量爬取完成: {days}天, 共{total}条')
    return total
