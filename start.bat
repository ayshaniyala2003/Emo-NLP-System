@echo off
echo ============================================================
echo   EmoNLP Multimodal Emotion Recognition System
echo ============================================================

echo.
echo [1/2] Starting FastAPI Backend (port 8000)...
start "EmoNLP Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt -q && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React Frontend (port 5173)...
start "EmoNLP Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ============================================================
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo ============================================================
echo.
echo First run will download models (~1GB) — please wait.
echo Press any key to exit...
pause > nul
