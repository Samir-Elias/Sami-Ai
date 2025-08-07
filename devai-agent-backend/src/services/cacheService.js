const logger = require('../config/logger');
const { CACHE_CONFIG } = require('../utils/constants');

// =================================
// SERVICIO DE CACHE
// =================================

class CacheService {
  constructor() {
    this.client = null;
    this.memoryCache = new Map();
    this.memoryTimeout = new Map();
    this.initialized = false;
    this.useRedis = false;
    
    this.initialize();
  }

  /**
   * Inicializar el servicio de cache
   */
  async initialize() {
    try {
      // Intentar conectar a Redis si está configurado
      if (process.env.REDIS_URL) {
        await this.connectRedis();
      } else {
        logger.info('🔄 Redis not configured, using in-memory cache');
        this.useRedis = false;
      }
      
      this.initialized = true;
      logger.info(`✅ Cache service initialized (${this.useRedis ? 'Redis' : 'Memory'})`);
      
      // Configurar limpieza automática del cache en memoria
      if (!this.useRedis) {
        this.setupMemoryCleanup();
      }
      
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      logger.info('🔄 Falling back to in-memory cache');
      this.useRedis = false;
      this.initialized = true;
    }
  }

  /**
   * Conectar a Redis
   */
  async connectRedis() {
    try {
      const Redis = require('redis');
      
      this.client = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: CACHE_CONFIG.REDIS.CONNECT_TIMEOUT,
          commandTimeout: CACHE_CONFIG.REDIS.COMMAND_TIMEOUT
        },
        retry_strategy: (times) => {
          if (times > CACHE_CONFIG.REDIS.RETRY_ATTEMPTS) {
            return null; // Stop retrying
          }
          return Math.min(times * CACHE_CONFIG.REDIS.RETRY_DELAY, 30000);
        }
      });

      // Manejar eventos de Redis
      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.fallbackToMemory();
      });

      this.client.on('connect', () => {
        logger.info('✅ Redis connected successfully');
        this.useRedis = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('⚠️ Redis disconnected');
        this.fallbackToMemory();
      });

      this.client.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      this.useRedis = true;

    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Fallback a cache en memoria
   */
  fallbackToMemory() {
    this.useRedis = false;
    logger.warn('⚠️ Falling back to in-memory cache');
  }

  /**
   * Configurar limpieza automática del cache en memoria
   */
  setupMemoryCleanup() {
    // Limpiar cache expirado cada 5 minutos
    setInterval(() => {
      this.cleanExpiredMemoryCache();
    }, 5 * 60 * 1000);
  }

  /**
   * Limpiar cache expirado en memoria
   */
  cleanExpiredMemoryCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expireTime] of this.memoryTimeout.entries()) {
      if (expireTime <= now) {
        this.memoryCache.delete(key);
        this.memoryTimeout.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned ${cleaned} expired cache entries from memory`);
    }
  }

  /**
   * Verificar si el servicio está listo
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Obtener valor del cache
   * @param {string} key - Clave del cache
   * @returns {Promise<any>} Valor del cache o null si no existe
   */
  async get(key) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        const value = await this.client.get(key);
        if (value) {
          try {
            return JSON.parse(value);
          } catch {
            return value; // Retornar string si no es JSON
          }
        }
        return null;
      } else {
        // Cache en memoria
        const expireTime = this.memoryTimeout.get(key);
        if (expireTime && expireTime <= Date.now()) {
          // Expirado
          this.memoryCache.delete(key);
          this.memoryTimeout.delete(key);
          return null;
        }
        
        return this.memoryCache.get(key) || null;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Establecer valor en el cache
   * @param {string} key - Clave del cache
   * @param {any} value - Valor a cachear
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<boolean>} True si se guardó correctamente
   */
  async set(key, value, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        await this.client.setEx(key, ttl, serializedValue);
        return true;
      } else {
        // Cache en memoria
        this.memoryCache.set(key, value);
        if (ttl > 0) {
          this.memoryTimeout.set(key, Date.now() + (ttl * 1000));
        }
        return true;
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Eliminar valor del cache
   * @param {string} key - Clave a eliminar
   * @returns {Promise<boolean>} True si se eliminó
   */
  async del(key) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        const result = await this.client.del(key);
        return result > 0;
      } else {
        // Cache en memoria
        const existed = this.memoryCache.has(key);
        this.memoryCache.delete(key);
        this.memoryTimeout.delete(key);
        return existed;
      }
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Verificar si una clave existe
   * @param {string} key - Clave a verificar
   * @returns {Promise<boolean>} True si existe
   */
  async exists(key) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        const result = await this.client.exists(key);
        return result > 0;
      } else {
        // Cache en memoria
        const expireTime = this.memoryTimeout.get(key);
        if (expireTime && expireTime <= Date.now()) {
          // Expirado
          this.memoryCache.delete(key);
          this.memoryTimeout.delete(key);
          return false;
        }
        return this.memoryCache.has(key);
      }
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Incrementar un contador
   * @param {string} key - Clave del contador
   * @param {number} increment - Valor a incrementar (default: 1)
   * @param {number} ttl - TTL para la clave si no existe
   * @returns {Promise<number>} Nuevo valor del contador
   */
  async incr(key, increment = 1, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        let newValue;
        if (increment === 1) {
          newValue = await this.client.incr(key);
        } else {
          newValue = await this.client.incrBy(key, increment);
        }
        
        // Establecer TTL si es la primera vez
        if (newValue === increment) {
          await this.client.expire(key, ttl);
        }
        
        return newValue;
      } else {
        // Cache en memoria
        const currentValue = this.memoryCache.get(key) || 0;
        const newValue = currentValue + increment;
        
        this.memoryCache.set(key, newValue);
        if (currentValue === 0 && ttl > 0) {
          this.memoryTimeout.set(key, Date.now() + (ttl * 1000));
        }
        
        return newValue;
      }
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Obtener múltiples valores
   * @param {Array<string>} keys - Array de claves
   * @returns {Promise<Object>} Objeto con clave-valor
   */
  async mget(keys) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      const result = {};

      if (this.useRedis && this.client) {
        const values = await this.client.mGet(keys);
        keys.forEach((key, index) => {
          if (values[index]) {
            try {
              result[key] = JSON.parse(values[index]);
            } catch {
              result[key] = values[index];
            }
          }
        });
      } else {
        // Cache en memoria
        for (const key of keys) {
          const value = await this.get(key);
          if (value !== null) {
            result[key] = value;
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Establecer múltiples valores
   * @param {Object} keyValues - Objeto con clave-valor
   * @param {number} ttl - TTL en segundos
   * @returns {Promise<boolean>} True si se guardaron todos
   */
  async mset(keyValues, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        const pipeline = this.client.multi();
        
        for (const [key, value] of Object.entries(keyValues)) {
          const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
          pipeline.setEx(key, ttl, serializedValue);
        }
        
        await pipeline.exec();
        return true;
      } else {
        // Cache en memoria
        const expireTime = ttl > 0 ? Date.now() + (ttl * 1000) : null;
        
        for (const [key, value] of Object.entries(keyValues)) {
          this.memoryCache.set(key, value);
          if (expireTime) {
            this.memoryTimeout.set(key, expireTime);
          }
        }
        
        return true;
      }
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Limpiar cache por patrón
   * @param {string} pattern - Patrón de búsqueda (solo Redis)
   * @returns {Promise<number>} Número de claves eliminadas
   */
  async clear(pattern = null) {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        if (pattern) {
          const keys = await this.client.keys(pattern);
          if (keys.length > 0) {
            await this.client.del(keys);
            return keys.length;
          }
          return 0;
        } else {
          await this.client.flushDb();
          return 1; // Retornar 1 para indicar que se limpió
        }
      } else {
        // Cache en memoria
        let count = 0;
        if (pattern) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
              this.memoryCache.delete(key);
              this.memoryTimeout.delete(key);
              count++;
            }
          }
        } else {
          count = this.memoryCache.size;
          this.memoryCache.clear();
          this.memoryTimeout.clear();
        }
        return count;
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Obtener información del cache
   * @returns {Promise<Object>} Información del cache
   */
  async info() {
    try {
      if (!this.isReady()) {
        await this.initialize();
      }

      if (this.useRedis && this.client) {
        const info = await this.client.info();
        const dbsize = await this.client.dbSize();
        
        return {
          type: 'redis',
          connected: true,
          keys: dbsize,
          info: info
        };
      } else {
        return {
          type: 'memory',
          connected: true,
          keys: this.memoryCache.size,
          memoryUsage: process.memoryUsage().heapUsed
        };
      }
    } catch (error) {
      logger.error('Cache info error:', error);
      return {
        type: this.useRedis ? 'redis' : 'memory',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Cerrar conexiones
   */
  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('✅ Cache service connections closed');
      }
    } catch (error) {
      logger.error('Error closing cache service:', error);
    }
  }

  /**
   * Health check del servicio de cache
   * @returns {Promise<boolean>} True si está saludable
   */
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return false;
      }

      const testKey = 'health:check:' + Date.now();
      const testValue = 'ok';
      
      await this.set(testKey, testValue, 10); // TTL de 10 segundos
      const retrieved = await this.get(testKey);
      await this.del(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }
}

// Exportar instancia única del servicio
module.exports = new CacheService();