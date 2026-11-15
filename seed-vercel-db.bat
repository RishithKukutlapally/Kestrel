@echo off
rem Creates the tables and loads the synthetic demo data + logins into your hosted
rem Postgres (Neon) database used by Vercel. Safe to re-run: it resets the demo data.
rem Passwords follow DEMO_PASSWORD_TEMPLATE from your local .env (e.g. Vikram@YourSuffix).
echo Paste the Postgres connection string from Vercel (Storage ^> your database ^> DATABASE_URL).
echo It starts with postgres:// or postgresql://
set /p DATABASE_URL=DATABASE_URL: 
if "%DATABASE_URL%"=="" (echo No URL entered. & pause & exit /b 1)
cd /d "%~dp0backend"
echo.
echo This will RESET the demo data in that database. Close this window now to cancel.
pause
"%~dp0.venv\Scripts\python.exe" -m app.seed --reset
echo.
echo Done. Open your Vercel URL and sign in (e.g. vikram / Vikram@YourSuffix).
pause
