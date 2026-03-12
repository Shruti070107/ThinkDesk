@echo off
chcp 65001 >nul

echo.
echo ========================================
echo   ThinkDesk AI - Check Dependencies
echo ========================================
echo.

:: Check if Node.js is installed
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
goto checkpackagejson

:nonpm
echo [ERROR] npm is not installed or not in PATH!
echo Please install Node.js - npm comes with it
pause
exit /b 1

:checkpackagejson
if not exist package.json goto nopackagejson
echo [INFO] Found package.json
goto checknodemodules

:nopackagejson
echo [ERROR] package.json file not found!
echo Please make sure you are in the project root directory.
pause
exit /b 1

:checknodemodules
if exist node_modules goto checkinstalled
goto install

:checkinstalled
echo [INFO] node_modules folder exists
echo [INFO] Checking if dependencies are installed...
echo.

:: Check if critical packages are installed
if not exist node_modules\express goto install
if not exist node_modules\nodemailer goto install
if not exist node_modules\imap goto install
if not exist node_modules\mailparser goto install
if not exist node_modules\react goto install
if not exist node_modules\@tanstack\react-query goto install

echo [SUCCESS] All dependencies appear to be installed!
echo.
echo [INFO] Verifying installation...
call npm list --depth=0 >nul 2>&1
if errorlevel 1 goto verifyfailed
goto success

:verifyfailed
echo [WARNING] Some dependencies may be missing or corrupted.
echo [INFO] Reinstalling dependencies...
goto install

:install
echo [INFO] Installing dependencies...
echo This may take a few minutes...
echo.
call npm install
if errorlevel 1 goto installfailed
goto success

:installfailed
echo.
echo [ERROR] Failed to install dependencies!
echo.
echo Troubleshooting:
echo   1. Check your internet connection
echo   2. Try running: npm cache clean --force
echo   3. Try running: npm install --verbose
echo.
pause
exit /b 1

:success
echo.
echo ========================================
echo   Dependencies Check Complete!
echo ========================================
echo.
echo [SUCCESS] All dependencies are installed and ready!
echo.
echo You can now run:
echo   - start.bat (first time setup)
echo   - run-servers.bat (start servers)
echo.
pause

