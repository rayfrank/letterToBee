@echo off
cd /d "%~dp0"
echo Starting Our Little Universe...
echo Keep this window open while viewing the site.
start "" "http://localhost:8000"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  python -m http.server 8000
)
pause
