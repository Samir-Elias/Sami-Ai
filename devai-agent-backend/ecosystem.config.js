module.exports = {
  apps: [
    {
      // Aplicación principal
      name: 'devai-agent-api',
      script: 'src/server.js',
      instances: 'max', // Usar todos los CPU cores disponibles
      exec_mode: 'cluster',
      
      // Variables de entorno
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      
      // Configuración de producción
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      
      // Configuración de staging
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      
      // Configuración de reinicio automático
      autorestart: true,
      watch: false, // No watch en producción
      max_memory_restart: '1G',
      
      // Configuración de logs
      log_file: './storage/logs/pm2/combined.log',
      out_file: './storage/logs/pm2/out.log',
      error_file: './storage/logs/pm2/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configuración de reinicio
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Kill timeout
      kill_timeout: 1600,
      
      // Configuración avanzada
      node_args: '--max-old-space-size=1024',
      
      // Configuración de merge logs
      merge_logs: true,
      
      // Source map support
      source_map_support: false,
      
      // Configuración de cluster
      instance_var: 'INSTANCE_ID',
      
      // Configuración de watch (solo en desarrollo)
      ignore_watch: [
        'node_modules',
        'storage/logs',
        'storage/uploads',
        'storage/temp',
        'tests',
        'docs'
      ],
      
      // Configuración de time
      time: true
    }
  ],
  
  // Deploy configuration para diferentes ambientes
  deploy: {
    // Configuración de producción
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/devai-agent-backend.git',
      path: '/var/www/devai-agent-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && npx prisma generate && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    // Configuración de staging
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/devai-agent-backend.git',
      path: '/var/www/devai-agent-backend-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && npx prisma generate && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
};