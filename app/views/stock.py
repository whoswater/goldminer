from flask import Blueprint, render_template

stock_view = Blueprint('stock_view', __name__)


@stock_view.route('/stock/<code>')
def stock_detail(code):
    return render_template('stock_detail.html', code=code)
