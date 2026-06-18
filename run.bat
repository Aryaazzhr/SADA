@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  SADA - Sistem Auditori Deteksi AI pada Suara
::  Script Otomatis: Install Dependensi dan Jalankan Aplikasi
:: ============================================================

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "BACKEND_PORT=8001"
set "FRONTEND_PORT=3000"

echo.
echo ============================================================
echo   SADA - Setup Otomatis dan Run
echo ============================================================
echo   1. Cek prasyarat
echo   2. Install dependensi Backend [Python]
echo   3. Install dependensi Frontend [Node.js]
echo   4. Jalankan Backend + Frontend + Buka Browser
echo ============================================================
echo.

:: ------------------------------------------------------------
::  STEP 1: Cek prasyarat (Python dan Node.js)
:: ------------------------------------------------------------
echo [1/5] Memeriksa prasyarat...

where python >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo    [ERROR] Python tidak ditemukan.
    echo           Unduh di python.org/downloads
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo    [OK] %%v ditemukan

where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo    [ERROR] Node.js tidak ditemukan.
    echo           Unduh di nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo    [OK] Node.js %%v ditemukan

set "USE_NPM=0"
where yarn >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo    [INFO] Yarn tidak ditemukan, akan menggunakan npm.
    set "USE_NPM=1"
) else (
    for /f "tokens=*" %%v in ('yarn --version 2^>^&1') do echo    [OK] Yarn %%v ditemukan
)

echo.

:: ------------------------------------------------------------
::  STEP 1b: Cek dan buat file .env jika belum ada
:: ------------------------------------------------------------
echo    Memeriksa file .env...

if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env.example" (
        copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
        echo    [OK] backend\.env dibuat dari .env.example
        echo    [!!] PENTING: Edit backend\.env dan isi kredensial yang benar!
        echo         Buka file: %BACKEND%\.env
        echo.
        echo    Tekan tombol apa saja setelah selesai edit .env...
        pause >nul
    ) else (
        echo    [WARNING] backend\.env.example tidak ditemukan!
    )
) else (
    echo    [OK] backend\.env sudah ada.
)

if not exist "%FRONTEND%\.env" (
    if exist "%FRONTEND%\.env.example" (
        copy "%FRONTEND%\.env.example" "%FRONTEND%\.env" >nul
        echo    [OK] frontend\.env dibuat dari .env.example
    ) else (
        echo    [WARNING] frontend\.env.example tidak ditemukan!
    )
) else (
    echo    [OK] frontend\.env sudah ada.
)

echo.

:: ------------------------------------------------------------
::  STEP 2: Install dependensi Backend
:: ------------------------------------------------------------
echo [2/5] Menginstall dependensi Backend...

if not exist "%BACKEND%\requirements.txt" (
    echo    [SKIP] requirements.txt tidak ditemukan.
    goto frontend_install
)

if not exist "%BACKEND%\.venv" (
    echo    Membuat virtual environment...
    python -m venv "%BACKEND%\.venv"
    if !ERRORLEVEL! NEQ 0 (
        echo    [ERROR] Gagal membuat virtual environment.
        pause
        exit /b 1
    )
    echo    [OK] Virtual environment dibuat.
) else (
    echo    [OK] Virtual environment sudah ada.
)

echo    Menginstall packages dari requirements.txt...
call "%BACKEND%\.venv\Scripts\activate.bat"
pip install --upgrade pip >nul 2>&1
pip install -r "%BACKEND%\requirements.txt"
if !ERRORLEVEL! NEQ 0 (
    echo    [ERROR] Gagal menginstall dependensi backend.
    call deactivate 2>nul
    pause
    exit /b 1
)
call deactivate 2>nul
echo    [OK] Dependensi backend berhasil diinstall.
echo.

:: ------------------------------------------------------------
::  STEP 3: Install dependensi Frontend
:: ------------------------------------------------------------
:frontend_install
echo [3/5] Menginstall dependensi Frontend...

if not exist "%FRONTEND%\package.json" (
    echo    [SKIP] package.json tidak ditemukan.
    goto check_ports
)

pushd "%FRONTEND%"
if "!USE_NPM!"=="1" (
    echo    Menginstall packages dengan npm...
    call npm install
) else (
    echo    Menginstall packages dengan yarn...
    call yarn install
)
if !ERRORLEVEL! NEQ 0 (
    echo    [ERROR] Gagal menginstall dependensi frontend.
    popd
    pause
    exit /b 1
)
popd
echo    [OK] Dependensi frontend berhasil diinstall.
echo.

:: ------------------------------------------------------------
::  STEP 4: Matikan proses lama di port yang sama (jika ada)
:: ------------------------------------------------------------
:check_ports
echo [4/5] Memeriksa port yang digunakan...

for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
    echo    [INFO] Menghentikan proses lama di port %BACKEND_PORT% [PID: %%p]
    taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING" 2^>nul') do (
    echo    [INFO] Menghentikan proses lama di port %FRONTEND_PORT% [PID: %%p]
    taskkill /PID %%p /F >nul 2>&1
)

echo    [OK] Port siap digunakan.
echo.

:: ------------------------------------------------------------
::  STEP 5: Jalankan Backend + Frontend + Buka Browser
:: ------------------------------------------------------------
echo [5/5] Menjalankan aplikasi...
echo.
echo    Backend  : http://127.0.0.1:%BACKEND_PORT%
echo    Frontend : http://localhost:%FRONTEND_PORT%
echo.

:: Buat helper script sementara untuk backend
set "BACKEND_HELPER=%ROOT%_start_backend.bat"
(
    echo @echo off
    echo cd /d "%BACKEND%"
    echo call .venv\Scripts\activate.bat
    echo uvicorn server:app --host 127.0.0.1 --port %BACKEND_PORT% --reload
) > "%BACKEND_HELPER%"

:: Jalankan Backend di window terpisah
echo    [RUN] Memulai Backend server...
start "SADA Backend" cmd /k ""%BACKEND_HELPER%""

:: Tunggu backend siap
echo    Menunggu backend siap...
set "RETRIES=0"
:wait_backend
timeout /t 2 /nobreak >nul
set /a RETRIES+=1
if !RETRIES! GEQ 30 (
    echo    [WARNING] Backend belum merespon setelah 60 detik, melanjutkan...
    goto start_frontend
)
curl -s -o nul -w "" http://127.0.0.1:%BACKEND_PORT%/api/ >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo    Menunggu backend... [!RETRIES!/30]
    goto wait_backend
)
echo    [OK] Backend sudah berjalan!

:start_frontend
:: Buat helper script sementara untuk frontend
set "FRONTEND_HELPER=%ROOT%_start_frontend.bat"
if "!USE_NPM!"=="1" (
    (
        echo @echo off
        echo cd /d "%FRONTEND%"
        echo set PORT=%FRONTEND_PORT%
        echo npm start
    ) > "!FRONTEND_HELPER!"
) else (
    (
        echo @echo off
        echo cd /d "%FRONTEND%"
        echo set PORT=%FRONTEND_PORT%
        echo yarn start
    ) > "!FRONTEND_HELPER!"
)

:: Jalankan Frontend di window terpisah
echo    [RUN] Memulai Frontend server...
start "SADA Frontend" cmd /k ""%FRONTEND_HELPER%""

:: Tunggu frontend siap lalu buka browser
echo    Menunggu frontend siap...
set "RETRIES=0"
:wait_frontend
timeout /t 3 /nobreak >nul
set /a RETRIES+=1
if !RETRIES! GEQ 20 (
    echo    [WARNING] Frontend belum merespon setelah 60 detik, membuka browser...
    goto open_browser
)
curl -s -o nul -w "" http://localhost:%FRONTEND_PORT% >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo    Menunggu frontend... [!RETRIES!/20]
    goto wait_frontend
)
echo    [OK] Frontend sudah berjalan!

:open_browser
echo.
echo    [OK] Membuka browser...
start "" http://localhost:%FRONTEND_PORT%

:: Hapus helper scripts
timeout /t 2 /nobreak >nul
del "%BACKEND_HELPER%" 2>nul
del "%FRONTEND_HELPER%" 2>nul

echo.
echo ============================================================
echo   SADA berjalan!
echo ============================================================
echo.
echo   Backend  : http://127.0.0.1:%BACKEND_PORT%
echo   Frontend : http://localhost:%FRONTEND_PORT%
echo.
echo   Untuk menghentikan, tutup window "SADA Backend"
echo   dan "SADA Frontend", atau tekan Ctrl+C di masing-masing.
echo.
echo   Tekan tombol apa saja untuk menutup window ini...
pause >nul
