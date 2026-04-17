import os
import hashlib
import sqlite3
from flask import g, current_app


def hash_pwd(plain):
    return hashlib.sha256(plain.encode()).hexdigest()


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DB_PATH'])
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db(app):
    os.makedirs(os.path.dirname(app.config['DB_PATH']), exist_ok=True)
    app.teardown_appcontext(close_db)

    with app.app_context():
        db = sqlite3.connect(app.config['DB_PATH'])
        db.executescript(SCHEMA)
        # Seed built-in admin accounts
        for phone, name in [('15026841070', '管理员1'), ('13851234080', '管理员2')]:
            exists = db.execute('SELECT id FROM worker WHERE phone=?', (phone,)).fetchone()
            if not exists:
                default_pwd = hash_pwd(phone[-6:])
                db.execute('INSERT INTO worker (name, phone, password, pwd_changed, is_admin) VALUES (?,?,?,?,?)',
                           (name, phone, default_pwd, 0, 1))
        db.commit()
        db.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS contractor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    contact_info TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS worker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    password TEXT DEFAULT '',
    pwd_changed INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0
);

-- Worker skills (many-to-many: a worker can have multiple skills)
CREATE TABLE IF NOT EXISTS worker_skill (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    skill TEXT NOT NULL,
    FOREIGN KEY (worker_id) REFERENCES worker(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS style (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    spec TEXT DEFAULT ''
);

-- Process flow: configurable steps per contractor
CREATE TABLE IF NOT EXISTS flow_step (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    step_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (contractor_id) REFERENCES contractor(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS material_pickup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL DEFAULT '',
    contractor_id INTEGER NOT NULL,
    pickup_date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT '未加工',
    FOREIGN KEY (contractor_id) REFERENCES contractor(id)
);

-- Material items: multiple style+size+quantity per pickup
CREATE TABLE IF NOT EXISTS material_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    style_id INTEGER NOT NULL,
    size TEXT DEFAULT '',
    quantity INTEGER NOT NULL,
    FOREIGN KEY (material_id) REFERENCES material_pickup(id) ON DELETE CASCADE,
    FOREIGN KEY (style_id) REFERENCES style(id)
);

-- Processing: one record per material batch
CREATE TABLE IF NOT EXISTS processing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    batch_qty INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT '未加工',
    FOREIGN KEY (material_id) REFERENCES material_pickup(id)
);

-- Processing step details: one row per flow step executed
CREATE TABLE IF NOT EXISTS processing_step (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processing_id INTEGER NOT NULL,
    flow_step_id INTEGER NOT NULL,
    worker_id INTEGER,
    quantity INTEGER,
    complete_date TEXT,
    FOREIGN KEY (processing_id) REFERENCES processing(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_step_id) REFERENCES flow_step(id),
    FOREIGN KEY (worker_id) REFERENCES worker(id)
);

CREATE TABLE IF NOT EXISTS return_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processing_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    return_date TEXT NOT NULL,
    worker_id INTEGER,
    notes TEXT DEFAULT '',
    FOREIGN KEY (processing_id) REFERENCES processing(id),
    FOREIGN KEY (worker_id) REFERENCES worker(id)
);

CREATE TABLE IF NOT EXISTS qc_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    result TEXT NOT NULL,
    qc_date TEXT NOT NULL,
    reject_quantity INTEGER DEFAULT 0,
    reject_reason TEXT DEFAULT '',
    FOREIGN KEY (return_id) REFERENCES return_record(id)
);

CREATE TABLE IF NOT EXISTS rework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qc_id INTEGER NOT NULL,
    worker_id INTEGER,
    quantity INTEGER NOT NULL,
    complete_date TEXT,
    status TEXT DEFAULT '待返工',
    FOREIGN KEY (qc_id) REFERENCES qc_record(id),
    FOREIGN KEY (worker_id) REFERENCES worker(id)
);
"""
