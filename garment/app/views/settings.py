import os
import shutil
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app, g
from ..models import get_db, hash_pwd

bp = Blueprint('settings', __name__, url_prefix='/settings')


@bp.before_request
def require_admin():
    if g.user is None:
        return redirect(url_for('auth.login'))
    if not g.user['is_admin']:
        flash('需要管理员权限', 'error')
        return redirect(url_for('material.list_materials'))


@bp.route('/')
def index():
    db = get_db()
    contractors = db.execute('SELECT * FROM contractor ORDER BY id DESC').fetchall()
    workers_raw = db.execute('SELECT * FROM worker ORDER BY id DESC').fetchall()
    styles = db.execute('SELECT * FROM style ORDER BY id DESC').fetchall()

    # Attach skills to each worker
    workers = []
    for w in workers_raw:
        skills = db.execute('SELECT skill FROM worker_skill WHERE worker_id=?', (w['id'],)).fetchall()
        workers.append({**dict(w), 'skills': [s['skill'] for s in skills]})

    return render_template('settings.html', contractors=contractors, workers=workers, styles=styles)


# --- Contractor CRUD ---
@bp.route('/contractor/add', methods=['POST'])
def add_contractor():
    name = request.form.get('name', '').strip()
    if not name:
        flash('请输入总包方名称', 'error')
        return redirect(url_for('settings.index'))
    db = get_db()
    db.execute('INSERT INTO contractor (name, contact_person, contact_info) VALUES (?, ?, ?)',
               (name, request.form.get('contact_person', ''), request.form.get('contact_info', '')))
    db.commit()
    flash('总包方添加成功', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/contractor/edit/<int:id>', methods=['POST'])
def edit_contractor(id):
    name = request.form.get('name', '').strip()
    if not name:
        flash('请输入总包方名称', 'error')
        return redirect(url_for('settings.index'))
    db = get_db()
    db.execute('UPDATE contractor SET name=?, contact_person=?, contact_info=? WHERE id=?',
               (name, request.form.get('contact_person', ''), request.form.get('contact_info', ''), id))
    db.commit()
    flash('总包方修改成功', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/contractor/delete/<int:id>', methods=['POST'])
def delete_contractor(id):
    db = get_db()
    db.execute('DELETE FROM contractor WHERE id=?', (id,))
    db.commit()
    flash('总包方已删除', 'success')
    return redirect(url_for('settings.index'))


# --- Worker CRUD ---
@bp.route('/worker/add', methods=['POST'])
def add_worker():
    name = request.form.get('name', '').strip()
    phone = request.form.get('phone', '').strip()
    skills = request.form.getlist('skills')
    if not name:
        flash('请输入工人姓名', 'error')
        return redirect(url_for('settings.index'))
    default_pwd = hash_pwd(phone[-6:]) if len(phone) >= 6 else ''
    db = get_db()
    cur = db.execute('INSERT INTO worker (name, phone, password, pwd_changed) VALUES (?,?,?,?)',
                     (name, phone, default_pwd, 0))
    worker_id = cur.lastrowid
    for skill in skills:
        if skill.strip():
            db.execute('INSERT INTO worker_skill (worker_id, skill) VALUES (?,?)', (worker_id, skill.strip()))
    db.commit()
    flash('工人添加成功', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/worker/edit/<int:id>', methods=['POST'])
def edit_worker(id):
    name = request.form.get('name', '').strip()
    phone = request.form.get('phone', '').strip()
    skills = request.form.getlist('skills')
    if not name:
        flash('请输入工人姓名', 'error')
        return redirect(url_for('settings.index'))
    db = get_db()
    db.execute('UPDATE worker SET name=?, phone=? WHERE id=?', (name, phone, id))
    db.execute('DELETE FROM worker_skill WHERE worker_id=?', (id,))
    for skill in skills:
        if skill.strip():
            db.execute('INSERT INTO worker_skill (worker_id, skill) VALUES (?,?)', (id, skill.strip()))
    db.commit()
    flash('工人修改成功', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/worker/delete/<int:id>', methods=['POST'])
def delete_worker(id):
    db = get_db()
    db.execute('DELETE FROM worker WHERE id=?', (id,))
    db.commit()
    flash('工人已删除', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/worker/reset_pwd/<int:id>', methods=['POST'])
def reset_worker_pwd(id):
    db = get_db()
    worker = db.execute('SELECT phone FROM worker WHERE id=?', (id,)).fetchone()
    if worker and len(worker['phone']) >= 6:
        db.execute('UPDATE worker SET password=?, pwd_changed=0 WHERE id=?',
                   (hash_pwd(worker['phone'][-6:]), id))
        db.commit()
        flash('密码已重置为手机号后6位', 'success')
    else:
        flash('该工人无手机号，无法重置', 'error')
    return redirect(url_for('settings.index'))


# --- Style CRUD ---
@bp.route('/style/add', methods=['POST'])
def add_style():
    name = request.form.get('name', '').strip()
    if not name:
        flash('请输入款式名称', 'error')
        return redirect(url_for('settings.index'))
    db = get_db()
    db.execute('INSERT INTO style (name, spec) VALUES (?, ?)',
               (name, request.form.get('spec', '')))
    db.commit()
    flash('款式添加成功', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/style/edit/<int:id>', methods=['POST'])
def edit_style(id):
    name = request.form.get('name', '').strip()
    if not name:
        flash('请输入款式名称', 'error')
        return redirect(url_for('settings.index'))
    db = get_db()
    db.execute('UPDATE style SET name=?, spec=? WHERE id=?',
               (name, request.form.get('spec', ''), id))
    db.commit()
    flash('款式修改成功', 'success')
    return redirect(url_for('settings.index'))


@bp.route('/style/delete/<int:id>', methods=['POST'])
def delete_style(id):
    db = get_db()
    db.execute('DELETE FROM style WHERE id=?', (id,))
    db.commit()
    flash('款式已删除', 'success')
    return redirect(url_for('settings.index'))


# --- Backup ---
@bp.route('/backup', methods=['POST'])
def backup():
    db_path = current_app.config['DB_PATH']
    today = datetime.now().strftime('%Y%m%d')
    backup_name = f'潘记制衣_{today}.db'
    desktop = os.path.expanduser('~/Desktop')
    backup_path = os.path.join(desktop, backup_name)
    shutil.copy2(db_path, backup_path)
    flash(f'备份成功: {backup_path}', 'success')
    return redirect(url_for('settings.index'))
