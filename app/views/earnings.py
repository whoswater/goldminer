from flask import Blueprint, render_template

earnings_view = Blueprint('earnings_view', __name__)


@earnings_view.route('/earnings')
def earnings_page():
    return render_template('earnings.html')
