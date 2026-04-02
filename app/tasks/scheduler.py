"""
APScheduler 调度器初始化
"""
import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.tasks.crawler import crawl_announcements, crawl_history
from app.tasks.valuation_updater import update_valuation

logger = logging.getLogger(__name__)


def init_scheduler(app):
    scheduler = BackgroundScheduler()

    # 每天 09:00 爬取公告
    scheduler.add_job(crawl_announcements, 'cron', hour=9, minute=0,
                      id='crawl_announcements', replace_existing=True)

    # 每天 18:00 更新估值
    scheduler.add_job(update_valuation, 'cron', hour=18, minute=0,
                      id='update_valuation', replace_existing=True)

    scheduler.start()
    logger.info('调度器已启动: 公告爬取(09:00), 估值更新(18:00)')

    # 启动时预加载A股股票列表（后台线程，不阻塞启动）
    import threading
    def _init_stock_list():
        try:
            from app.utils.stock_list_cache import init_stock_list
            init_stock_list()
        except Exception as e:
            logger.error(f'股票列表初始化失败: {e}')
    threading.Thread(target=_init_stock_list, daemon=True).start()

    # 首次启动时，批量拉取近7天公告 + 生成估值数据
    from app.config import VALUATION_DIR, ANNOUNCEMENTS_DIR
    has_valuation = any(f.endswith('.csv') for f in os.listdir(VALUATION_DIR)) if os.path.exists(VALUATION_DIR) else False
    ann_count = len([f for f in os.listdir(ANNOUNCEMENTS_DIR) if f.endswith('.csv')]) if os.path.exists(ANNOUNCEMENTS_DIR) else 0

    if ann_count < 3:
        logger.info('公告数据不足，批量拉取近7天公告...')
        try:
            crawl_history(days=7)
        except Exception as e:
            logger.error(f'批量公告爬取失败: {e}')

    if not has_valuation:
        logger.info('首次运行，生成估值数据...')
        try:
            update_valuation()
        except Exception as e:
            logger.error(f'初始估值更新失败: {e}')
