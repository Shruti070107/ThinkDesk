@echo off
chcp 65001 >nul

echo.
echo ========================================
echo   ThinkDesk AI - Stopping Servers
echo ========================================
echo.

echo [INFO] Stopping all Node.js processes...
echo.

:: Kill processes on port 8000 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [INFO] Stopping backend server PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [INFO] Stopping frontend server PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes by window title
taskkill /F /FI "WINDOWTITLE eq ThinkDesk Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ThinkDesk Frontend*" >nul 2>&1

:: Kill all node.exe processes
taskkill /F /IM node.exe >nul 2>&1
if errorlevel 1 goto :nonodefound
goto :killnpm

:nonodefound
echo [INFO] No Node.js processes found.
goto :done

:killnpm
echo [INFO] All Node.js processes stopped.

:: Kill npm processes if any
taskkill /F /IM npm.cmd >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq npm*" >nul 2>&1

:done
echo.
echo [SUCCESS] All servers stopped!
echo.
pause
