import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 项目根目录
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# 上传文件存储路径
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app/static/uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # 确保目录存在

# 允许上传的文件类型
UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
SCORE_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.json']  # 成绩文件支持的格式

# 数据库配置
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'student_analysis.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# API配置
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
DEEPSEEK_API_URL = os.getenv('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions')

# OCR API
OCR_API_KEY = os.getenv('OCR_API_KEY', 'K86116371588957')
OCR_API_URL = 'https://api.ocr.space/parse/image'

# 应用密钥
SECRET_KEY = os.getenv('SECRET_KEY', '8080')

# 最大上传文件大小 (10MB)
MAX_CONTENT_LENGTH = 10 * 1024 * 1024