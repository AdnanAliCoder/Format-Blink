@echo off
setlocal EnableExtensions
title Format Blink Local Processor Setup
echo.
echo ==========================================
echo   Format Blink Local Processor - Setup
echo ==========================================
echo.
set "ROOT=%LOCALAPPDATA%\FormatBlink\ClipProcessor"
if not exist "%ROOT%" mkdir "%ROOT%"

where winget >nul 2>&1
if errorlevel 1 (
  echo Windows Package Manager ^(winget^) is required.
  echo Install "App Installer" from Microsoft Store, then run this setup again.
  pause
  exit /b 1
)

set "PYEXE="
where py >nul 2>&1 && set "PYEXE=py -3.11"
if not defined PYEXE (
  echo Installing Python 3.11...
  winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
  if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)
if not defined PYEXE (
  echo Python 3.11 was not found after installation. Restart Windows and run setup again.
  pause
  exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo Installing FFmpeg...
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
)

echo Downloading Format Blink processor files...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/studio/server.py' -OutFile '%ROOT%\server.py'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/python/transcribe.py' -OutFile '%ROOT%\transcribe.py'"

if not exist "%ROOT%\.venv\Scripts\python.exe" (
  echo Creating local Python environment...
  %PYEXE% -m venv "%ROOT%\.venv"
)

echo Installing local processor packages...
"%ROOT%\.venv\Scripts\python.exe" -m pip install --upgrade pip
"%ROOT%\.venv\Scripts\python.exe" -m pip install "fastapi>=0.115,<1" "uvicorn>=0.34,<1" "httpx>=0.28,<1" yt-dlp "faster-whisper==1.1.1" "requests>=2.32,<3" numpy

> "%ROOT%\Start-Format-Blink-Processor.bat" echo @echo off
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo setlocal EnableExtensions
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo title Format Blink Local Processor
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo set "ROOT=%%LOCALAPPDATA%%\FormatBlink\ClipProcessor"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo set "FORMAT_BLINK_LOCAL=1"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo set "MEDIA_ROOT=%%LOCALAPPDATA%%\FormatBlink\ClipProcessor\media"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo set "MAX_UPLOAD_GB=8"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo set "MAX_VIDEO_HOURS=3"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo set "MEDIA_TTL_HOURS=6"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo where ffmpeg ^>nul 2^>^&1
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo if errorlevel 1 for /r "%%LOCALAPPDATA%%\Microsoft\WinGet\Packages" %%%%F in ^(ffmpeg.exe^) do set "PATH=%%%%~dpF;%%PATH%%" ^& goto :ffmpeg_ready
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo :ffmpeg_ready
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo echo Format Blink Local Processor is running on http://127.0.0.1:8765
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo echo Keep this window open while using Clip Studio.
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo cd /d "%%ROOT%%"
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo "%%ROOT%%\.venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8765 --workers 1
>>"%ROOT%\Start-Format-Blink-Processor.bat" echo pause

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Format Blink Clip Processor.lnk'); $s.TargetPath='%ROOT%\Start-Format-Blink-Processor.bat'; $s.WorkingDirectory='%ROOT%'; $s.Save()"

echo.
echo Setup complete.
echo A "Format Blink Clip Processor" shortcut was added to your Desktop.
echo The processor will now start. Keep its window open while using Clip Studio.
echo.
start "" "%ROOT%\Start-Format-Blink-Processor.bat"
pause
