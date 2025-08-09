@echo off
echo 🧹 Limpiando proyecto para Windows...

REM Matar procesos de Node
echo 🔄 Terminando procesos de Node.js...
taskkill /f /im node.exe /t 2>nul

REM Esperar un poco
timeout /t 2 /nobreak >nul

REM Eliminar node_modules
echo 📁 Eliminando node_modules...
if exist node_modules rmdir /s /q node_modules

REM Eliminar archivos de lock
echo 📄 Eliminando archivos de bloqueo...
if exist package-lock.json del package-lock.json
if exist yarn.lock del yarn.lock

REM Eliminar cache de Prisma específicamente
echo 🗄️ Limpiando cache de Prisma...
if exist node_modules\.prisma rmdir /s /q node_modules\.prisma

REM Limpiar cache de npm
echo 🧽 Limpiando cache de npm...
npm cache clean --force

REM Eliminar directorios temporales
echo 🗑️ Limpiando directorios temporales...
if exist logs rmdir /s /q logs
if exist temp rmdir /s /q temp
if exist uploads\temp rmdir /s /q uploads\temp

echo ✅ Limpieza completada
echo 💡 Ahora ejecuta: npm install
pause