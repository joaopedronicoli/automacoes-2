@echo off
REM ===================================================================
REM   Automações PELG - Getting Started Script
REM   This script helps you get the project up and running
REM ===================================================================

echo.
echo ========================================
echo   Automacoes PELG - Setup Assistant
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js 18 or higher from:
    echo https://nodejs.org
    echo.
    echo After installation, restart this script.
    pause
    exit /b 1
)

echo [OK] Node.js found!
node --version
npm --version
echo.

REM Check if PostgreSQL is accessible
echo Checking PostgreSQL connection...
psql --version >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL client found!
) else (
    echo [WARNING] PostgreSQL client not found in PATH
    echo Make sure PostgreSQL is installed and running
)
echo.

REM Check if Redis is running
echo Checking Redis...
redis-cli ping >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Redis is running!
) else (
    echo [WARNING] Redis not responding
    echo You can start Redis with: docker run -d -p 6379:6379 redis
)
echo.

REM Check if project files exist
if not exist "setup-project.js" (
    echo [ERROR] setup-project.js not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo ========================================
echo   Step 1: Generate Project Files
echo ========================================
echo.
echo Generating all backend and frontend source files...
node setup-project.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate project files!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   Step 2: Install Backend Dependencies
echo ========================================
echo.
cd backend
if not exist "package.json" (
    echo [ERROR] Backend package.json not found!
    cd ..
    pause
    exit /b 1
)

echo Installing backend dependencies (this may take a few minutes)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies!
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed!
cd ..
echo.

echo ========================================
echo   Step 3: Install Frontend Dependencies
echo ========================================
echo.
cd frontend
if not exist "package.json" (
    echo [ERROR] Frontend package.json not found!
    cd ..
    pause
    exit /b 1
)

echo Installing frontend dependencies (this may take a few minutes)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies!
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed!
cd ..
echo.

echo ========================================
echo   Step 4: Configure Environment
echo ========================================
echo.

REM Copy .env.example to .env if it doesn't exist
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo Copying .env.example to .env...
        copy "backend\.env.example" "backend\.env"
        echo.
        echo [IMPORTANT] Please edit backend\.env with your credentials:
        echo   - JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"^)
        echo   - ENCRYPTION_KEY (64 hex chars^)
        echo   - FACEBOOK_APP_ID and FACEBOOK_APP_SECRET
        echo   - Database credentials if different
        echo.
    ) else (
        echo [WARNING] .env.example not found!
    )
) else (
    echo [OK] .env file already exists
)
echo.

echo ========================================
echo   Step 5: Database Setup
echo ========================================
echo.
echo Please ensure:
echo   1. PostgreSQL is running
echo   2. Database 'automacoes' exists
echo.
echo To create the database, run:
echo   psql -U postgres -c "CREATE DATABASE automacoes;"
echo.
set /p continue="Press Enter when database is ready (or Ctrl+C to exit)..."
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Project is ready for development!
echo.
echo NEXT STEPS:
echo.
echo 1. Edit backend\.env with your credentials
echo.
echo 2. Start the backend (in a new terminal):
echo    cd backend
echo    npm run start:dev
echo.
echo 3. Start the frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 4. Open your browser to:
echo    http://localhost:5173
echo.
echo For more information, see:
echo   - README.md
echo   - QUICKSTART.md
echo   - DEPLOYMENT.md
echo.
echo ========================================
echo.
pause
