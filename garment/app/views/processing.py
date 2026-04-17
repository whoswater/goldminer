from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from ..models import get_db

bp = Blueprint('processing', __name__, url_prefix='/processing')

# Reusable: material summary via GROUP_CONCAT
MAT_COLS = """
    (SELECT GROUP_CONCAT(
        s2.name || CASE WHEN mi2.size != '' THEN '(' || mi2.size || ')' ELSE '' END
        || '×' || mi2.quantity, '、')
     FROM material_item mi2 JOIN style s2 ON mi2.style_id = s2.id
     WHERE mi2.material_id = m.id) as items_desc,
    (SELECT SUM(mi3.quantity) FROM material_item mi3 WHERE mi3.material_id = m.id) as total_qty
"""


@bp.before_request
def require_login():
    if g.user is None:
        return redirect(url_for('auth.login'))


def get_remaining_qty(db, material_id):
    """Calculate how many items can still be assigned to new batches."""
    total = db.execute(
        'SELECT COALESCE(SUM(quantity),0) FROM material_item WHERE material_id=?', (material_id,)
    ).fetchone()[0]
    allocated = db.execute(
        'SELECT COALESCE(SUM(batch_qty),0) FROM processing WHERE material_id=?', (material_id,)
    ).fetchone()[0]
    return total - allocated


def refresh_status(db, processing_id):
    proc = db.execute('SELECT material_id FROM processing WHERE id=?', (processing_id,)).fetchone()
    if not proc:
        return
    material = db.execute('SELECT contractor_id FROM material_pickup WHERE id=?', (proc['material_id'],)).fetchone()
    if not material:
        return

    total_steps = db.execute(
        'SELECT COUNT(*) FROM flow_step WHERE contractor_id=?', (material['contractor_id'],)
    ).fetchone()[0]
    done_steps = db.execute(
        'SELECT COUNT(*) FROM processing_step WHERE processing_id=? AND complete_date IS NOT NULL',
        (processing_id,)
    ).fetchone()[0]

    if total_steps == 0:
        status = '未加工'
    elif done_steps >= total_steps:
        status = '已完成'
    elif done_steps > 0:
        status = '加工中'
    else:
        status = '未加工'

    db.execute('UPDATE processing SET status=? WHERE id=?', (status, processing_id))

    procs = db.execute('SELECT status FROM processing WHERE material_id=?', (proc['material_id'],)).fetchall()
    if any(p['status'] == '已完成' for p in procs):
        m_status = '已完成'
    elif any(p['status'] == '加工中' for p in procs):
        m_status = '加工中'
    else:
        m_status = '未加工'
    db.execute('UPDATE material_pickup SET status=? WHERE id=?', (m_status, proc['material_id']))
    db.commit()


@bp.route('/')
def list_processing():
    db = get_db()
    contractor_filter = request.args.get('contractor_id', '')
    status_filter = request.args.get('status', '')
    is_admin = g.user['is_admin']

    sql = f"""SELECT DISTINCT p.id, p.batch_qty, p.status, m.id as material_id, m.code as material_code, m.pickup_date,
                    c.id as contractor_id, c.name as contractor_name,
                    {MAT_COLS}
             FROM processing p
             JOIN material_pickup m ON p.material_id = m.id
             JOIN contractor c ON m.contractor_id = c.id"""
    params = []

    if not is_admin:
        sql += ' JOIN processing_step ps_f ON ps_f.processing_id = p.id AND ps_f.worker_id = ?'
        params.append(g.user['id'])

    sql += ' WHERE 1=1'
    if contractor_filter:
        sql += ' AND c.id = ?'
        params.append(contractor_filter)
    if status_filter:
        sql += ' AND p.status = ?'
        params.append(status_filter)
    sql += ' ORDER BY p.id DESC'
    records = db.execute(sql, params).fetchall()

    enriched = []
    for r in records:
        steps = db.execute("""
            SELECT ps.*, fs.name as step_name, fs.step_order, w.name as worker_name
            FROM processing_step ps
            JOIN flow_step fs ON ps.flow_step_id = fs.id
            LEFT JOIN worker w ON ps.worker_id = w.id
            WHERE ps.processing_id=?
            ORDER BY fs.step_order
        """, (r['id'],)).fetchall()
        enriched.append({**dict(r), 'steps': [dict(s) for s in steps]})

    # Materials with remaining qty info
    materials_raw = db.execute(f"""SELECT m.id, m.code, m.contractor_id, m.pickup_date, c.name as contractor_name,
                                          {MAT_COLS}
                                   FROM material_pickup m
                                   JOIN contractor c ON m.contractor_id = c.id
                                   ORDER BY m.pickup_date DESC""").fetchall()
    materials = []
    for m in materials_raw:
        remaining = get_remaining_qty(db, m['id'])
        materials.append({**dict(m), 'remaining_qty': remaining})

    contractors = db.execute('SELECT * FROM contractor ORDER BY name').fetchall()
    workers = db.execute('SELECT * FROM worker ORDER BY name').fetchall()
    return render_template('processing.html', records=enriched, materials=materials,
                           contractors=contractors, workers=workers,
                           today=date.today().isoformat(),
                           contractor_filter=contractor_filter, status_filter=status_filter)


@bp.route('/add', methods=['POST'])
def add_processing():
    material_id = request.form.get('material_id')
    batch_qty = request.form.get('batch_qty', '').strip()

    if not material_id:
        flash('请选择关联的拿料记录', 'error')
        return redirect(url_for('processing.list_processing'))

    try:
        batch_qty = int(batch_qty)
        if batch_qty <= 0:
            raise ValueError
    except (ValueError, TypeError):
        flash('批次数量必须为正整数', 'error')
        return redirect(url_for('processing.list_processing'))

    db = get_db()
    material = db.execute('SELECT contractor_id FROM material_pickup WHERE id=?', (material_id,)).fetchone()
    if not material:
        flash('拿料记录不存在', 'error')
        return redirect(url_for('processing.list_processing'))

    remaining = get_remaining_qty(db, material_id)
    if batch_qty > remaining:
        flash(f'批次数量({batch_qty})超过剩余可分配数量({remaining})', 'error')
        return redirect(url_for('processing.list_processing'))

    cur = db.execute('INSERT INTO processing (material_id, batch_qty, status) VALUES (?,?,?)',
                     (material_id, batch_qty, '未加工'))
    processing_id = cur.lastrowid

    flow_steps = db.execute(
        'SELECT id FROM flow_step WHERE contractor_id=? ORDER BY step_order',
        (material['contractor_id'],)
    ).fetchall()
    for fs in flow_steps:
        db.execute('INSERT INTO processing_step (processing_id, flow_step_id) VALUES (?,?)',
                   (processing_id, fs['id']))
    db.commit()
    flash(f'加工记录创建成功（批次 {batch_qty} 件），请录入各步骤进度', 'success')
    return redirect(url_for('processing.detail', id=processing_id))


@bp.route('/<int:id>')
def detail(id):
    db = get_db()
    proc = db.execute(f"""SELECT p.*, m.pickup_date, m.code as material_code,
                                 c.name as contractor_name,
                                 {MAT_COLS}
                          FROM processing p
                          JOIN material_pickup m ON p.material_id = m.id
                          JOIN contractor c ON m.contractor_id = c.id
                          WHERE p.id=?""", (id,)).fetchone()
    if not proc:
        flash('记录不存在', 'error')
        return redirect(url_for('processing.list_processing'))

    steps = db.execute("""SELECT ps.*, fs.name as step_name, fs.step_order, w.name as worker_name
                          FROM processing_step ps
                          JOIN flow_step fs ON ps.flow_step_id = fs.id
                          LEFT JOIN worker w ON ps.worker_id = w.id
                          WHERE ps.processing_id=?
                          ORDER BY fs.step_order""", (id,)).fetchall()
    workers = db.execute('SELECT * FROM worker ORDER BY name').fetchall()
    return render_template('processing_detail.html', proc=proc, steps=steps, workers=workers,
                           today=date.today().isoformat())


@bp.route('/step/<int:step_id>', methods=['POST'])
def update_step(step_id):
    worker_id = request.form.get('worker_id') or None
    quantity = request.form.get('quantity', '').strip()
    complete_date = request.form.get('complete_date', '').strip() or None

    db = get_db()
    ps = db.execute('SELECT processing_id FROM processing_step WHERE id=?', (step_id,)).fetchone()
    if not ps:
        flash('步骤不存在', 'error')
        return redirect(url_for('processing.list_processing'))

    proc = db.execute('SELECT batch_qty FROM processing WHERE id=?', (ps['processing_id'],)).fetchone()

    if quantity:
        try:
            quantity = int(quantity)
            if quantity <= 0:
                raise ValueError
        except ValueError:
            flash('数量必须为正整数', 'error')
            return redirect(url_for('processing.detail', id=ps['processing_id']))

        if proc and quantity > proc['batch_qty']:
            flash(f'完成数量({quantity})不能超过本批次数量({proc["batch_qty"]})', 'error')
            return redirect(url_for('processing.detail', id=ps['processing_id']))

    db.execute('UPDATE processing_step SET worker_id=?, quantity=?, complete_date=? WHERE id=?',
               (worker_id, quantity if quantity else None, complete_date, step_id))
    db.commit()

    refresh_status(db, ps['processing_id'])
    flash('步骤更新成功', 'success')
    return redirect(url_for('processing.detail', id=ps['processing_id']))


@bp.route('/delete/<int:id>', methods=['POST'])
def delete_processing(id):
    db = get_db()
    proc = db.execute('SELECT material_id FROM processing WHERE id=?', (id,)).fetchone()
    db.execute('DELETE FROM processing WHERE id=?', (id,))
    db.commit()
    if proc:
        remaining = db.execute('SELECT status FROM processing WHERE material_id=?', (proc['material_id'],)).fetchall()
        if not remaining:
            db.execute('UPDATE material_pickup SET status=? WHERE id=?', ('未加工', proc['material_id']))
        db.commit()
    flash('加工记录已删除', 'success')
    return redirect(url_for('processing.list_processing'))
