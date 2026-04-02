from flask import Blueprint, render_template

sector_view = Blueprint('sector_view', __name__)


@sector_view.route('/sector/<name>')
def sector_detail(name):
    return render_template('sector_detail.html', sector_name=name)
