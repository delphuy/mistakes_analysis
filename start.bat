@echo off
REM Set code page to UTF-8
chcp 65001 >nul 2>&1

echo Starting Student Analysis Tool...
echo Please do not close this window.
echo.

REM Check if Python is available
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo Python found.
) else (
    echo Error: Python is not installed or not in system PATH.
    echo Please install Python and add it to your system PATH.
    pause
    exit /b 1
)

REM Create virtual environment if not exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo Virtual environment created.
    ) else (
        echo Error: Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo Virtual environment activated.
) else (
    echo Error: Failed to activate virtual environment.
    pause
    exit /b 1
)

REM Install required packages
echo Installing required packages...
pip install flask flask-sqlalchemy pandas openpyxl requests python-dotenv
if %errorlevel% neq 0 (
    echo Packages installed successfully.
) else (
    echo Error: Failed to install packages.
    pause
    exit /b 1
)

REM Initialize database
echo Initializing database...
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
if %errorlevel% neq 0 (
    echo Database initialized.
) else (
    echo Error: Failed to initialize database.
    pause
    exit /b 1
)

REM Start the application
echo Starting application...
start http://127.0.0.1:5000
python run.py

REM Deactivate virtual environment when done
deactivate
echo Application stopped.
pause
