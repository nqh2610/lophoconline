@echo off
echo ============================================
echo DATABASE BACKUP - LopHoc.Online
echo ============================================
echo.

REM Get database credentials from .env
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#"') do (
    if "%%a"=="DATABASE_URL" set DB_URL=%%b
)

REM Parse DATABASE_URL (format: mysql://user:pass@host:port/dbname)
for /f "tokens=2 delims=/" %%a in ("%DB_URL%") do set DB_CRED=%%a
for /f "tokens=1 delims=@" %%a in ("%DB_CRED%") do set USER_PASS=%%a
for /f "tokens=1 delims=:" %%a in ("%USER_PASS%") do set DB_USER=%%a
for /f "tokens=2 delims=:" %%a in ("%USER_PASS%") do set DB_PASS=%%a
for /f "tokens=2 delims=@" %%a in ("%DB_CRED%") do set HOST_PORT=%%a
for /f "tokens=1 delims=:" %%a in ("%HOST_PORT%") do set DB_HOST=%%a
for /f "tokens=3 delims=/" %%a in ("%DB_URL%") do set DB_NAME=%%a

REM Get current timestamp
for /f "tokens=1-6 delims=/:. " %%a in ("%date% %time%") do (
    set TIMESTAMP=%%c%%a%%b_%%d%%e%%f
)

set BACKUP_FILE=backup_%TIMESTAMP%.sql

echo Creating backup of database: %DB_NAME%
echo Backup file: %BACKUP_FILE%
echo.

REM Run mysqldump (using password from environment)
echo %DB_PASS%| mysqldump -u %DB_USER% -p -h %DB_HOST% %DB_NAME% > %BACKUP_FILE% 2>nul

if %errorlevel% equ 0 (
    echo ✓ Backup completed successfully!
    echo File: %BACKUP_FILE%
    echo.
    dir %BACKUP_FILE% | findstr /v "Directory"
) else (
    echo ✗ Backup failed! Please check credentials.
    pause
    exit /b 1
)

echo.
pause
