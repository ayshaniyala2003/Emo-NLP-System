<#
.SYNOPSIS
    EmoNLP — Automated first-time setup script
    Run once from project root. Requires internet connection.
    Some steps (Long Paths, ffmpeg PATH) require Administrator or a terminal restart.
#>

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjectRoot "backend"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  EmoNLP — Multimodal Emotion Recognition Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Long Paths ────────────────────────────────────────────────────
Write-Host "[1/7] Enabling Windows Long Paths..." -ForegroundColor Yellow
try {
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem"
    Set-ItemProperty -Path $regPath -Name LongPathsEnabled -Value 1 -Type DWord -Force
    Write-Host "      Long paths enabled." -ForegroundColor Green
} catch {
    Write-Host "      WARNING: Could not set Long Paths (need admin). Enable manually:" -ForegroundColor Red
    Write-Host "      Settings > System > For Developers > Enable Win32 Long Paths"
}

# ── Step 2: pip / setuptools ──────────────────────────────────────────────
Write-Host "[2/7] Upgrading pip, setuptools, wheel..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel --quiet
Write-Host "      Done." -ForegroundColor Green

# ── Step 3: PyTorch CPU ───────────────────────────────────────────────────
Write-Host "[3/7] Installing PyTorch CPU (torch + torchaudio)..." -ForegroundColor Yellow
Write-Host "      This may take several minutes (~200 MB)..."
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
Write-Host "      Done." -ForegroundColor Green

# ── Step 4: Core backend packages ─────────────────────────────────────────
Write-Host "[4/7] Installing core backend packages..." -ForegroundColor Yellow
python -m pip install fastapi "uvicorn[standard]" python-multipart httpx pydantic `
    transformers tokenizers sentencepiece `
    numpy pillow scipy opencv-python-headless --quiet
Write-Host "      Done." -ForegroundColor Green

# ── Step 5: AI model packages ─────────────────────────────────────────────
Write-Host "[5/7] Installing AI model packages (deepface, whisper, speechbrain)..." -ForegroundColor Yellow
Write-Host "      This downloads TensorFlow (~350 MB) and other models. Please wait..."
python -m pip install deepface tf-keras openai-whisper speechbrain --quiet
Write-Host "      Done." -ForegroundColor Green

# ── Step 6: ffmpeg ────────────────────────────────────────────────────────
Write-Host "[6/7] Installing ffmpeg (required by Whisper for audio decoding)..." -ForegroundColor Yellow
$ffmpegDest = "C:\ffmpeg"
$ffmpegZip  = "$env:TEMP\ffmpeg_setup.zip"

if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
    Write-Host "      ffmpeg already on PATH, skipping." -ForegroundColor Green
} else {
    Write-Host "      Downloading ffmpeg (~90 MB)..."
    Invoke-WebRequest `
        -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip" `
        -OutFile $ffmpegZip -UseBasicParsing
    Expand-Archive -Path $ffmpegZip -DestinationPath $ffmpegDest -Force
    $ffmpegBin = (Get-ChildItem $ffmpegDest -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1).DirectoryName
    [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$ffmpegBin", "User")
    $env:PATH += ";$ffmpegBin"
    Write-Host "      ffmpeg installed to: $ffmpegBin" -ForegroundColor Green
    Write-Host "      Added to User PATH. Restart terminal for PATH to take effect." -ForegroundColor Yellow
}

# ── Step 7: npm install ───────────────────────────────────────────────────
Write-Host "[7/7] Installing frontend Node.js packages..." -ForegroundColor Yellow
Set-Location $ProjectRoot
npm install --silent
Write-Host "      Done." -ForegroundColor Green

# ── Summary ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  HOW TO START:" -ForegroundColor White
Write-Host "  Option A: Double-click start.bat"
Write-Host ""
Write-Host "  Option B (two terminals):"
Write-Host "    Terminal 1: cd $BackendDir"
Write-Host "                python -m uvicorn main:app --reload --port 8000"
Write-Host ""
Write-Host "    Terminal 2: cd $ProjectRoot"
Write-Host "                npm run dev"
Write-Host ""
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  Backend  : http://localhost:8000"
Write-Host "  API Docs : http://localhost:8000/docs"
Write-Host ""
Write-Host "  NOTE: First API call is slow (models load into memory)." -ForegroundColor Yellow
Write-Host "        Subsequent calls are fast." -ForegroundColor Yellow
Write-Host ""
