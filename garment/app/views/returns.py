from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from ..models import get_db

bp = Blueprint('returns', __name__, url_prefix='/returns')

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


@bp.route('/')
def list_returns():
    db = get_db()
    contractor_filter = request.args.get('contractor_id', '')

    sql = f"""SELECT r.*, c.name as contractor_name, w.name as worker_name, p.id as proc_id,
                     {MAT_COLS}
             FROM return_record r
             JOIN processing p ON r.processing_id = p.id
             JOIN material_pickup m ON p.material_id = m.id
             JOIN contractor c ON m.contractor_id = c.id
             LEFT JOIN worker w ON r.worker_id = w.id
             WHERE 1=1"""
    params = []
    if contractor_filter:
        sql += ' AND c.id = ?'
        params.append(contractor_filter)
    sql += ' ORDER BY r.return_date DESC, r.id DESC'
    records = db.execute(sql, params).fetchall()

    completed = db.execute(f"""SELECT p.id, p.batch_qty, c.name as contractor_name,
                                      {MAT_COLS}
                               FROM processing p
                               JOIN material_pickup m ON p.material_id = m.id
                               JOIN contractor c ON m.contractor_id = c.id
                               WHERE p.status = '已完成'
                               ORDER BY p.id DESC""").fetchall()
    workers = db.execute('SELECT * FROM worker ORDER BY name').fetchall()
    contractors = db.execute('SELECT * FROM contractor ORDER BY name').fetchall()
    return render_template('returns.html', records=records, completed=completed,
                           workers=workers, contractors=contractors,
                           today=date.today().isoformat(), contractor_filter=contractor_filter)


@bp.route('/add', methods=['POST'])
def add_return():
    processing_id = request.form.get('processing_id')
    quantity = request.form.get('quantity', '').strip()
    return_date = request.form.get('return_date', date.today().isoformat())
    worker_id = request.form.get('worker_id') or None
    notes = request.form.get('notes', '')

    if not processing_id or not quantity:
        flash('请填写所有必填项', 'error')
        return redirect(url_for('returns.list_returns'))
    try:
        quantity = int(quantity)
        if quantity <= 0:
            raise ValueError
    except ValueError:
        flash('数量必须为正整数', 'error')
        return redirect(url_for('returns.list_returns'))

    db = get_db()
    db.execute('INSERT INTO return_record (processing_id, quantity, return_date, worker_id, notes) VALUES (?,?,?,?,?)',
               (processing_id, quantity, return_date, worker_id, notes))
    db.commit()
    flash('送回记录添加成功', 'success')
    return redirect(url_for('returns.list_returns'))


@bp.route('/edit/<int:id>', methods=['POST'])
def edit_return(id):
    quantity = request.form.get('quantity', '').strip()
    return_date = request.form.get('return_date')
    worker_id = request.form.get('worker_id') or None
    notes = request.form.get('notes', '')

    try:
        quantity = int(quantity)
        if quantity <= 0:
            raise ValueError
    except (ValueError, TypeError):
        flash('数量必须为正整数', 'error')
        return redirect(url_for('returns.list_returns'))

    db = get_db()
    db.execute('UPDATE return_record SET quantity=?, return_date=?, worker_id=?, notes=? WHERE id=?',
               (quantity, return_date, worker_id, notes, id))
    db.commit()
    flash('送回记录修改成功', 'success')
    return redirect(url_for('returns.list_returns'))


@bp.route('/delete/<int:id>', methods=['POST'])
def delete_return(id):
    db = get_db()
    db.execute('DELETE FROM return_record WHERE id=?', (id,))
    db.commit()
    flash('送回记录已删除', 'success')
    return redirect(url_for('returns.list_returns'))
