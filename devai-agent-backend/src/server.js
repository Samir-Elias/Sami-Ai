require('dotenv').config();

const app = require('./app');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');

// =================================
// CONFIGURACIONES INICIALES
// =================================

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// =================================
// FUNCIÓN DE INICIALIZACIÓN
// =================================

async function startServer() {
  try {
    logger.info('🚀 Starting DevAI Agent Backend...');
    
    // 1. Verificar variables de entorno requeridas
    await validateEnvironment();
    
    // 2. Conectar a la base de datos
    logger.info('📊 Connecting to database...');
    await connectDatabase();
    logger.info('✅ Database connected successfully');
    
    // 3. Conectar a Redis (opcional, no falla si no está disponible)
    try {
      logger.info('🔄 Connecting to Redis...');
      await connectRedis();
      logger.info('✅ Redis connected successfully');
    } catch (redisError) {
      logger.warn('⚠️ Redis connection failed, continuing without cache:', redisError.message);
    }
    
    // 4. Inicializar servicios adicionales
    await initializeServices();
    
    // 5. Iniciar el servidor HTTP
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🌟 Server running on ${HOST}:${PORT}`);
      logger.info(`📖 Environment: ${NODE_ENV}`);
      logger.info(`🔗 Health check: http://${HOST}:${PORT}/health`);
      logger.info(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`);
      logger.info('='.repeat(50));
    });

    // Configurar timeouts del servidor
    server.keepAliveTimeout = 65000; // 65 segundos
    server.headersTimeout = 66000; // 66 segundos
    
    // 6. Configurar manejo de cierre graceful
    setupGracefulShutdown(server);
    
    return server;
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// =================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// =================================

async function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('❌ Missing required environment variables:', missingVars);
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }

  // Validaciones adicionales
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️ JWT_SECRET should be at least 32 characters long');
  }

  logger.info('✅ Environment variables validated');
}

// =================================
// INICIALIZACIÓN DE SERVICIOS
// =================================

async function initializeServices() {
  try {
    logger.info('🔧 Initializing additional services...');
    
    // Aquí puedes agregar inicialización de otros servicios
    // Por ejemplo: conectar a servicios de IA, websockets, etc.
    
    // Ejemplo de inicialización de servicios de IA
    if (process.env.GEMINI_API_KEY) {
      logger.info('🤖 Gemini AI service available');
    }
    
    if (process.env.GROQ_API_KEY) {
      logger.info('⚡ Groq AI service available');
    }
    
    if (process.env.HUGGINGFACE_API_KEY) {
      logger.info('🤗 HuggingFace service available');
    }
    
    if (process.env.OLLAMA_URL) {
      logger.info('🦙 Ollama service available');
    }
    
    // Verificar directorios de almacenamiento
    await ensureStorageDirectories();
    
    logger.info('✅ Additional services initialized');
    
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

// =================================
// CONFIGURACIÓN DE DIRECTORIOS
// =================================

async function ensureStorageDirectories() {
  const fs = require('fs').promises;
  const path = require('path');
  
  const storageDirectories = [
    'storage/uploads',
    'storage/uploads/code',
    'storage/uploads/images', 
    'storage/uploads/documents',
    'storage/uploads/archives',
    'storage/temp',
    'storage/logs',
    'storage/backups'
  ];
  
  for (const dir of storageDirectories) {
    const fullPath = path.join(__dirname, '..', dir);
    try {
      await fs.access(fullPath);
    } catch {
      await fs.mkdir(fullPath, { recursive: true });
      logger.info(`📁 Created directory: ${dir}`);
    }
  }
}

// =================================
// MANEJO DE CIERRE GRACEFUL
// =================================

function setupGracefulShutdown(server) {
  const gracefulShutdown = async (signal) => {
    logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Cerrar servidor HTTP
    server.close(async () => {
      logger.info('🔒 HTTP server closed');
      
      try {
        // Cerrar conexiones de base de datos
        const { disconnectDatabase } = require('./config/database');
        await disconnectDatabase();
        logger.info('📊 Database connection closed');
        
        // Cerrar conexión de Redis
        const { disconnectRedis } = require('./config/redis');
        await disconnectRedis();
        logger.info('🔄 Redis connection closed');
        
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
        
      } catch (error) {
        logger.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
    
    // Forzar cierre después de 30 segundos
    setTimeout(() => {
      logger.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
  
  // Escuchar señales del sistema
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Manejo de errores no capturados
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// =================================
// INICIAR SERVIDOR
// =================================

// Solo iniciar el servidor si este archivo se ejecuta directamente
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('💥 Fatal error during startup:', error);
    process.exit(1);
  });
}

// Exportar para testing
module.exports = { startServer };