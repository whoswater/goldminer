from flask import Blueprint, render_template

market_view = Blueprint('market_view', __name__)


@market_view.route('/market')
def market_page():
    return render_template('market.html')
