from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from ..models import get_db

bp = Blueprint('flow', __name__, url_prefix='/flow')


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
    contractor_id = request.args.get('contractor_id', '')
    contractors = db.execute('SELECT * FROM contractor ORDER BY name').fetchall()

    steps = []
    if contractor_id:
        steps = db.execute(
            'SELECT * FROM flow_step WHERE contractor_id=? ORDER BY step_order', (contractor_id,)
        ).fetchall()

    return render_template('flow.html', contractors=contractors, steps=steps,
                           contractor_id=contractor_id)


@bp.route('/add', methods=['POST'])
def add_step():
    contractor_id = request.form.get('contractor_id')
    name = request.form.get('name', '').strip()
    if not contractor_id or not name:
        flash('请选择总包方并输入步骤名称', 'error')
        return redirect(url_for('flow.index', contractor_id=contractor_id))

    db = get_db()
    max_order = db.execute(
        'SELECT COALESCE(MAX(step_order),0) FROM flow_step WHERE contractor_id=?', (contractor_id,)
    ).fetchone()[0]
    db.execute('INSERT INTO flow_step (contractor_id, name, step_order) VALUES (?,?,?)',
               (contractor_id, name, max_order + 1))
    db.commit()
    flash(f'步骤"{name}"添加成功', 'success')
    return redirect(url_for('flow.index', contractor_id=contractor_id))


@bp.route('/edit/<int:id>', methods=['POST'])
def edit_step(id):
    name = request.form.get('name', '').strip()
    contractor_id = request.form.get('contractor_id', '')
    if not name:
        flash('步骤名称不能为空', 'error')
        return redirect(url_for('flow.index', contractor_id=contractor_id))

    db = get_db()
    db.execute('UPDATE flow_step SET name=? WHERE id=?', (name, id))
    db.commit()
    flash('步骤修改成功', 'success')
    return redirect(url_for('flow.index', contractor_id=contractor_id))


@bp.route('/delete/<int:id>', methods=['POST'])
def delete_step(id):
    db = get_db()
    step = db.execute('SELECT contractor_id FROM flow_step WHERE id=?', (id,)).fetchone()
    contractor_id = step['contractor_id'] if step else ''
    db.execute('DELETE FROM flow_step WHERE id=?', (id,))
    db.commit()
    flash('步骤已删除', 'success')
    return redirect(url_for('flow.index', contractor_id=contractor_id))


@bp.route('/move/<int:id>/<direction>', methods=['POST'])
def move_step(id, direction):
    db = get_db()
    step = db.execute('SELECT * FROM flow_step WHERE id=?', (id,)).fetchone()
    if not step:
        return redirect(url_for('flow.index'))

    contractor_id = step['contractor_id']
    steps = db.execute(
        'SELECT * FROM flow_step WHERE contractor_id=? ORDER BY step_order', (contractor_id,)
    ).fetchall()
    ids = [s['id'] for s in steps]
    idx = ids.index(id)

    if direction == 'up' and idx > 0:
        swap_id = ids[idx - 1]
    elif direction == 'down' and idx < len(ids) - 1:
        swap_id = ids[idx + 1]
    else:
        return redirect(url_for('flow.index', contractor_id=contractor_id))

    order_a = step['step_order']
    order_b = db.execute('SELECT step_order FROM flow_step WHERE id=?', (swap_id,)).fetchone()['step_order']
    db.execute('UPDATE flow_step SET step_order=? WHERE id=?', (order_b, id))
    db.execute('UPDATE flow_step SET step_order=? WHERE id=?', (order_a, swap_id))
    db.commit()
    return redirect(url_for('flow.index', contractor_id=contractor_id))
