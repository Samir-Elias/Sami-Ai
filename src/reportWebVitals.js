// ============================================
// 📊 WEB VITALS REPORTING - MEJORADO
// ============================================

/**
 * Reporta métricas de rendimiento de Web Vitals
 * @param {Function} onPerfEntry - Callback para manejar métricas
 */
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Core Web Vitals
      getCLS(onPerfEntry);  // Cumulative Layout Shift
      getFID(onPerfEntry);  // First Input Delay
      getLCP(onPerfEntry);  // Largest Contentful Paint
      
      // Otras métricas importantes
      getFCP(onPerfEntry);  // First Contentful Paint
      getTTFB(onPerfEntry); // Time to First Byte
    }).catch(error => {
      console.warn('Error cargando web-vitals:', error);
    });
  }
};

/**
 * Configuración personalizada para DevAI Agent
 * @param {Object} options - Opciones de configuración
 */
export const reportWebVitalsEnhanced = (options = {}) => {
  const {
    enableConsoleLogging = process.env.NODE_ENV === 'development',
    enableAnalytics = false,
    thresholds = {
      CLS: 0.1,    // Cumulative Layout Shift
      FID: 100,    // First Input Delay (ms)
      LCP: 2500,   // Largest Contentful Paint (ms)
      FCP: 1800,   // First Contentful Paint (ms)
      TTFB: 800    // Time to First Byte (ms)
    }
  } = options;

  const handlePerfEntry = (metric) => {
    // Log en desarrollo
    if (enableConsoleLogging) {
      const { name, value, rating } = metric;
      const threshold = thresholds[name];
      const status = getMetricStatus(value, threshold, name);
      
      console.group(`📊 Web Vital: ${name}`);
      console.log(`📈 Valor: ${formatMetricValue(value, name)}`);
      console.log(`⭐ Rating: ${rating}`);
      console.log(`🎯 Estado: ${status.emoji} ${status.message}`);
      if (threshold) {
        console.log(`🎯 Umbral: ${formatMetricValue(threshold, name)}`);
      }
      console.groupEnd();
    }

    // Enviar a analytics si está habilitado
    if (enableAnalytics && window.gtag) {
      window.gtag('event', name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        non_interaction: true
      });
    }

    // Almacenar métricas en localStorage para debugging
    if (enableConsoleLogging) {
      try {
        const existingMetrics = JSON.parse(localStorage.getItem('devai-web-vitals') || '[]');
        existingMetrics.push({
          ...metric,
          timestamp: new Date().toISOString(),
          url: window.location.pathname
        });
        
        // Mantener solo las últimas 50 métricas
        if (existingMetrics.length > 50) {
          existingMetrics.splice(0, existingMetrics.length - 50);
        }
        
        localStorage.setItem('devai-web-vitals', JSON.stringify(existingMetrics));
      } catch (error) {
        console.warn('Error guardando métricas Web Vitals:', error);
      }
    }
  };

  return reportWebVitals(handlePerfEntry);
};

/**
 * Obtener estado de una métrica basado en umbrales
 * @param {number} value - Valor de la métrica
 * @param {number} threshold - Umbral de la métrica
 * @param {string} metricName - Nombre de la métrica
 * @returns {Object} Estado de la métrica
 */
const getMetricStatus = (value, threshold, metricName) => {
  if (!threshold) {
    return { emoji: '📊', message: 'Sin umbral definido' };
  }

  // Para CLS, menor es mejor
  if (metricName === 'CLS') {
    if (value <= 0.1) return { emoji: '🟢', message: 'Excelente' };
    if (value <= 0.25) return { emoji: '🟡', message: 'Necesita mejora' };
    return { emoji: '🔴', message: 'Pobre' };
  }

  // Para otras métricas, menor es mejor
  if (value <= threshold * 0.75) return { emoji: '🟢', message: 'Excelente' };
  if (value <= threshold) return { emoji: '🟡', message: 'Bueno' };
  if (value <= threshold * 1.5) return { emoji: '🟠', message: 'Necesita mejora' };
  return { emoji: '🔴', message: 'Pobre' };
};

/**
 * Formatear valor de métrica para mostrar
 * @param {number} value - Valor a formatear
 * @param {string} metricName - Nombre de la métrica
 * @returns {string} Valor formateado
 */
const formatMetricValue = (value, metricName) => {
  switch (metricName) {
    case 'CLS':
      return value.toFixed(3);
    case 'FID':
    case 'LCP':
    case 'FCP':
    case 'TTFB':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
};

/**
 * Obtener métricas almacenadas para debugging
 * @returns {Array} Métricas almacenadas
 */
export const getStoredMetrics = () => {
  try {
    return JSON.parse(localStorage.getItem('devai-web-vitals') || '[]');
  } catch (error) {
    console.warn('Error leyendo métricas almacenadas:', error);
    return [];
  }
};

/**
 * Limpiar métricas almacenadas
 */
export const clearStoredMetrics = () => {
  try {
    localStorage.removeItem('devai-web-vitals');
    console.log('📊 Métricas Web Vitals limpiadas');
  } catch (error) {
    console.warn('Error limpiando métricas:', error);
  }
};

/**
 * Generar reporte de rendimiento
 * @returns {Object} Reporte de rendimiento
 */
export const generatePerformanceReport = () => {
  const metrics = getStoredMetrics();
  if (metrics.length === 0) {
    return {
      isEmpty: true,
      message: 'No hay métricas disponibles'
    };
  }

  // Agrupar por tipo de métrica
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) acc[metric.name] = [];
    acc[metric.name].push(metric);
    return acc;
  }, {});

  // Calcular promedios y estadísticas
  const report = {
    totalMeasurements: metrics.length,
    timeRange: {
      from: new Date(metrics[0].timestamp).toLocaleString(),
      to: new Date(metrics[metrics.length - 1].timestamp).toLocaleString()
    },
    metrics: {}
  };

  Object.entries(groupedMetrics).forEach(([name, values]) => {
    const nums = values.map(v => v.value);
    report.metrics[name] = {
      count: values.length,
      average: nums.reduce((a, b) => a + b, 0) / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
      latest: values[values.length - 1],
      trend: calculateTrend(nums)
    };
  });

  return report;
};

/**
 * Calcular tendencia de una serie de valores
 * @param {Array} values - Valores numéricos
 * @returns {string} Tendencia ('up', 'down', 'stable')
 */
const calculateTrend = (values) => {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const difference = Math.abs(secondAvg - firstAvg);
  const threshold = firstAvg * 0.05; // 5% threshold
  
  if (difference < threshold) return 'stable';
  return secondAvg > firstAvg ? 'up' : 'down';
};

/**
 * Función para uso en desarrollo - mostrar métricas en consola
 */
export const logPerformanceReport = () => {
  const report = generatePerformanceReport();
  
  if (report.isEmpty) {
    console.log('📊 No hay métricas de rendimiento disponibles');
    return;
  }

  console.group('📊 DevAI Agent - Reporte de Rendimiento');
  console.log(`📈 Total de mediciones: ${report.totalMeasurements}`);
  console.log(`⏰ Rango: ${report.timeRange.from} - ${report.timeRange.to}`);
  
  Object.entries(report.metrics).forEach(([name, data]) => {
    console.group(`${name} (${data.count} mediciones)`);
    console.log(`📊 Promedio: ${formatMetricValue(data.average, name)}`);
    console.log(`📉 Mínimo: ${formatMetricValue(data.min, name)}`);
    console.log(`📈 Máximo: ${formatMetricValue(data.max, name)}`);
    console.log(`🔄 Tendencia: ${getTrendEmoji(data.trend)} ${data.trend}`);
    console.groupEnd();
  });
  
  console.groupEnd();
};

/**
 * Obtener emoji para tendencia
 * @param {string} trend - Tendencia
 * @returns {string} Emoji correspondiente
 */
const getTrendEmoji = (trend) => {
  const emojis = {
    'up': '⬆️',
    'down': '⬇️',
    'stable': '➡️'
  };
  return emojis[trend] || '❓';
};

// Exponer funciones globalmente en desarrollo
if (process.env.NODE_ENV === 'development') {
  window.devaiPerf = {
    getMetrics: getStoredMetrics,
    clearMetrics: clearStoredMetrics,
    generateReport: generatePerformanceReport,
    logReport: logPerformanceReport
  };
  
  console.log('🔧 DevAI Performance tools available at window.devaiPerf');
}

export default reportWebVitals;