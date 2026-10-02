@echo off
echo ===============================================================================
echo     STARTING STANDALONE TRETA MAPPING SYSTEM (PORT 3001)
echo ===============================================================================
cd /d "%~dp0"
if not exist "node_modules" (
    if exist "Mapping System\node_modules" (
        cd /d "%~dp0Mapping System"
    )
)
npm run dev
