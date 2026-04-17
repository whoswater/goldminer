from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, flash, g
from ..models import get_db

bp = Blueprint('qc', __name__, url_prefix='/qc')

MAT_COLS = """
    (SELECT GROUP_CONCAT(
        s2.name || CASE WHEN mi2.size != '' THEN '(' || mi2.size || ')' ELSE '' END
        || '×' || mi2.quantity, '、')
     FROM material_item mi2 JOIN style s2 ON mi2.style_id = s2.id
     WHERE mi2.material_id = m.id) as items_desc
"""


@bp.before_request
def require_login():
    if g.user is None:
        return redirect(url_for('auth.login'))


@bp.route('/')
def list_qc():
    db = get_db()
    result_filter = request.args.get('result', '')
    rework_filter = request.args.get('rework_status', '')

    qc_sql = f"""SELECT q.*, r.quantity as return_qty, r.return_date,
                        c.name as contractor_name, {MAT_COLS}
                 FROM qc_record q
                 JOIN return_record r ON q.return_id = r.id
                 JOIN processing p ON r.processing_id = p.id
                 JOIN material_pickup m ON p.material_id = m.id
                 JOIN contractor c ON m.contractor_id = c.id WHERE 1=1"""
    qc_params = []
    if result_filter:
        qc_sql += ' AND q.result = ?'
        qc_params.append(result_filter)
    qc_sql += ' ORDER BY q.qc_date DESC, q.id DESC'
    qc_records = db.execute(qc_sql, qc_params).fetchall()

    rw_sql = f"""SELECT rw.*, q.reject_reason, q.reject_quantity,
                        c.name as contractor_name, {MAT_COLS},
                        w.name as worker_name
                 FROM rework rw
                 JOIN qc_record q ON rw.qc_id = q.id
                 JOIN return_record r ON q.return_id = r.id
                 JOIN processing p ON r.processing_id = p.id
                 JOIN material_pickup m ON p.material_id = m.id
                 JOIN contractor c ON m.contractor_id = c.id
                 LEFT JOIN worker w ON rw.worker_id = w.id WHERE 1=1"""
    rw_params = []
    if rework_filter:
        rw_sql += ' AND rw.status = ?'
        rw_params.append(rework_filter)
    rw_sql += ' ORDER BY rw.id DESC'
    rework_records = db.execute(rw_sql, rw_params).fetchall()

    pending_returns = db.execute(f"""SELECT r.*, c.name as contractor_name, {MAT_COLS}
                                     FROM return_record r
                                     JOIN processing p ON r.processing_id = p.id
                                     JOIN material_pickup m ON p.material_id = m.id
                                     JOIN contractor c ON m.contractor_id = c.id
                                     WHERE r.id NOT IN (SELECT return_id FROM qc_record)
                                     ORDER BY r.return_date DESC""").fetchall()

    workers = db.execute('SELECT * FROM worker ORDER BY name').fetchall()
    return render_template('qc.html', qc_records=qc_records, rework_records=rework_records,
                           pending_returns=pending_returns, workers=workers,
                           today=date.today().isoformat(),
                           result_filter=result_filter, rework_filter=rework_filter)


@bp.route('/add', methods=['POST'])
def add_qc():
    return_id = request.form.get('return_id')
    result = request.form.get('result')
    qc_date = request.form.get('qc_date', date.today().isoformat())
    reject_quantity = request.form.get('reject_quantity', '0').strip()
    reject_reason = request.form.get('reject_reason', '')

    if not return_id or not result:
        flash('请填写所有必填项', 'error')
        return redirect(url_for('qc.list_qc'))

    try:
        reject_quantity = int(reject_quantity) if reject_quantity else 0
    except ValueError:
        flash('不合格数量必须为整数', 'error')
        return redirect(url_for('qc.list_qc'))

    db = get_db()
    db.execute('INSERT INTO qc_record (return_id, result, qc_date, reject_quantity, reject_reason) VALUES (?,?,?,?,?)',
               (return_id, result, qc_date, reject_quantity, reject_reason))
    db.commit()

    if result == '不合格' and reject_quantity > 0:
        qc_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
        db.execute('INSERT INTO rework (qc_id, quantity, status) VALUES (?,?,?)',
                   (qc_id, reject_quantity, '待返工'))
        db.commit()

    flash('质检记录添加成功', 'success')
    return redirect(url_for('qc.list_qc'))


@bp.route('/rework/<int:id>', methods=['POST'])
def handle_rework(id):
    worker_id = request.form.get('worker_id') or None
    quantity = request.form.get('quantity', '').strip()
    complete_date = request.form.get('complete_date', date.today().isoformat())

    try:
        quantity = int(quantity)
        if quantity <= 0:
            raise ValueError
    except (ValueError, TypeError):
        flash('数量必须为正整数', 'error')
        return redirect(url_for('qc.list_qc'))

    db = get_db()
    db.execute('UPDATE rework SET worker_id=?, quantity=?, complete_date=?, status=? WHERE id=?',
               (worker_id, quantity, complete_date, '返工完成', id))
    db.commit()
    flash('返工记录已更新', 'success')
    return redirect(url_for('qc.list_qc'))


@bp.route('/rework/resend/<int:id>', methods=['POST'])
def resend_rework(id):
    db = get_db()
    rw = db.execute("""SELECT rw.*, q.return_id FROM rework rw
                       JOIN qc_record q ON rw.qc_id = q.id WHERE rw.id=?""", (id,)).fetchone()
    if not rw:
        flash('找不到返工记录', 'error')
        return redirect(url_for('qc.list_qc'))

    ret = db.execute('SELECT processing_id FROM return_record WHERE id=?', (rw['return_id'],)).fetchone()
    if not ret:
        flash('找不到关联送回记录', 'error')
        return redirect(url_for('qc.list_qc'))

    db.execute('INSERT INTO return_record (processing_id, quantity, return_date, notes) VALUES (?,?,?,?)',
               (ret['processing_id'], rw['quantity'], date.today().isoformat(), '返工后重新送回'))
    db.commit()
    flash('已生成新的送回记录', 'success')
    return redirect(url_for('returns.list_returns'))
