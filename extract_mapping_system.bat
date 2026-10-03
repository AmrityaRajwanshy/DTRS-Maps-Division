@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo     DTRS MAPPING SYSTEM - Independent Service Extractor
echo ===============================================================================

set DEST=%1
if "%DEST%"=="" (
    set /p DEST="Enter destination folder path to extract Mapping System to (e.g. C:\dtrs-mapping): "
)

if "%DEST%"=="" (
    echo Error: Destination path cannot be empty.
    pause
    exit /b 1
)

echo.
echo [*] Extracting Mapping System to: "%DEST%"...
mkdir "%DEST%" 2>nul

echo [*] Copying files (excluding node_modules and .next cache)...
robocopy "Mapping System" "%DEST%" /E /XD node_modules .next /XF tsconfig.tsbuildinfo

echo.
echo ===============================================================================
echo [SUCCESS] Mapping System has been extracted to: "%DEST%"
echo.
echo To run individually:
echo   1. cd "%DEST%"
echo   2. npm install
echo   3. npm run dev
echo.
echo To build with Docker:
echo   1. cd "%DEST%"
echo   2. docker build -t dtrs-mapping .
echo   3. docker run -p 3001:3001 dtrs-mapping
echo ===============================================================================
pause
