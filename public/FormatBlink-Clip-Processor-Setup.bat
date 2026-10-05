@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Format Blink Local Processor Setup

echo.
echo ==========================================
echo   Format Blink Local Processor - Setup
echo ==========================================
echo.

set "ROOT=%LOCALAPPDATA%\FormatBlink\ClipProcessor"
set "VENV=%ROOT%\.venv"
set "VPY=%VENV%\Scripts\python.exe"
set "STARTER=%ROOT%\Start-Format-Blink-Processor.bat"

if not exist "%ROOT%" mkdir "%ROOT%"
if not exist "%ROOT%" (
  echo ERROR: Could not create "%ROOT%".
  pause
  exit /b 1
)

where winget >nul 2>&1
if errorlevel 1 (
  echo ERROR: Windows Package Manager ^(winget^) is required.
  echo Install "App Installer" from Microsoft Store and run this setup again.
  pause
  exit /b 1
)

set "PYEXE="
py -3.11 -c "import sys; print(sys.executable)" >nul 2>&1
if not errorlevel 1 set "PYEXE=py -3.11"

if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
  set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)

if not defined PYEXE (
  echo Installing Python 3.11...
  winget install -e --id Python.Python.3.11 --scope user --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo ERROR: Python 3.11 installation failed.
    pause
    exit /b 1
  )
  if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
  ) else (
    py -3.11 -c "import sys; print(sys.executable)" >nul 2>&1
    if not errorlevel 1 set "PYEXE=py -3.11"
  )
)

if not defined PYEXE (
  echo ERROR: Python 3.11 could not be found.
  echo Restart Windows once and run this setup again.
  pause
  exit /b 1
)

echo Python 3.11 found.

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo Installing FFmpeg...
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo ERROR: FFmpeg installation failed.
    pause
    exit /b 1
  )
)

echo Downloading Format Blink processor files...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/studio/server.py' -OutFile ($env:ROOT+'\server.py'); Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/python/transcribe.py' -OutFile ($env:ROOT+'\transcribe.py'); Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/studio/requirements.txt' -OutFile ($env:ROOT+'\requirements.txt')"
if errorlevel 1 (
  echo ERROR: Could not download processor files. Check your internet connection.
  pause
  exit /b 1
)

if not exist "%VPY%" (
  echo Creating Python virtual environment...
  if exist "%VENV%" rmdir /s /q "%VENV%"
  if "%PYEXE%"=="py -3.11" (
    py -3.11 -m venv "%VENV%"
  ) else (
    "%PYEXE%" -m venv "%VENV%"
  )
  if errorlevel 1 (
    echo ERROR: Virtual environment creation failed.
    pause
    exit /b 1
  )
)

if not exist "%VPY%" (
  echo ERROR: Virtual environment Python was not created at:
  echo %VPY%
  pause
  exit /b 1
)

echo Installing local processor packages...
"%VPY%" -m pip install --upgrade pip
if errorlevel 1 (
  echo ERROR: pip upgrade failed.
  pause
  exit /b 1
)

"%VPY%" -m pip install "fastapi>=0.115,<1" "uvicorn>=0.34,<1" "httpx>=0.28,<1" yt-dlp "faster-whisper==1.1.1" "requests>=2.32,<3" numpy
if errorlevel 1 (
  echo ERROR: Processor package installation failed.
  pause
  exit /b 1
)

> "%STARTER%" echo @echo off
>>"%STARTER%" echo setlocal EnableExtensions EnableDelayedExpansion
>>"%STARTER%" echo title Format Blink Local Processor
>>"%STARTER%" echo set "ROOT=%%LOCALAPPDATA%%\FormatBlink\ClipProcessor"
>>"%STARTER%" echo set "VPY=%%LOCALAPPDATA%%\FormatBlink\ClipProcessor\.venv\Scripts\python.exe"
>>"%STARTER%" echo set "FORMAT_BLINK_LOCAL=1"
>>"%STARTER%" echo set "MEDIA_ROOT=%%LOCALAPPDATA%%\FormatBlink\ClipProcessor\media"
>>"%STARTER%" echo set "MAX_UPLOAD_GB=8"
>>"%STARTER%" echo set "MAX_VIDEO_HOURS=3"
>>"%STARTER%" echo set "MEDIA_TTL_HOURS=6"
>>"%STARTER%" echo if not exist "%%VPY%%" ^(
>>"%STARTER%" echo   echo Local Processor installation is incomplete.
>>"%STARTER%" echo   echo Please download and run FormatBlink-Clip-Processor-Setup.bat again.
>>"%STARTER%" echo   pause
>>"%STARTER%" echo   exit /b 1
>>"%STARTER%" echo ^)
>>"%STARTER%" echo echo Checking for Clip Processor updates...
>>"%STARTER%" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $items=@(@('processor/studio/server.py','server.py'),@('processor/python/transcribe.py','transcribe.py'),@('processor/studio/requirements.txt','requirements.txt')); foreach($item in $items){$tmp=Join-Path $env:TEMP ('formatblink-clip-'+$item[1]); Invoke-WebRequest -UseBasicParsing ('https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/'+$item[0]) -OutFile $tmp; Move-Item -Force $tmp (Join-Path $env:ROOT $item[1])}" ^>nul 2^>^&1
>>"%STARTER%" echo if errorlevel 1 echo WARNING: Update check failed. Starting the installed Clip Processor version.
>>"%STARTER%" echo "%%VPY%%" -m pip install --disable-pip-version-check -q -r "%%ROOT%%\requirements.txt"
>>"%STARTER%" echo if errorlevel 1 ^(
>>"%STARTER%" echo   echo ERROR: Clip Processor dependency update failed. Run setup again.
>>"%STARTER%" echo   pause
>>"%STARTER%" echo   exit /b 1
>>"%STARTER%" echo ^)
>>"%STARTER%" echo where ffmpeg ^>nul 2^>^&1
>>"%STARTER%" echo if errorlevel 1 ^(
>>"%STARTER%" echo   for /r "%%LOCALAPPDATA%%\Microsoft\WinGet\Packages" %%%%F in ^(ffmpeg.exe^) do ^(
>>"%STARTER%" echo     if exist "%%%%F" set "PATH=%%%%~dpF;%%PATH%%"
>>"%STARTER%" echo     if exist "%%%%F" goto :ffmpeg_ready
>>"%STARTER%" echo   ^)
>>"%STARTER%" echo ^)
>>"%STARTER%" echo :ffmpeg_ready
>>"%STARTER%" echo where ffmpeg ^>nul 2^>^&1
>>"%STARTER%" echo if errorlevel 1 ^(
>>"%STARTER%" echo   echo FFmpeg was not found. Run the setup again.
>>"%STARTER%" echo   pause
>>"%STARTER%" echo   exit /b 1
>>"%STARTER%" echo ^)
>>"%STARTER%" echo cd /d "%%ROOT%%"
>>"%STARTER%" echo if errorlevel 1 ^(
>>"%STARTER%" echo   echo Could not open the processor folder.
>>"%STARTER%" echo   pause
>>"%STARTER%" echo   exit /b 1
>>"%STARTER%" echo ^)
>>"%STARTER%" echo echo.
>>"%STARTER%" echo echo Starting Format Blink Local Processor on http://127.0.0.1:8765
>>"%STARTER%" echo echo Keep this window open while using Clip Studio.
>>"%STARTER%" echo echo.
>>"%STARTER%" echo "%%VPY%%" -m uvicorn server:app --host 127.0.0.1 --port 8765 --workers 1
>>"%STARTER%" echo echo.
>>"%STARTER%" echo echo Processor stopped.
>>"%STARTER%" echo pause

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $desktop=[Environment]::GetFolderPath('Desktop'); $s=$ws.CreateShortcut($desktop+'\Format Blink Clip Processor.lnk'); $s.TargetPath=$env:STARTER; $s.WorkingDirectory=$env:ROOT; $s.Save()"
if errorlevel 1 (
  echo WARNING: Desktop shortcut could not be created, but installation is complete.
)

echo.
echo ==========================================
echo   Setup complete
echo ==========================================
echo.
echo Installed in:
echo %ROOT%
echo.
echo A Desktop shortcut named "Format Blink Clip Processor" was created.
echo Starting the processor now...
echo.
start "" "%STARTER%"
echo Waiting for processor health check...
powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 30;$i++){try{$h=Invoke-RestMethod 'http://127.0.0.1:8765/health' -TimeoutSec 2;if($h.ok){$ready=$true;break}}catch{}; Start-Sleep -Seconds 2}; if($ready){Start-Process 'https://formatblink.vercel.app/clips/studio';Write-Host 'Processor ready. Allow local network access in your browser if asked.'}else{Write-Host 'Processor did not start. Read the error in its window, then run setup again.';exit 1}"
pause
