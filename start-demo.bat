@echo off
rem Starts the Kestrel prototype and opens it in the browser.
rem Keep the "Kestrel server" window open during the demo; close it to stop the app.
cd /d "%~dp0backend"
echo Starting Kestrel prototype on http://127.0.0.1:8000 ...
start "Kestrel server" cmd /k ""%~dp0.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 5 /nobreak >nul
start "" http://127.0.0.1:8000
