@echo off
echo Starting E-BrandID Web Server...
echo.
echo Server will start on http://localhost:8765
echo Browser will open automatically in 5 seconds...
echo.
start /B npm run server
timeout /t 5 /nobreak >nul
start http://localhost:8765
