// ============================================
// 🔴 REDIS CONFIGURATION
// ============================================

import Redis from 'ioredis';

/**
 * 🔧 Configuración de Redis
 */
const redisConfig = {
  // Configuración básica
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  
  // Configuración de conexión
  connectTimeout: 10000,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  
  // Configuración de retry
  retryConnect: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`🔄 Reintentando conexión Redis en ${delay}ms (intento ${times})`);
    return delay;
  },
  
  // Pool de conexiones
  family: 4,
  keepAlive: true,
  
  // Configuración específica por entorno
  ...(process.env.NODE_ENV === 'production' && {
    // Configuración adicional para producción
    connectTimeout: 5000,
    commandTimeout: 3000,
    maxRetriesPerRequest: 2
  })
};

/**
 * 🎯 Instancias de Redis
 */
let redisClient;
let redisSubscriber;
let redisPublisher;

/**
 * 🔗 Conectar a Redis
 */
export const connectRedis = async () => {
  try {
    console.log('🔴 Conectando a Redis...');
    
    // Cliente principal
    redisClient = new Redis(redisConfig);
    
    // Cliente para suscripciones (pub/sub)
    redisSubscriber = new Redis({
      ...redisConfig,
      db: redisConfig.db + 1 // Usar DB diferente para pub/sub
    });
    
    // Cliente para publicaciones
    redisPublisher = new Redis({
      ...redisConfig,
      db: redisConfig.db + 1
    });
    
    // Configurar eventos
    setupRedisEvents(redisClient, 'Client');
    setupRedisEvents(redisSubscriber, 'Subscriber');
    setupRedisEvents(redisPublisher, 'Publisher');
    
    // Verificar conexiones
    await Promise.all([
      redisClient.ping(),
      redisSubscriber.ping(),
      redisPublisher.ping()
    ]);
    
    console.log('✅ Redis conectado exitosamente');
    
    return { redisClient, redisSubscriber, redisPublisher };
    
  } catch (error) {
    console.error('❌ Error conectando a Redis:', error);
    throw new Error(`Redis connection failed: ${error.message}`);
  }
};

/**
 * 🚫 Desconectar Redis
 */
export const disconnectRedis = async () => {
  try {
    const connections = [redisClient, redisSubscriber, redisPublisher].filter(Boolean);
    
    await Promise.all(
      connections.map(async (client) => {
        if (client.status === 'ready') {
          await client.quit();
        } else {
          client.disconnect();
        }
      })
    );
    
    console.log('👋 Redis desconectado');
  } catch (error) {
    console.error('❌ Error desconectando Redis:', error);
  }
};

/**
 * 🔗 Configurar eventos de Redis
 */
const setupRedisEvents = (client, name) => {
  client.on('connect', () => {
    console.log(`🔴 Redis ${name} conectado`);
  });
  
  client.on('ready', () => {
    console.log(`✅ Redis ${name} listo`);
  });
  
  client.on('error', (error) => {
    console.error(`❌ Redis ${name} error:`, error);
  });
  
  client.on('close', () => {
    console.log(`🔴 Redis ${name} conexión cerrada`);
  });
  
  client.on('reconnecting', (time) => {
    console.log(`🔄 Redis ${name} reconectando en ${time}ms`);
  });
};

/**
 * 🏥 Verificar estado de salud de Redis
 */
export const checkRedisHealth = async () => {
  try {
    const startTime = Date.now();
    
    // Test básico de ping
    const pong = await redisClient.ping();
    const responseTime = Date.now() - startTime;
    
    // Obtener información del servidor
    const info = await redisClient.info();
    const lines = info.split('\r\n');
    const serverInfo = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key === 'redis_version' || key === 'used_memory_human' || key === 'connected_clients') {
          serverInfo[key] = value;
        }
      }
    });
    
    return {
      status: 'healthy',
      ping: pong,
      responseTime,
      info: serverInfo,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 🔧 Servicio de Cache
 */
export class CacheService {
  constructor(client = redisClient) {
    this.client = client;
    this.defaultTTL = parseInt(process.env.CACHE_TTL_MEDIUM) || 1800; // 30 minutos
  }
  
  /**
   * 📥 Obtener del cache
   */
  async get(key) {
    try {
      const value = await this.client.get(this.formatKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error obteniendo del cache:', error);
      return null;
    }
  }
  
  /**
   * 📤 Guardar en cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const formattedKey = this.formatKey(key);
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setex(formattedKey, ttl, serializedValue);
      } else {
        await this.client.set(formattedKey, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error('Error guardando en cache:', error);
      return false;
    }
  }
  
  /**
   * 🗑️ Eliminar del cache
   */
  async del(key) {
    try {
      await this.client.del(this.formatKey(key));
      return true;
    } catch (error) {
      console.error('Error eliminando del cache:', error);
      return false;
    }
  }
  
  /**
   * 🔍 Buscar keys por patrón
   */
  async keys(pattern) {
    try {
      return await this.client.keys(this.formatKey(pattern));
    } catch (error) {
      console.error('Error buscando keys:', error);
      return [];
    }
  }
  
  /**
   * 🧹 Limpiar cache por patrón
   */
  async clear(pattern = '*') {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Error limpiando cache:', error);
      return 0;
    }
  }
  
  /**
   * ⏰ Establecer expiración
   */
  async expire(key, ttl) {
    try {
      await this.client.expire(this.formatKey(key), ttl);
      return true;
    } catch (error) {
      console.error('Error estableciendo expiración:', error);
      return false;
    }
  }
  
  /**
   * 🔢 Incrementar contador
   */
  async incr(key, by = 1) {
    try {
      const formattedKey = this.formatKey(key);
      return await this.client.incrby(formattedKey, by);
    } catch (error) {
      console.error('Error incrementando contador:', error);
      return null;
    }
  }
  
  /**
   * 📋 Agregar a lista
   */
  async listPush(key, value) {
    try {
      const formattedKey = this.formatKey(key);
      await this.client.lpush(formattedKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error agregando a lista:', error);
      return false;
    }
  }
  
  /**
   * 📋 Obtener de lista
   */
  async listRange(key, start = 0, end = -1) {
    try {
      const formattedKey = this.formatKey(key);
      const values = await this.client.lrange(formattedKey, start, end);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      console.error('Error obteniendo de lista:', error);
      return [];
    }
  }
  
  /**
   * 🔧 Formatear key con prefijo
   */
  formatKey(key) {
    const prefix = process.env.NODE_ENV === 'test' ? 'devai:test:' : 'devai:';
    return `${prefix}${key}`;
  }
}

/**
 * 📢 Servicio de Pub/Sub
 */
export class PubSubService {
  constructor(publisher = redisPublisher, subscriber = redisSubscriber) {
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.subscriptions = new Map();
  }
  
  /**
   * 📤 Publicar mensaje
   */
  async publish(channel, message) {
    try {
      const serializedMessage = JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      });
      
      await this.publisher.publish(channel, serializedMessage);
      return true;
    } catch (error) {
      console.error('Error publicando mensaje:', error);
      return false;
    }
  }
  
  /**
   * 📥 Suscribirse a canal
   */
  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      
      this.subscriptions.set(channel, callback);
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            console.error('Error parseando mensaje:', error);
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error suscribiéndose:', error);
      return false;
    }
  }
  
  /**
   * 🚫 Desuscribirse de canal
   */
  async unsubscribe(channel) {
    try {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
      return true;
    } catch (error) {
      console.error('Error desuscribiéndose:', error);
      return false;
    }
  }
}

/**
 * 🔧 Instancia global del servicio de cache
 */
export const cache = new CacheService();

/**
 * 📢 Instancia global del servicio pub/sub
 */
export const pubsub = new PubSubService();

/**
 * 📊 Middleware para métricas de Redis
 */
export const redisMetricsMiddleware = () => {
  let cacheHits = 0;
  let cacheMisses = 0;
  
  return {
    middleware: (req, res, next) => {
      // Interceptar gets del cache
      const originalGet = cache.get;
      cache.get = async (...args) => {
        const result = await originalGet.apply(cache, args);
        if (result !== null) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
        return result;
      };
      
      next();
    },
    
    getMetrics: () => ({
      cacheHits,
      cacheMisses,
      hitRate: (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0
    }),
    
    resetMetrics: () => {
      cacheHits = 0;
      cacheMisses = 0;
    }
  };
};

// Exportar clientes
export { redisClient, redisSubscriber, redisPublisher };