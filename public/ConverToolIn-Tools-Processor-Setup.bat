@echo off
setlocal EnableExtensions
title ConverToolIn Tools Processor Setup
echo.
echo ==========================================
echo   ConverToolIn Tools Processor - Setup
echo ==========================================
echo.
set "ROOT=%LOCALAPPDATA%\ConverToolIn\ToolsProcessor"
set "VENV=%ROOT%\.venv"
set "VPY=%VENV%\Scripts\python.exe"
set "STARTER=%ROOT%\Start-Format-Blink-Tools-Processor.bat"
if not exist "%ROOT%" mkdir "%ROOT%"

where winget >nul 2>&1
if errorlevel 1 (
  echo ERROR: Windows Package Manager ^(winget^) is required.
  echo Install "App Installer" from Microsoft Store and run this setup again.
  pause
  exit /b 1
)

set "PYEXE="
py -3.11 -c "import sys" >nul 2>&1
if not errorlevel 1 set "PYEXE=py -3.11"
if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PYEXE (
  echo Installing Python 3.11...
  winget install -e --id Python.Python.3.11 --scope user --accept-package-agreements --accept-source-agreements
  if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
)
if not defined PYEXE (
  echo ERROR: Python 3.11 was not found. Restart Windows once and run setup again.
  pause
  exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo Installing FFmpeg...
  winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
)

where soffice >nul 2>&1
if errorlevel 1 (
  echo Installing LibreOffice for Word, Excel and PowerPoint conversions...
  winget install -e --id TheDocumentFoundation.LibreOffice --accept-package-agreements --accept-source-agreements
)

where tesseract >nul 2>&1
if errorlevel 1 (
  echo Installing Tesseract OCR...
  winget install -e --id UB-Mannheim.TesseractOCR --accept-package-agreements --accept-source-agreements
)

echo Downloading ConverToolIn tools processor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/tools/server.py' -OutFile ($env:ROOT+'\server.py'); Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/tools/convert.py' -OutFile ($env:ROOT+'\convert.py'); Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/tools/requirements.txt' -OutFile ($env:ROOT+'\requirements.txt')"
if errorlevel 1 (
  echo ERROR: Could not download processor files.
  pause
  exit /b 1
)

if not exist "%VPY%" (
  echo Creating Python environment...
  if exist "%VENV%" rmdir /s /q "%VENV%"
  if "%PYEXE%"=="py -3.11" (
    py -3.11 -m venv "%VENV%"
  ) else (
    "%PYEXE%" -m venv "%VENV%"
  )
)
if not exist "%VPY%" (
  echo ERROR: Python environment could not be created.
  pause
  exit /b 1
)

echo Installing processor packages. This can take several minutes the first time...
"%VPY%" -m pip install --upgrade pip
"%VPY%" -m pip install -r "%ROOT%\requirements.txt"
if errorlevel 1 (
  echo ERROR: Python package installation failed.
  pause
  exit /b 1
)

> "%STARTER%" echo @echo off
>>"%STARTER%" echo setlocal EnableExtensions
>>"%STARTER%" echo title ConverToolIn Tools Processor
>>"%STARTER%" echo set "ROOT=%%LOCALAPPDATA%%\ConverToolIn\ToolsProcessor"
>>"%STARTER%" echo set "VPY=%%LOCALAPPDATA%%\ConverToolIn\ToolsProcessor\.venv\Scripts\python.exe"
>>"%STARTER%" echo set "FORMAT_BLINK_LOCAL=1"
>>"%STARTER%" echo set "HF_HOME=%%LOCALAPPDATA%%\ConverToolIn\ToolsProcessor\models"
>>"%STARTER%" echo set "PATH=%%ProgramFiles%%\LibreOffice\program;%%ProgramFiles%%\Tesseract-OCR;%%PATH%%"
>>"%STARTER%" echo if not exist "%%VPY%%" ^(
>>"%STARTER%" echo   echo Installation is incomplete. Run ConverToolIn-Tools-Processor-Setup.bat again.
>>"%STARTER%" echo   pause
>>"%STARTER%" echo   exit /b 1
>>"%STARTER%" echo ^)
>>"%STARTER%" echo echo Checking for ConverToolIn Tools Processor updates...
>>"%STARTER%" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $base='https://raw.githubusercontent.com/AdnanAliCoder/Format-Blink/main/processor/tools/'; foreach($name in @('server.py','convert.py','requirements.txt')){$tmp=Join-Path $env:TEMP ('formatblink-'+$name); Invoke-WebRequest -UseBasicParsing ($base+$name) -OutFile $tmp; Move-Item -Force $tmp (Join-Path $env:ROOT $name)}" ^>nul 2^>^&1
>>"%STARTER%" echo if errorlevel 1 echo WARNING: Update check failed. Starting the installed processor version.
>>"%STARTER%" echo "%%VPY%%" -m pip install --disable-pip-version-check -q -r "%%ROOT%%\requirements.txt"
>>"%STARTER%" echo if errorlevel 1 ^(
>>"%STARTER%" echo   echo ERROR: Processor dependency update failed. Run ConverToolIn-Tools-Processor-Setup.bat again.
>>"%STARTER%" echo   pause
>>"%STARTER%" echo   exit /b 1
>>"%STARTER%" echo ^)
>>"%STARTER%" echo for /r "%%LOCALAPPDATA%%\Microsoft\WinGet\Packages" %%%%F in ^(ffmpeg.exe^) do if exist "%%%%F" set "PATH=%%%%~dpF;%%PATH%%"
>>"%STARTER%" echo cd /d "%%ROOT%%"
>>"%STARTER%" echo echo.
>>"%STARTER%" echo echo ConverToolIn Tools Processor is running on http://127.0.0.1:8766
>>"%STARTER%" echo echo Keep this window open while using PDF, Image or Video server tools.
>>"%STARTER%" echo echo.
>>"%STARTER%" echo "%%VPY%%" -m uvicorn server:app --host 127.0.0.1 --port 8766 --workers 1
>>"%STARTER%" echo echo.
>>"%STARTER%" echo echo Processor stopped.
>>"%STARTER%" echo pause

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\ConverToolIn Tools Processor.lnk'); $s.TargetPath=$env:STARTER; $s.WorkingDirectory=$env:ROOT; $s.Save()"

echo.
echo Setup complete.
echo Desktop shortcut: ConverToolIn Tools Processor
echo Starting it now...
start "" "%STARTER%"
pause
