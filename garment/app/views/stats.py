from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, g
from ..models import get_db

bp = Blueprint('stats', __name__, url_prefix='/stats')


@bp.before_request
def require_login():
    if g.user is None:
        return redirect(url_for('auth.login'))


@bp.route('/')
def index():
    if g.user['is_admin']:
        return admin_stats()
    else:
        return worker_stats()


def admin_stats():
    db = get_db()
    today = date.today()
    start = request.args.get('start', today.replace(day=1).isoformat())
    end = request.args.get('end', today.isoformat())
    contractor_filter = request.args.get('contractor_id', '')
    keyword = request.args.get('keyword', '').strip()

    contractors = db.execute('SELECT * FROM contractor ORDER BY name').fetchall()

    c_cond = ''
    c_params = []
    if contractor_filter:
        c_cond = ' AND c.id = ?'
        c_params = [contractor_filter]

    style_stats = db.execute(f"""
        SELECT c.name as contractor_name, fs.name as step_name,
               SUM(ps.quantity) as total_qty, COUNT(ps.id) as total_count
        FROM processing_step ps
        JOIN flow_step fs ON ps.flow_step_id = fs.id
        JOIN processing p ON ps.processing_id = p.id
        JOIN material_pickup m ON p.material_id = m.id
        JOIN contractor c ON m.contractor_id = c.id
        WHERE ps.complete_date BETWEEN ? AND ? {c_cond}
        GROUP BY c.name, fs.name
        ORDER BY c.name, fs.step_order
    """, [start, end] + c_params).fetchall()

    worker_stats_data = db.execute(f"""
        SELECT c.name as contractor_name, w.name as worker_name, fs.name as step_name,
               SUM(ps.quantity) as total_qty
        FROM processing_step ps
        JOIN flow_step fs ON ps.flow_step_id = fs.id
        JOIN processing p ON ps.processing_id = p.id
        JOIN material_pickup m ON p.material_id = m.id
        JOIN contractor c ON m.contractor_id = c.id
        JOIN worker w ON ps.worker_id = w.id
        WHERE ps.complete_date BETWEEN ? AND ? {c_cond}
        GROUP BY c.name, w.name, fs.name
        ORDER BY c.name, w.name, fs.step_order
    """, [start, end] + c_params).fetchall()

    qc_stats = db.execute(f"""
        SELECT c.name as contractor_name,
               COUNT(*) as total,
               SUM(CASE WHEN q.result='合格' THEN 1 ELSE 0 END) as pass_count,
               SUM(CASE WHEN q.result='不合格' THEN 1 ELSE 0 END) as fail_count
        FROM qc_record q
        JOIN return_record r ON q.return_id = r.id
        JOIN processing p ON r.processing_id = p.id
        JOIN material_pickup m ON p.material_id = m.id
        JOIN contractor c ON m.contractor_id = c.id
        WHERE q.qc_date BETWEEN ? AND ? {c_cond}
        GROUP BY c.name ORDER BY c.name
    """, [start, end] + c_params).fetchall()

    reject_reasons = db.execute(f"""
        SELECT c.name as contractor_name, q.reject_reason, COUNT(*) as cnt
        FROM qc_record q
        JOIN return_record r ON q.return_id = r.id
        JOIN processing p ON r.processing_id = p.id
        JOIN material_pickup m ON p.material_id = m.id
        JOIN contractor c ON m.contractor_id = c.id
        WHERE q.result='不合格' AND q.qc_date BETWEEN ? AND ? {c_cond}
        GROUP BY c.name, q.reject_reason ORDER BY c.name, cnt DESC
    """, [start, end] + c_params).fetchall()

    rework_stats = db.execute(f"""
        SELECT c.name as contractor_name, COUNT(*) as total, SUM(rw.quantity) as total_qty
        FROM rework rw
        JOIN qc_record q ON rw.qc_id = q.id
        JOIN return_record r ON q.return_id = r.id
        JOIN processing p ON r.processing_id = p.id
        JOIN material_pickup m ON p.material_id = m.id
        JOIN contractor c ON m.contractor_id = c.id
        WHERE q.qc_date BETWEEN ? AND ? {c_cond}
        GROUP BY c.name
    """, [start, end] + c_params).fetchall()

    search_results = []
    if keyword:
        kw = f'%{keyword}%'
        search_results = db.execute("""
            SELECT '拿料' as type, m.id, m.pickup_date as date_val, c.name as contractor_name,
                   (SELECT GROUP_CONCAT(s2.name || CASE WHEN mi2.size!='' THEN '('||mi2.size||')' ELSE '' END || '×'||mi2.quantity, '、')
                    FROM material_item mi2 JOIN style s2 ON mi2.style_id=s2.id WHERE mi2.material_id=m.id) as items_desc,
                   (SELECT SUM(mi3.quantity) FROM material_item mi3 WHERE mi3.material_id=m.id) as quantity,
                   m.status, m.notes
            FROM material_pickup m
            JOIN contractor c ON m.contractor_id = c.id
            WHERE c.name LIKE ? OR m.notes LIKE ?
               OR m.id IN (SELECT mi4.material_id FROM material_item mi4 JOIN style s4 ON mi4.style_id=s4.id WHERE s4.name LIKE ?)
            UNION ALL
            SELECT '送回' as type, r.id, r.return_date as date_val, c.name as contractor_name,
                   '' as items_desc, r.quantity, '' as status, r.notes
            FROM return_record r
            JOIN processing p ON r.processing_id = p.id
            JOIN material_pickup m ON p.material_id = m.id
            JOIN contractor c ON m.contractor_id = c.id
            WHERE c.name LIKE ? OR r.notes LIKE ?
            ORDER BY date_val DESC
        """, (kw, kw, kw, kw, kw)).fetchall()

    return render_template('stats.html', style_stats=style_stats, worker_stats=worker_stats_data,
                           qc_stats=qc_stats, reject_reasons=reject_reasons,
                           rework_stats=rework_stats, search_results=search_results,
                           contractors=contractors,
                           start=start, end=end, keyword=keyword,
                           contractor_filter=contractor_filter, is_admin=True)


def worker_stats():
    db = get_db()
    today = date.today()
    start = request.args.get('start', today.replace(day=1).isoformat())
    end = request.args.get('end', today.isoformat())
    worker_id = g.user['id']

    # My processing stats by contractor + step
    my_stats = db.execute("""
        SELECT c.name as contractor_name, fs.name as step_name,
               SUM(ps.quantity) as total_qty, COUNT(ps.id) as total_count
        FROM processing_step ps
        JOIN flow_step fs ON ps.flow_step_id = fs.id
        JOIN processing p ON ps.processing_id = p.id
        JOIN material_pickup m ON p.material_id = m.id
        JOIN contractor c ON m.contractor_id = c.id
        WHERE ps.worker_id = ? AND ps.complete_date BETWEEN ? AND ?
        GROUP BY c.name, fs.name
        ORDER BY c.name, fs.step_order
    """, (worker_id, start, end)).fetchall()

    # My total quantities
    my_totals = db.execute("""
        SELECT SUM(ps.quantity) as total_qty, COUNT(ps.id) as total_count
        FROM processing_step ps
        WHERE ps.worker_id = ? AND ps.complete_date BETWEEN ? AND ?
    """, (worker_id, start, end)).fetchone()

    return render_template('stats_worker.html', my_stats=my_stats, my_totals=my_totals,
                           start=start, end=end, is_admin=False)
