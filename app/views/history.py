from flask import Blueprint, render_template

history_view = Blueprint('history_view', __name__)


@history_view.route('/history')
def history_page():
    return render_template('history.html')
