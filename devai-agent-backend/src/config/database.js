// ============================================
// 🗄️ DATABASE CONFIGURATION
// ============================================

import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

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
export const connectDatabase = async () => {
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
export const disconnectDatabase = async () => {
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
export const checkDatabaseHealth = async () => {
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
export const getDatabaseStats = async () => {
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
