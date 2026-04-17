from flask import Flask
from .models import init_db


def create_app(config_object=None):
    app = Flask(__name__)

    if config_object is None:
        from config import get_config
        config_object = get_config()

    app.config.from_object(config_object)

    init_db(app)

    from .views import auth, settings, flow, material, processing, returns, qc, stats
    app.register_blueprint(auth.bp)
    app.register_blueprint(settings.bp)
    app.register_blueprint(flow.bp)
    app.register_blueprint(material.bp)
    app.register_blueprint(processing.bp)
    app.register_blueprint(returns.bp)
    app.register_blueprint(qc.bp)
    app.register_blueprint(stats.bp)

    @app.route('/')
    def index():
        from flask import redirect, url_for, session
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return redirect(url_for('stats.index'))

    return app
