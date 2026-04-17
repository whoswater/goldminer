from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, session, g
from ..models import get_db, hash_pwd

bp = Blueprint('auth', __name__)


@bp.before_app_request
def load_current_user():
    user_id = session.get('user_id')
    if user_id:
        g.user = get_db().execute('SELECT * FROM worker WHERE id=?', (user_id,)).fetchone()
    else:
        g.user = None

    # Force password change — allow only /change-password and /logout
    if g.user and not g.user['pwd_changed'] and request.endpoint not in ('auth.change_password', 'auth.logout', 'static'):
        return redirect(url_for('auth.change_password'))


def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if g.user is None:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return wrapped


def admin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if g.user is None:
            return redirect(url_for('auth.login'))
        if not g.user['is_admin']:
            flash('需要管理员权限', 'error')
            return redirect(url_for('stats.index'))
        return f(*args, **kwargs)
    return wrapped


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        phone = request.form.get('phone', '').strip()
        password = request.form.get('password', '').strip()

        if not phone or not password:
            flash('请输入手机号和密码', 'error')
            return render_template('login.html')

        db = get_db()
        user = db.execute('SELECT * FROM worker WHERE phone=?', (phone,)).fetchone()
        if not user:
            flash('手机号未注册，请联系管理员添加', 'error')
            return render_template('login.html')

        if user['password'] != hash_pwd(password):
            flash('密码错误', 'error')
            return render_template('login.html')

        session.clear()
        session['user_id'] = user['id']

        if not user['pwd_changed']:
            flash('首次登录，请修改密码', 'success')
            return redirect(url_for('auth.change_password'))

        flash(f'欢迎回来，{user["name"]}', 'success')
        return redirect(url_for('stats.index'))

    return render_template('login.html')


@bp.route('/change-password', methods=['GET', 'POST'])
def change_password():
    if g.user is None:
        return redirect(url_for('auth.login'))

    first_time = not g.user['pwd_changed']

    if request.method == 'POST':
        old_pwd = request.form.get('old_password', '').strip()
        new_pwd = request.form.get('new_password', '').strip()
        confirm_pwd = request.form.get('confirm_password', '').strip()

        if not first_time:
            if not old_pwd or g.user['password'] != hash_pwd(old_pwd):
                flash('旧密码错误', 'error')
                return render_template('change_password.html', first_time=first_time)

        if not new_pwd:
            flash('请输入新密码', 'error')
            return render_template('change_password.html', first_time=first_time)

        if len(new_pwd) < 6:
            flash('密码至少6位', 'error')
            return render_template('change_password.html', first_time=first_time)

        if new_pwd != confirm_pwd:
            flash('两次输入的密码不一致', 'error')
            return render_template('change_password.html', first_time=first_time)

        db = get_db()
        db.execute('UPDATE worker SET password=?, pwd_changed=1 WHERE id=?',
                   (hash_pwd(new_pwd), g.user['id']))
        db.commit()
        flash('密码修改成功', 'success')
        return redirect(url_for('stats.index'))

    return render_template('change_password.html', first_time=first_time)


@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))
