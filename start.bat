@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   ThinkDesk AI - Setup and Start
echo ========================================
echo.

:: Check if .env file exists
if exist .env (
    echo [INFO] Found existing .env file
    echo.
    set /p UPDATE_ENV="Do you want to update your Gmail credentials? (Y/N): "
    if /i "!UPDATE_ENV!"=="N" (
        echo.
        echo [INFO] Using existing .env file...
        goto START_SERVERS
    )
    echo.
)

echo ========================================
echo   Gmail App Password Setup Guide
echo ========================================
echo.
echo To use Gmail with ThinkDesk AI, you need to create an App Password:
echo.
echo STEP 1: Enable 2-Step Verification
echo   - Go to: https://myaccount.google.com/security
echo   - Enable "2-Step Verification" if not already enabled
echo.
echo STEP 2: Create App Password
echo   - Go to: https://myaccount.google.com/apppasswords
echo   - Select "Mail" as the app
echo   - Select "Other (Custom name)" as the device
echo   - Enter "ThinkDesk AI" as the name
echo   - Click "Generate"
echo   - Copy the 16-character password (it looks like: abcd efgh ijkl mnop)
echo.
echo STEP 3: Use the App Password
echo   - Enter your Gmail address below
echo   - Enter the 16-character App Password (you can include spaces or not)
echo.
echo ========================================
echo.

:: Prompt for Gmail address
set /p GMAIL_EMAIL="Enter your Gmail address: "
if "!GMAIL_EMAIL!"=="" (
    echo [ERROR] Gmail address is required!
    pause
    exit /b 1
)

:: Validate email format (basic check)
echo !GMAIL_EMAIL! | findstr /R "@.*\..*" >nul
if errorlevel 1 (
    echo [ERROR] Invalid email format. Please enter a valid Gmail address.
    pause
    exit /b 1
)

:: Prompt for App Password
set /p SMTP_PASS="Enter your Gmail App Password (16 characters): "
if "!SMTP_PASS!"=="" (
    echo [ERROR] App Password is required!
    pause
    exit /b 1
)

:: Remove spaces from password if any
set SMTP_PASS=!SMTP_PASS: =!

:: Validate password length (should be 16 characters)
set PASSWORD_LENGTH=0
for /f %%A in ('powershell -command "$('!SMTP_PASS!').Length"') do set PASSWORD_LENGTH=%%A
if !PASSWORD_LENGTH! LSS 16 (
    echo [WARNING] App Password should be 16 characters. Continuing anyway...
)

echo.
echo ========================================
echo   Creating .env file...
echo ========================================
echo.

:: Create .env file - use call subroutine to handle variable expansion
call :WriteEnvFile
goto :AfterWriteEnvFile

:WriteEnvFile
setlocal disabledelayedexpansion
(
echo # SMTP Configuration
echo SMTP_ENABLED=true
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_SECURE=false
echo SMTP_USER=%GMAIL_EMAIL%
echo SMTP_PASS=%SMTP_PASS%
echo.
echo # Backend API Configuration
echo PORT=8000
echo VITE_API_URL=http://localhost:8000
echo VITE_WS_URL=ws://localhost:8000
echo.
echo # Frontend Configuration
echo VITE_APP_URL=http://localhost:5173
echo.
echo # Environment
echo NODE_ENV=development
) > .env
endlocal
exit /b

:AfterWriteEnvFile

if errorlevel 1 (
    echo [ERROR] Failed to create .env file!
    pause
    exit /b 1
)

echo [SUCCESS] .env file created successfully!
echo.
echo Your configuration:
echo   Gmail: !GMAIL_EMAIL!
echo   SMTP: Enabled
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo.

:START_SERVERS
echo ========================================
echo   Starting Servers...
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH!
    echo Please install Node.js (npm comes with it): https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

:: Start backend server in new window
echo [INFO] Starting backend server...
start "ThinkDesk Backend" cmd /k "node backend/send-email-server.cjs"
timeout /t 3 /nobreak >nul

:: Check if backend is running
echo [INFO] Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: Start frontend server in new window
echo [INFO] Starting frontend server...
start "ThinkDesk Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Your application is starting...
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Two windows will open:
echo   1. Backend server (email fetching)
echo   2. Frontend server (web interface)
echo.
echo The frontend will automatically open in your browser.
echo If not, manually visit: http://localhost:5173
echo.
echo To stop the servers, close the two command windows.
echo.
pause

