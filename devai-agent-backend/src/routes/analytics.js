const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// Instanciar el controller
const analyticsController = new AnalyticsController();

// Middleware de autenticación para todas las rutas de analytics
router.use(auth);

// Rutas públicas (para usuarios autenticados)
/**
 * @route   GET /api/analytics/dashboard
 * @desc    Obtener métricas generales del dashboard
 * @access  Private
 */
router.get('/dashboard', 
    rateLimit(60, 100), // 100 requests per minute
    analyticsController.getDashboardMetrics.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/usage
 * @desc    Obtener estadísticas de uso por períodos
 * @query   period: day|week|month, metric: conversations|messages|users
 * @access  Private
 */
router.get('/usage',
    rateLimit(60, 50),
    analyticsController.getUsageStats.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/performance
 * @desc    Obtener estadísticas de rendimiento del sistema
 * @access  Private
 */
router.get('/performance',
    rateLimit(60, 30),
    analyticsController.getPerformanceStats.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/realtime
 * @desc    Obtener métricas en tiempo real
 * @access  Private
 */
router.get('/realtime',
    rateLimit(60, 200), // Higher limit for real-time data
    analyticsController.getRealTimeMetrics.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/user/:userId
 * @desc    Obtener estadísticas detalladas de un usuario específico
 * @access  Private (solo el propio usuario o admin)
 */
router.get('/user/:userId',
    rateLimit(60, 20),
    async (req, res, next) => {
        // Verificar que el usuario puede ver estas estadísticas
        const { userId } = req.params;
        const requestingUser = req.user;
        
        // Solo permitir ver sus propias estadísticas o si es admin
        if (requestingUser.id !== userId && requestingUser.role !== 'admin') {
            return res.status(403).json({ 
                error: 'No tienes permisos para ver estas estadísticas' 
            });
        }
        next();
    },
    analyticsController.getUserAnalytics.bind(analyticsController)
);

// Rutas administrativas (requieren permisos de admin)
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Se requieren permisos de administrador' 
        });
    }
    next();
};

/**
 * @route   POST /api/analytics/reports/custom
 * @desc    Generar reportes personalizados
 * @access  Admin only
 */
router.post('/reports/custom',
    adminAuth,
    rateLimit(60, 10), // Limited for heavy queries
    analyticsController.getCustomReport.bind(analyticsController)
);

/**
 * @route   GET /api/analytics/export
 * @desc    Exportar datos para reportes
 * @query   format: json|csv, table: conversations|messages|users, startDate, endDate, limit
 * @access  Admin only
 */
router.get('/export',
    adminAuth,
    rateLimit(60, 5), // Very limited for data exports
    analyticsController.exportData.bind(analyticsController)
);

/**
 * @route   DELETE /api/analytics/cache
 * @desc    Limpiar caché de analytics
 * @access  Admin only
 */
router.delete('/cache',
    adminAuth,
    rateLimit(60, 5),
    analyticsController.clearCache.bind(analyticsController)
);

// Rutas adicionales para análisis específicos

/**
 * @route   GET /api/analytics/trends
 * @desc    Obtener tendencias y predicciones
 * @access  Private
 */
router.get('/trends',
    rateLimit(60, 20),
    async (req, res) => {
        try {
            const { metric = 'conversations', period = 'week' } = req.query;
            
            // Esta sería una implementación básica de tendencias
            // Podrías integrar algoritmos más complejos aquí
            const analyticsController = new AnalyticsController();
            const pool = analyticsController.pool;
            
            let interval;
            switch (period) {
                case 'week':
                    interval = '7 days';
                    break;
                case 'month':
                    interval = '30 days';
                    break;
                default:
                    interval = '7 days';
            }
            
            const result = await pool.query(`
                WITH daily_counts AS (
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count
                    FROM ${metric}
                    WHERE created_at >= NOW() - INTERVAL '${interval}'
                    GROUP BY DATE(created_at)
                    ORDER BY date
                ),
                with_lag AS (
                    SELECT 
                        date,
                        count,
                        LAG(count) OVER (ORDER BY date) as prev_count
                    FROM daily_counts
                )
                SELECT 
                    date,
                    count,
                    CASE 
                        WHEN prev_count IS NULL THEN 0
                        WHEN prev_count = 0 THEN 0
                        ELSE ROUND(((count - prev_count) * 100.0 / prev_count), 2)
                    END as growth_rate
                FROM with_lag
                ORDER BY date
            `);
            
            const trend = result.rows;
            const avgGrowth = trend.reduce((acc, day) => acc + (day.growth_rate || 0), 0) / trend.length;
            
            res.json({
                metric,
                period,
                trend,
                averageGrowthRate: Math.round(avgGrowth * 100) / 100,
                prediction: avgGrowth > 0 ? 'increasing' : avgGrowth < 0 ? 'decreasing' : 'stable'
            });
            
        } catch (error) {
            console.error('Error getting trends:', error);
            res.status(500).json({ error: 'Error al obtener tendencias' });
        }
    }
);

/**
 * @route   GET /api/analytics/heatmap
 * @desc    Obtener datos para mapa de calor de actividad
 * @access  Private
 */
router.get('/heatmap',
    rateLimit(60, 30),
    async (req, res) => {
        try {
            const { days = 30 } = req.query;
            const analyticsController = new AnalyticsController();
            const pool = analyticsController.pool;
            
            const result = await pool.query(`
                SELECT 
                    EXTRACT(DOW FROM created_at) as day_of_week,
                    EXTRACT(HOUR FROM created_at) as hour,
                    COUNT(*) as activity_count
                FROM conversations
                WHERE created_at >= NOW() - INTERVAL '${days} days'
                GROUP BY 
                    EXTRACT(DOW FROM created_at),
                    EXTRACT(HOUR FROM created_at)
                ORDER BY day_of_week, hour
            `);
            
            // Formatear datos para el heatmap
            const heatmapData = Array(7).fill().map(() => Array(24).fill(0));
            
            result.rows.forEach(row => {
                const dayIndex = row.day_of_week; // 0 = Sunday, 6 = Saturday
                const hour = row.hour;
                heatmapData[dayIndex][hour] = parseInt(row.activity_count);
            });
            
            res.json({
                heatmapData,
                days: parseInt(days),
                maxActivity: Math.max(...result.rows.map(r => parseInt(r.activity_count)))
            });
            
        } catch (error) {
            console.error('Error getting heatmap data:', error);
            res.status(500).json({ error: 'Error al obtener datos de mapa de calor' });
        }
    }
);

/**
 * @route   GET /api/analytics/health
 * @desc    Health check para el servicio de analytics
 * @access  Public (para monitoreo)
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'analytics',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;