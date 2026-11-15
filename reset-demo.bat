@echo off
rem Restores the 12 synthetic applications and all demo logins to their starting state.
rem Stop the app first (close the "Kestrel server" window), then run this, then start-demo.bat.
rem This also clears practice runs and their AI costs.
cd /d "%~dp0backend"
"%~dp0.venv\Scripts\python.exe" -m app.seed --reset
echo.
echo Demo data reset. Now run start-demo.bat.
pause
