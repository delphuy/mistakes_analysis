from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_caching import Cache
import os

# 初始化扩展
db = SQLAlchemy()
migrate = Migrate()
cache = Cache()


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # 获取项目根目录
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # 直接从项目根目录加载配置文件
    config_path = os.path.join(base_dir, 'config.py')
    if os.path.exists(config_path):
        app.config.from_pyfile(config_path)
    else:
        # 如果配置文件不存在，使用默认配置
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///student_analysis.db'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['UPLOAD_FOLDER'] = os.path.join(base_dir, 'app/static/uploads')
        app.config['UPLOAD_EXTENSIONS'] = ['.jpg', '.jpeg', '.png', '.pdf']
        app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

    # 从环境变量加载配置（如果存在）
    app.config['DEEPSEEK_API_KEY'] = os.environ.get('DEEPSEEK_API_KEY', app.config.get('DEEPSEEK_API_KEY', ''))
    app.config['DEEPSEEK_API_URL'] = os.environ.get('DEEPSEEK_API_URL', app.config.get('DEEPSEEK_API_URL',
                                                                                       'https://api.deepseek.com/v1/chat/completions'))
    app.config['OCR_API_KEY'] = os.environ.get('OCR_API_KEY', app.config.get('OCR_API_KEY', 'K86116371588957'))
    app.config['OCR_API_URL'] = os.environ.get('OCR_API_URL',
                                               app.config.get('OCR_API_URL', 'https://api.ocr.space/parse/image'))
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', app.config.get('SECRET_KEY', '8080'))

    # 确保上传文件夹存在
    upload_folder = app.config.get('UPLOAD_FOLDER', os.path.join(base_dir, 'app/static/uploads'))
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder

    # 确保实例文件夹存在
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # 初始化扩展
    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app)

    # 注册蓝图
    from . import main
    app.register_blueprint(main.bp)

    # 添加CSRF保护
    @app.context_processor
    def inject_csrf_token():
        return dict(csrf_token=lambda: generate_csrf())

    # 打印配置信息，用于调试
    with app.app_context():
        print(f"DEEPSEEK_API_KEY: {app.config.get('DEEPSEEK_API_KEY')}")
        print(f"DEEPSEEK_API_URL: {app.config.get('DEEPSEEK_API_URL')}")

    return app


def generate_csrf():
    """生成CSRF令牌"""
    import secrets
    return secrets.token_hex(16)