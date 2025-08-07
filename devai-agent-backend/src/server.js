require('dotenv').config();

const app = require('./app');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');

// =================================
// CONFIGURACIONES INICIALES
// =================================

const PORT = process.env.PORT || 5000; // Cambiar a puerto 5000 como muestran los logs
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
    
    // 5. CRÍTICO: Verificar que las rutas estén registradas
    const routes = app._router ? app._router.stack.length : 0;
    logger.info(`🛣️ Routes registered: ${routes}`);
    
    // 6. Iniciar el servidor HTTP
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🌟 Server running on ${HOST}:${PORT}`);
      logger.info(`📖 Environment: ${NODE_ENV}`);
      logger.info(`🔗 Health check: http://${HOST}:${PORT}/health`);
      logger.info(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`);
      logger.info('='.repeat(50));
      
      // Debug: Listar rutas registradas
      if (NODE_ENV === 'development') {
        listRegisteredRoutes(app);
      }
    });

    // 7. Configurar timeouts del servidor
    server.keepAliveTimeout = 65000; // 65 segundos
    server.headersTimeout = 66000; // 66 segundos
    
    // 8. IMPORTANTE: Test inmediato de rutas críticas
    setTimeout(() => testCriticalRoutes(), 2000);
    
    // 9. Configurar manejo de cierre graceful
    setupGracefulShutdown(server);
    
    return server;
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// =================================
// VALIDACIÓN DE VARIABLES DE ENTORNO (SIMPLIFICADA)
// =================================

async function validateEnvironment() {
  // Hacer validaciones opcionales para desarrollo
  const optionalVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'GROQ_API_KEY'
  ];

  const presentVars = optionalVars.filter(varName => process.env[varName]);
  const missingVars = optionalVars.filter(varName => !process.env[varName]);
  
  if (presentVars.length > 0) {
    logger.info('✅ Present environment variables:', presentVars);
  }
  
  if (missingVars.length > 0) {
    logger.warn('⚠️ Missing optional environment variables:', missingVars);
    logger.info('💡 Running in development mode with mocked services');
  }

  logger.info('✅ Environment validation completed');
}

// =================================
// INICIALIZACIÓN DE SERVICIOS
// =================================

async function initializeServices() {
  try {
    logger.info('🔧 Initializing additional services...');
    
    // Verificar servicios de IA disponibles
    const services = {
      gemini: !!process.env.GEMINI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY,
      ollama: await checkOllamaService()
    };
    
    // Log de servicios disponibles
    Object.entries(services).forEach(([service, available]) => {
      const icon = getServiceIcon(service);
      const status = available ? 'available' : 'simulated';
      logger.info(`${icon} ${service.charAt(0).toUpperCase() + service.slice(1)} AI service ${status}`);
    });
    
    // Verificar directorios de almacenamiento
    await ensureStorageDirectories();
    
    logger.info('✅ Additional services initialized');
    
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    // No lanzar error, continuar con servicios simulados
    logger.warn('⚠️ Continuing with simulated services');
  }
}

// =================================
// FUNCIONES AUXILIARES
// =================================

function getServiceIcon(service) {
  const icons = {
    gemini: '🤖',
    groq: '⚡',
    huggingface: '🤗',
    ollama: '🦙'
  };
  return icons[service] || '🔧';
}

async function checkOllamaService() {
  try {
    const response = await fetch('http://localhost:11434/api/version', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =================================
// DEBUG: LISTAR RUTAS REGISTRADAS
// =================================

function listRegisteredRoutes(app) {
  logger.info('📋 Registered routes:');
  
  if (!app._router || !app._router.stack) {
    logger.warn('⚠️ No routes found in app._router.stack');
    return;
  }
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Ruta directa
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      logger.info(`  ${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Router middleware
      logger.info(`  Router middleware: ${middleware.regexp}`);
      
      if (middleware.handle && middleware.handle.stack) {
        middleware.handle.stack.forEach((route) => {
          if (route.route) {
            const methods = Object.keys(route.route.methods).join(', ').toUpperCase();
            const path = middleware.regexp.source.replace('\\', '') + route.route.path;
            logger.info(`    ${methods} ${path}`);
          }
        });
      }
    }
  });
}

// =================================
// TEST DE RUTAS CRÍTICAS
// =================================

async function testCriticalRoutes() {
  const testRoutes = [
    { method: 'GET', path: '/health', description: 'Health check' },
    { method: 'GET', path: '/api-docs', description: 'API documentation' },
    { method: 'GET', path: '/', description: 'Root endpoint' }
  ];
  
  logger.info('🧪 Testing critical routes...');
  
  for (const route of testRoutes) {
    try {
      const url = `http://localhost:${PORT}${route.path}`;
      const response = await fetch(url, {
        method: route.method,
        signal: AbortSignal.timeout(5000)
      });
      
      const status = response.ok ? '✅' : '❌';
      logger.info(`${status} ${route.method} ${route.path} - ${response.status} (${route.description})`);
      
    } catch (error) {
      logger.error(`❌ ${route.method} ${route.path} - ERROR: ${error.message}`);
    }
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
  
  try {
    for (const dir of storageDirectories) {
      const fullPath = path.join(__dirname, '..', dir);
      try {
        await fs.access(fullPath);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
        logger.info(`📁 Created directory: ${dir}`);
      }
    }
  } catch (error) {
    logger.warn('⚠️ Could not create storage directories:', error.message);
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
        try {
          const { disconnectDatabase } = require('./config/database');
          await disconnectDatabase();
          logger.info('📊 Database connection closed');
        } catch (error) {
          logger.warn('⚠️ Database disconnect error:', error.message);
        }
        
        // Cerrar conexión de Redis
        try {
          const { disconnectRedis } = require('./config/redis');
          await disconnectRedis();
          logger.info('🔄 Redis connection closed');
        } catch (error) {
          logger.warn('⚠️ Redis disconnect error:', error.message);
        }
        
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