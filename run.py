from app import create_app
from app.tasks.scheduler import init_scheduler

app = create_app()
init_scheduler(app)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8818, debug=True, use_reloader=False)
