@echo off
echo 🚀 Iniciando DevAI Agent (React + Backend)...
echo.

REM Verificar que existe la carpeta del backend
if not exist "devai-agent-backend" (
    echo ❌ Error: No se encuentra "devai agent backend"
    pause
    exit /b 1
)

REM Verificar que existe package.json (confirmar que estamos en la raíz del React)
if not exist "package.json" (
    echo ❌ Error: No se encuentra package.json - ejecuta desde la raíz del proyecto React
    pause
    exit /b 1
)

REM Verificar que existe src (carpeta típica de React)
if not exist "src" (
    echo ❌ Error: No se encuentra carpeta src - ejecuta desde la raíz del proyecto React
    pause
    exit /b 1
)

echo ✅ Estructura del proyecto verificada
echo.

REM Iniciar Backend
echo 🔧 Iniciando Backend (Puerto 5000)...
start "DevAI Backend" cmd /k "cd ""devai-agent-backend"" && npm run dev"

REM Esperar 3 segundos
echo ⚡ Esperando que el backend inicie...
timeout /t 5 /nobreak > nul

REM Iniciar Frontend React  
echo ⚛️ Iniciando Frontend React (Puerto 3000)...
start "DevAI Frontend" cmd /k "npm start"

echo.
echo ✅ Ambos servidores iniciándose:
echo 📱 React Frontend: http://localhost:3000
echo 🔧 Express Backend: http://localhost:5000
echo.
echo 💡 Espera unos segundos a que ambos terminen de cargar
echo    Luego abre http://localhost:3000 en tu navegador
echo.
echo Presiona cualquier tecla para cerrar este script...
pause > nul