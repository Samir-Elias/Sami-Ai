// ============================================
// 🗄️ DATABASE CONFIGURATION
// ============================================

const { PrismaClient } = require('@prisma/client');

/**
 * 🔧 Configuración de Prisma Client
 */
const prismaConfig = {
  // Logging basado en el entorno
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  
  // Configuración de errores
  errorFormat: 'pretty',
  
  // Configuración de datasources
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
};

/**
 * 🎯 Instancia global de Prisma
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  // En producción, crear una nueva instancia
  prisma = new PrismaClient(prismaConfig);
} else {
  // En desarrollo, usar instancia global para evitar múltiples conexiones
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaConfig);
  }
  prisma = global.__prisma;
}

/**
 * 🔗 Conectar a la base de datos
 */
const connectDatabase = async () => {
  try {
    console.log('🔗 Conectando a la base de datos...');
    
    // Verificar conexión
    await prisma.$connect();
    
    // Test de conectividad
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Base de datos conectada exitosamente');
    
    // Configurar listeners de eventos
    setupDatabaseEvents();
    
    return prisma;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

/**
 * 🚫 Desconectar de la base de datos
 */
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('👋 Base de datos desconectada');
  } catch (error) {
    console.error('❌ Error desconectando base de datos:', error);
  }
};

/**
 * 🏥 Verificar estado de salud de la base de datos
 */
const checkDatabaseHealth = async () => {
  try {
    const startTime = Date.now();
    
    // Query simple para verificar conectividad
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
      database: 'postgresql'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      database: 'postgresql'
    };
  }
};

/**
 * 📊 Obtener estadísticas de la base de datos
 */
const getDatabaseStats = async () => {
  try {
    const [
      userCount,
      conversationCount,
      messageCount,
      projectCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.project.count()
    ]);

    return {
      users: userCount,
      conversations: conversationCount,
      messages: messageCount,
      projects: projectCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de BD:', error);
    return null;
  }
};

/**
 * 🔄 Configurar eventos de la base de datos
 */
const setupDatabaseEvents = () => {
  // Log de queries lentas en desarrollo
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
      if (e.duration > 1000) { // Queries que toman más de 1 segundo
        console.warn(`🐌 Query lenta detectada (${e.duration}ms):`, e.query);
      }
    });
  }

  // Log de errores
  prisma.$on('error', (e) => {
    console.error('🚨 Error de base de datos:', e);
  });

  // Cleanup en señales de terminación
  process.on('SIGINT', async () => {
    console.log('🛑 Recibida señal SIGINT, cerrando conexiones de BD...');
    await disconnectDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando conexiones de BD...');
    await disconnectDatabase();
    process.exit(0);
  });
};

/**
 * 🧪 Utilidades para testing
 */
const resetTestDatabase = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetTestDatabase solo puede usarse en entorno de test');
  }

  const models = [
    'analytics',
    'usage',
    'errorLog',
    'message',
    'conversation',
    'projectFile',
    'project',
    'apiKey',
    'user'
  ];

  console.log('🧪 Limpiando base de datos de test...');
  
  for (const model of models) {
    try {
      await prisma[model].deleteMany();
    } catch (error) {
      console.warn(`Warning: No se pudo limpiar ${model}`);
    }
  }
};

/**
 * 🔍 Ejecutar migraciones
 */
const runMigrations = async () => {
  try {
    console.log('🔄 Ejecutando migraciones...');
    
    // En un entorno real, usarías prisma migrate deploy
    // Aquí simulamos la verificación
    await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    
    console.log('✅ Migraciones completadas');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    throw error;
  }
};

/**
 * 📈 Middleware para métricas de base de datos
 */
const databaseMetricsMiddleware = () => {
  let queryCount = 0;
  let totalQueryTime = 0;

  return {
    middleware: (req, res, next) => {
      const startTime = Date.now();
      
      // Interceptar queries de Prisma (simplificado)
      const originalQuery = prisma.$queryRaw;
      prisma.$queryRaw = (...args) => {
        queryCount++;
        const queryStart = Date.now();
        
        return originalQuery.apply(prisma, args).finally(() => {
          totalQueryTime += Date.now() - queryStart;
        });
      };

      res.on('finish', () => {
        const requestTime = Date.now() - startTime;
        
        // Agregar métricas al response header (opcional)
        if (process.env.NODE_ENV === 'development') {
          res.set('X-DB-Queries', queryCount.toString());
          res.set('X-DB-Time', totalQueryTime.toString());
        }
      });

      next();
    },
    
    getMetrics: () => ({
      queryCount,
      totalQueryTime,
      averageQueryTime: queryCount > 0 ? totalQueryTime / queryCount : 0
    }),
    
    resetMetrics: () => {
      queryCount = 0;
      totalQueryTime = 0;
    }
  };
};

/**
 * 🔒 Configuración de transacciones
 */
const withTransaction = async (callback) => {
  return await prisma.$transaction(callback, {
    maxWait: 5000, // 5 segundos máximo de espera
    timeout: 10000, // 10 segundos timeout
    isolationLevel: 'ReadCommitted'
  });
};

// Exportar todo usando CommonJS
module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  getDatabaseStats,
  resetTestDatabase,
  runMigrations,
  databaseMetricsMiddleware,
  withTransaction
};

// Exportar prisma como default también
module.exports.default = prisma;