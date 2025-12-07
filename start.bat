@echo off
echo ============================================
echo   Smart Tourist Safety System - Start Script
echo ============================================

echo.
echo Step 1: Starting MongoDB...
echo (Make sure MongoDB is installed and running)
echo.

echo Step 2: Starting Backend Server...
start cmd /k "cd backend && npm start"

timeout /t 5

echo.
echo Step 3: Starting ML Service...
echo Installing ML dependencies if needed...
cd backend\ml_model
call python -m pip install flask flask-cors scikit-learn pandas numpy --quiet
echo.
echo Starting ML API on port 5001...
start cmd /k "cd backend\ml_model && python anomaly_detector.py"

timeout /t 5

echo.
echo ============================================
echo   Services Status
echo ============================================
echo ✅ Backend API:    http://localhost:3000
echo ✅ ML Service:     http://localhost:5001
echo ✅ Frontend:       http://localhost:5173
echo.
echo 📊 Test Endpoints:
echo    • Backend:      curl http://localhost:3000
echo    • ML Health:    curl http://localhost:5001/health
echo    • ML Test:      curl -X POST http://localhost:3000/api/ml/detect ^
echo                     -H "Content-Type: application/json" ^
echo                     -d "{\"tourist_id\":\"test\",\"latitude\":28.6139,\"longitude\":77.2090}"
echo.
echo ============================================
echo Press any key to stop all services...
pause > nul

echo.
echo Stopping all services...
taskkill /f /im node.exe > nul 2>&1
taskkill /f /im python.exe > nul 2>&1
echo All services stopped.