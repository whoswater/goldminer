from flask import Blueprint, render_template

announcements_view = Blueprint('announcements_view', __name__)


@announcements_view.route('/announcements')
def announcements_page():
    return render_template('announcements.html')
