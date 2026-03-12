@echo off
chcp 65001 >nul

echo.
echo ========================================
echo   ThinkDesk AI - Starting Servers
echo ========================================
echo.

if not exist .env goto noenv
echo [INFO] Found .env file
echo.
goto checknode

:noenv
echo [ERROR] .env file not found!
echo.
echo ========================================
echo   Setup Required
echo ========================================
echo.
echo Please run start.bat first to configure your Gmail credentials.
echo.
echo The start.bat file will:
echo   1. Ask for your Gmail address
echo   2. Ask for your Gmail App Password
echo   3. Create the .env file automatically
echo   4. Start both servers
echo.
echo After that, you can use run-servers.bat to start servers quickly.
echo.
pause
exit /b 1

:checknode
where node >nul 2>&1
if errorlevel 1 goto nonode
goto checknpm

:nonode
echo [ERROR] Node.js is not installed or not in PATH!
echo Please install Node.js from nodejs.org
pause
exit /b 1

:checknpm
where npm >nul 2>&1
if errorlevel 1 goto nonpm
goto checkdeps

:nonpm
echo [ERROR] npm is not installed or not in PATH!
echo Please install Node.js - npm comes with it
pause
exit /b 1

:checkdeps
if not exist node_modules goto installdeps
goto checkbackend

:installdeps
echo [INFO] Installing dependencies...
call npm install
if errorlevel 1 goto installdepsfailed
echo.
goto checkbackend

:installdepsfailed
echo [ERROR] Failed to install dependencies!
pause
exit /b 1

:checkbackend
if not exist backend\send-email-server.cjs goto nobackend
goto startservers

:nobackend
echo [ERROR] Backend server file not found!
echo Expected file: backend\send-email-server.cjs
pause
exit /b 1

:startservers
echo ========================================
echo   Starting Servers...
echo ========================================
echo.

echo [INFO] Starting backend server on port 8000...
start "ThinkDesk Backend" cmd /k node backend/send-email-server.cjs
timeout /t 3 /nobreak >nul

echo [INFO] Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [INFO] Starting frontend server on port 5173...
start "ThinkDesk Frontend" cmd /k npm run dev

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Backend server running on port 8000
echo Frontend server running on port 5173
echo.
echo Two windows have opened:
echo   1. Backend server (email fetching)
echo   2. Frontend server (web interface)
echo.
echo The frontend will automatically open in your browser.
echo If not, manually visit localhost:5173
echo.
echo To stop the servers, close the two command windows.
echo.
pause
