@echo off
setlocal

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev-lan.ps1" -InstallIfMissing -PauseOnExit %*
exit /b %ERRORLEVEL%

