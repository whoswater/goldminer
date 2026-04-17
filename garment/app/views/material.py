from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, flash, g, jsonify
from ..models import get_db

bp = Blueprint('material', __name__, url_prefix='/material')

# Common SQL snippet: aggregate items into a summary string and total quantity
MATERIAL_SUMMARY_SQL = """
    SELECT m.id, m.code, m.contractor_id, m.pickup_date, m.notes, m.status,
           c.name as contractor_name, c.contact_person, c.contact_info,
           GROUP_CONCAT(
               s.name || CASE WHEN mi.size != '' THEN '(' || mi.size || ')' ELSE '' END
               || '×' || mi.quantity, '、'
           ) as items_desc,
           SUM(mi.quantity) as total_qty
    FROM material_pickup m
    JOIN contractor c ON m.contractor_id = c.id
    LEFT JOIN material_item mi ON mi.material_id = m.id
    LEFT JOIN style s ON mi.style_id = s.id
"""


@bp.before_request
def require_login():
    if g.user is None:
        return redirect(url_for('auth.login'))


@bp.route('/')
def list_materials():
    db = get_db()
    contractor_filter = request.args.get('contractor_id', '')
    style_filter = request.args.get('style_id', '')
    date_filter = request.args.get('pickup_date', '')

    sql = MATERIAL_SUMMARY_SQL + ' WHERE 1=1'
    params = []
    if contractor_filter:
        sql += ' AND m.contractor_id = ?'
        params.append(contractor_filter)
    if style_filter:
        sql += ' AND m.id IN (SELECT material_id FROM material_item WHERE style_id = ?)'
        params.append(style_filter)
    if date_filter:
        sql += ' AND m.pickup_date = ?'
        params.append(date_filter)
    sql += ' GROUP BY m.id ORDER BY m.pickup_date DESC, m.id DESC'

    materials = db.execute(sql, params).fetchall()
    contractors = db.execute('SELECT * FROM contractor ORDER BY name').fetchall()
    styles = db.execute('SELECT * FROM style ORDER BY name').fetchall()
    return render_template('material.html', materials=materials, contractors=contractors,
                           styles=styles, today=date.today().isoformat(),
                           contractor_filter=contractor_filter, style_filter=style_filter,
                           date_filter=date_filter)


@bp.route('/<int:id>')
def detail(id):
    db = get_db()
    material = db.execute(
        MATERIAL_SUMMARY_SQL + ' WHERE m.id=? GROUP BY m.id', (id,)
    ).fetchone()
    if not material:
        flash('记录不存在', 'error')
        return redirect(url_for('material.list_materials'))

    items = db.execute("""SELECT mi.*, s.name as style_name
                          FROM material_item mi JOIN style s ON mi.style_id = s.id
                          WHERE mi.material_id=? ORDER BY mi.id""", (id,)).fetchall()

    # Processing records
    procs = db.execute('SELECT * FROM processing WHERE material_id=? ORDER BY id', (id,)).fetchall()
    proc_details = []
    for p in procs:
        steps = db.execute("""SELECT ps.*, fs.name as step_name, fs.step_order, w.name as worker_name
                              FROM processing_step ps
                              JOIN flow_step fs ON ps.flow_step_id = fs.id
                              LEFT JOIN worker w ON ps.worker_id = w.id
                              WHERE ps.processing_id=? ORDER BY fs.step_order""", (p['id'],)).fetchall()

        returns = db.execute("""SELECT r.*, w.name as worker_name
                                FROM return_record r
                                LEFT JOIN worker w ON r.worker_id = w.id
                                WHERE r.processing_id=? ORDER BY r.return_date""", (p['id'],)).fetchall()

        qc_list = []
        for ret in returns:
            qc = db.execute('SELECT * FROM qc_record WHERE return_id=?', (ret['id'],)).fetchone()
            rework = None
            if qc and qc['result'] == '不合格':
                rework = db.execute("""SELECT rw.*, w.name as worker_name
                                       FROM rework rw LEFT JOIN worker w ON rw.worker_id = w.id
                                       WHERE rw.qc_id=?""", (qc['id'],)).fetchone()
            qc_list.append({'return': dict(ret), 'qc': dict(qc) if qc else None,
                            'rework': dict(rework) if rework else None})

        proc_details.append({
            'proc': dict(p),
            'steps': [dict(s) for s in steps],
            'qc_chain': qc_list,
        })

    return render_template('material_detail.html', material=material, items=items,
                           proc_details=proc_details)


@bp.route('/add', methods=['POST'])
def add_material():
    contractor_id = request.form.get('contractor_id')
    pickup_date = request.form.get('pickup_date', date.today().isoformat())
    notes = request.form.get('notes', '')
    style_ids = request.form.getlist('item_style_id')
    sizes = request.form.getlist('item_size')
    quantities = request.form.getlist('item_quantity')

    if not contractor_id:
        flash('请选择总包方', 'error')
        return redirect(url_for('material.list_materials'))

    # Validate items
    valid_items = []
    for sid, sz, qty in zip(style_ids, sizes, quantities):
        if not sid or not qty:
            continue
        try:
            q = int(qty)
            if q <= 0:
                raise ValueError
        except ValueError:
            flash('数量必须为正整数', 'error')
            return redirect(url_for('material.list_materials'))
        valid_items.append((sid, sz.strip(), q))

    if not valid_items:
        flash('请至少添加一项衣物', 'error')
        return redirect(url_for('material.list_materials'))

    db = get_db()
    # Generate code: NL + YYYYMMDD + - + seq
    date_str = pickup_date.replace('-', '')
    prefix = f'NL{date_str}-'
    row = db.execute("SELECT COUNT(*) FROM material_pickup WHERE code LIKE ?", (f'{prefix}%',)).fetchone()
    seq = (row[0] or 0) + 1
    code = f'{prefix}{seq:03d}'

    cur = db.execute('INSERT INTO material_pickup (code, contractor_id, pickup_date, notes) VALUES (?,?,?,?)',
                     (code, contractor_id, pickup_date, notes))
    material_id = cur.lastrowid
    for sid, sz, q in valid_items:
        db.execute('INSERT INTO material_item (material_id, style_id, size, quantity) VALUES (?,?,?,?)',
                   (material_id, sid, sz, q))
    db.commit()
    flash('拿料记录添加成功', 'success')
    return redirect(url_for('material.list_materials'))


@bp.route('/edit/<int:id>', methods=['POST'])
def edit_material(id):
    contractor_id = request.form.get('contractor_id')
    pickup_date = request.form.get('pickup_date')
    notes = request.form.get('notes', '')
    style_ids = request.form.getlist('item_style_id')
    sizes = request.form.getlist('item_size')
    quantities = request.form.getlist('item_quantity')

    if not contractor_id:
        flash('请选择总包方', 'error')
        return redirect(url_for('material.list_materials'))

    valid_items = []
    for sid, sz, qty in zip(style_ids, sizes, quantities):
        if not sid or not qty:
            continue
        try:
            q = int(qty)
            if q <= 0:
                raise ValueError
        except ValueError:
            flash('数量必须为正整数', 'error')
            return redirect(url_for('material.list_materials'))
        valid_items.append((sid, sz.strip(), q))

    if not valid_items:
        flash('请至少添加一项衣物', 'error')
        return redirect(url_for('material.list_materials'))

    db = get_db()
    db.execute('UPDATE material_pickup SET contractor_id=?, pickup_date=?, notes=? WHERE id=?',
               (contractor_id, pickup_date, notes, id))
    db.execute('DELETE FROM material_item WHERE material_id=?', (id,))
    for sid, sz, q in valid_items:
        db.execute('INSERT INTO material_item (material_id, style_id, size, quantity) VALUES (?,?,?,?)',
                   (id, sid, sz, q))
    db.commit()
    flash('拿料记录修改成功', 'success')
    return redirect(url_for('material.list_materials'))


@bp.route('/<int:id>/items')
def get_items(id):
    db = get_db()
    items = db.execute('SELECT style_id, size, quantity FROM material_item WHERE material_id=?', (id,)).fetchall()
    return jsonify([dict(i) for i in items])


@bp.route('/delete/<int:id>', methods=['POST'])
def delete_material(id):
    db = get_db()
    db.execute('DELETE FROM material_pickup WHERE id=?', (id,))
    db.commit()
    flash('拿料记录已删除', 'success')
    return redirect(url_for('material.list_materials'))
