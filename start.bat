@echo off
REM PLC Cloth Application Startup Script for Windows
REM Starts both backend (Server) and frontend (PLC_App) servers

echo.
echo ==========================================
echo Starting PLC Cloth Application
echo ==========================================
echo.

REM Start backend server
echo Starting backend server...
start cmd /k "cd server && npm run dev"
timeout /t 2 /nobreak

REM Start frontend server
echo Starting frontend server...
start cmd /k "cd PLC_App && npm run dev"

echo.
echo ==========================================
echo ^✓ Both servers are starting!
echo ==========================================
echo Backend: http://localhost:5000 (or your configured port)
echo Frontend: http://localhost:5173
echo ==========================================
echo.
