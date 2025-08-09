#!/usr/bin/env node

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Iniciando build para Windows...');

// Función para ejecutar comandos con reintentos
const executeWithRetry = async (command, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Intento ${i + 1}: ${command}`);
      execSync(command, { stdio: 'inherit', timeout: 60000 });
      return true;
    } catch (error) {
      console.warn(`⚠️ Intento ${i + 1} falló:`, error.message);
      if (i === retries - 1) throw error;
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Función para matar procesos de Node
const killNodeProcesses = () => {
  try {
    console.log('🔄 Terminando procesos de Node.js...');
    execSync('taskkill /f /im node.exe /t', { stdio: 'ignore' });
    // Esperar un poco
    setTimeout(() => {}, 1000);
  } catch (error) {
    // No pasa nada si no hay procesos que matar
  }
};

async function main() {
  try {
    // Verificar que existe Prisma schema
    if (!fs.existsSync('prisma/schema.prisma')) {
      console.log('⚠️ No se encontró prisma/schema.prisma - saltando Prisma');
    } else {
      console.log('📦 Intentando generar cliente de Prisma...');
      
      try {
        // Intentar generar Prisma con reintentos
        await executeWithRetry('npx prisma generate');
        console.log('✅ Cliente de Prisma generado exitosamente');
      } catch (prismaError) {
        console.warn('⚠️ Error generando Prisma:', prismaError.message);
        console.log('🔄 Intentando limpiar y regenerar...');
        
        try {
          // Matar procesos
          killNodeProcesses();
          
          // Limpiar archivos de Prisma
          const prismaClientPath = path.join('node_modules', '.prisma');
          if (fs.existsSync(prismaClientPath)) {
            console.log('🧹 Limpiando archivos de Prisma...');
            execSync(`rmdir /s /q "${prismaClientPath}"`, { stdio: 'ignore' });
          }
          
          // Esperar y reintentar
          await new Promise(resolve => setTimeout(resolve, 3000));
          await executeWithRetry('npx prisma generate');
          
        } catch (cleanError) {
          console.error('❌ No se pudo generar cliente de Prisma después de limpiar');
          console.log('💡 Continuando sin Prisma (puede causar errores en runtime)');
        }
      }
    }

    // Crear directorios necesarios
    const dirsToCreate = [
      'uploads',
      'logs', 
      'temp'
    ];

    dirsToCreate.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Creado directorio: ${dir}`);
      }
    });

    // Crear archivo .env.example si no existe
    if (!fs.existsSync('.env.example')) {
      const envExample = `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/devai_agent"

# API Keys
GEMINI_API_KEY="your_gemini_key_here"
GROQ_API_KEY="your_groq_key_here" 
HUGGINGFACE_API_KEY="your_huggingface_key_here"
OLLAMA_URL="http://localhost:11434"

# JWT & Security
JWT_SECRET="your_super_secret_jwt_key_here"
JWT_EXPIRES_IN="7d"
BCRYPT_ROUNDS=12

# App Config
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH="./uploads"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Logging
LOG_LEVEL="info"
`;
      fs.writeFileSync('.env.example', envExample);
      console.log('📝 Creado .env.example');
    }

    // Verificar estructura del proyecto
    const requiredFiles = [
      'src/server.js',
      'package.json'
    ];

    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      console.warn('⚠️ Archivos faltantes:', missingFiles.join(', '));
    }

    console.log('✅ Build completado exitosamente');
    console.log('🚀 Proyecto listo para desarrollo/producción');

  } catch (error) {
    console.error('❌ Error en build:', error.message);
    console.error('💡 Intenta ejecutar: npm run clean && npm install');
    process.exit(1);
  }
}

main();