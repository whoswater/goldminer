import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_cors import CORS
from app.config import ALL_DIRS, LOG_DIR


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'a-stock-valuation-secret'
    CORS(app)  # 允许小程序跨域请求

    # 创建所有数据目录
    for d in ALL_DIRS:
        os.makedirs(d, exist_ok=True)

    # 配置日志
    handler = RotatingFileHandler(
        os.path.join(LOG_DIR, 'app.log'),
        maxBytes=10 * 1024 * 1024, backupCount=5
    )
    handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s %(name)s: %(message)s'
    ))
    handler.setLevel(logging.INFO)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    # 注册蓝图 - API
    from app.api.stock import stock_api
    from app.api.announcements import announcements_api
    from app.api.market import market_api
    from app.api.realtime import realtime_api
    from app.api.earnings import earnings_api
    from app.api.search import search_api
    from app.api.analyze import analyze_api
    app.register_blueprint(stock_api, url_prefix='/api')
    app.register_blueprint(announcements_api, url_prefix='/api')
    app.register_blueprint(market_api, url_prefix='/api')
    app.register_blueprint(realtime_api, url_prefix='/api')
    app.register_blueprint(earnings_api, url_prefix='/api')
    app.register_blueprint(search_api, url_prefix='/api')
    app.register_blueprint(analyze_api, url_prefix='/api')

    # 注册蓝图 - 页面（仅2个页面）
    from app.views.main import main_view
    from app.views.history import history_view
    app.register_blueprint(main_view)
    app.register_blueprint(history_view)

    return app
