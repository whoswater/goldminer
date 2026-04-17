import os

basedir = os.path.dirname(__file__)


class Config:
    """Base config — shared across all environments."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    DB_PATH = os.environ.get('DB_PATH', os.path.join(basedir, 'data', 'garment.db'))


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    # For cloud: set SECRET_KEY and DB_PATH via environment variables
    # Example:
    #   export SECRET_KEY='your-random-secret'
    #   export DB_PATH='/var/data/garment.db'
    #
    # To switch to PostgreSQL/MySQL later, add:
    #   DATABASE_URL = os.environ.get('DATABASE_URL')
    # and modify app/models.py to use SQLAlchemy with DATABASE_URL


# Select config by FLASK_ENV env var
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}


def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    return config_map.get(env, DevelopmentConfig)
