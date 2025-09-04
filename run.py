import os
import webbrowser
from threading import Timer
from app import create_app, db
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 打印环境变量，用于调试
print("环境变量:")
print(f"DEEPSEEK_API_KEY: {os.environ.get('DEEPSEEK_API_KEY')}")
print(f"DEEPSEEK_API_URL: {os.environ.get('DEEPSEEK_API_URL')}")
print(f"OCR_API_KEY: {os.environ.get('OCR_API_KEY')}")
print(f"SECRET_KEY: {os.environ.get('SECRET_KEY')}")

app = create_app()

def open_browser():
    """启动后自动打开浏览器，只在主进程中执行一次"""
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        webbrowser.open_new('http://127.0.0.1:5000/')

@app.cli.command("init-db")
def init_db():
    """初始化数据库"""
    db.create_all()
    print('数据库初始化完成')

if __name__ == '__main__':
    # 只在第一次启动时打开浏览器，避免debug模式下重启导致多窗口
    Timer(1, open_browser).start()
    # 启动应用
    app.run(debug=True)
