@echo off
REM Storagely Test Control Panel — double-click launcher (Windows)
REM Starts the local server (which auto-opens your browser).
cd /d "%~dp0"
node control-panel\server.js
pause
