@echo off
echo ========================================
echo   ZimCrowd Local Development Server
echo ========================================
echo.
echo Starting local server on port 8000...
echo.
echo Once started, open your browser to:
echo   http://localhost:8000/local-server.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 3...
    python -m http.server 8000
    goto :end
)

REM Try Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 2...
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Try Node.js http-server
npx http-server --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    npx http-server -p 8000
    goto :end
)

echo.
echo ERROR: No suitable server found!
echo.
echo Please install one of the following:
echo   - Python 3: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end
