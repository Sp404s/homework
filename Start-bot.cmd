@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0server\start.ps1"
pause
