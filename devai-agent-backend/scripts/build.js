#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Iniciando build para producción...');

try {
  // Verificar que existe Prisma schema
  if (!fs.existsSync('prisma/schema.prisma')) {
    console.log('⚠️ No se encontró prisma/schema.prisma - continuando sin Prisma');
  } else {
    // Generar cliente de Prisma
    console.log('📦 Generando cliente de Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Cliente de Prisma generado');
  }

  // Verificar variables de entorno críticas
  const requiredEnvVars = [
    'NODE_ENV'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Variables de entorno faltantes:', missingVars.join(', '));
    console.warn('💡 Algunas funcionalidades pueden no funcionar correctamente');
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

# Redis (optional)
REDIS_URL="redis://localhost:6379"
`;
    fs.writeFileSync('.env.example', envExample);
    console.log('📝 Creado .env.example');
  }

  // Copiar archivos estáticos si existen
  if (fs.existsSync('src/public')) {
    console.log('📋 Copiando archivos estáticos...');
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    // En Windows usamos xcopy o robocopy
    if (process.platform === 'win32') {
      execSync('xcopy /E /I src\\public public', { stdio: 'inherit' });
    } else {
      execSync('cp -r src/public ./public', { stdio: 'inherit' });
    }
  }

  // Verificar estructura del proyecto
  const requiredDirs = ['src'];
  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  if (missingDirs.length > 0) {
    console.warn('⚠️ Directorios faltantes:', missingDirs.join(', '));
  }

  console.log('✅ Build completado exitosamente');
  console.log('🚀 Proyecto listo para producción');

} catch (error) {
  console.error('❌ Error en build:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}