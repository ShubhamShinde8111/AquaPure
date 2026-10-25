@echo off
title AquaPure Mail Dispatch Server
cd /d "%~dp0"
echo =======================================================
echo Starting AquaPure Transactional Mail Server...
echo =======================================================
node functions/mailServer.js
pause
