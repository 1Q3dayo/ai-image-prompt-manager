@echo off
setlocal

if "%npm_lifecycle_event%"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-lan.ps1" -InstallIfMissing -PauseOnExit %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-lan.ps1" %*
)
exit /b %ERRORLEVEL%

