from flask import Flask, jsonify, request
from flasgger import Swagger
from datetime import datetime

app = Flask(__name__)
app.config['SWAGGER'] = {'openapi': '3.0.3'}

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'openapi',
            "route": '/openapi.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/docs"
}

swagger = Swagger(app, config=swagger_config, template_file='openapi.yaml')

# Database
tasks_db = []
current_id = 1

def is_valid_date(date_str):
    """Kiểm tra dueDate có đúng định dạng YYYY-MM-DD không"""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False

@app.route('/v1/tasks', methods=['GET'])
def list_tasks():
    return jsonify(tasks_db), 200

@app.route('/v1/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    for task in tasks_db:
        if task["id"] == task_id:
            return jsonify(task), 200
    return jsonify({"description": "Không tìm thấy resource"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
