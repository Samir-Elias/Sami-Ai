import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Configuración del entorno de testing
    environment: 'node',
    
    // Globals disponibles en tests
    globals: true,
    
    // Timeout por defecto
    testTimeout: 60000, // 60 segundos para tests que incluyen DB
    hookTimeout: 60000, // 60 segundos para hooks
    
    // Archivos de setup
    setupFiles: [
      './tests/setup.js'
    ],
    
    // Patrones de archivos de test
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // Archivos a excluir
    exclude: [
      'node_modules',
      'dist',
      'build',
      'storage',
      'prisma/migrations',
      '.next',
      '.nuxt'
    ],
    
    // Configuración de cobertura
    coverage: {
      provider: 'v8', // o 'c8' si prefieres
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Archivos a incluir en cobertura
      include: [
        'src/**/*.{js,ts}',
        '!src/**/*.{test,spec}.{js,ts}',
        '!src/**/index.{js,ts}'
      ],
      
      // Archivos a excluir de cobertura
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        'dist/',
        'build/',
        'storage/',
        'prisma/',
        'scripts/',
        'docs/',
        '*.config.js',
        'src/server.js' // Archivo de entrada
      ],
      
      // Umbrales de cobertura
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      
      // Mostrar archivos sin cobertura
      skipFull: false,
      
      // Limpiar directorio de cobertura antes de ejecutar
      clean: true
    },
    
    // Pool de threads
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Configuración de reporters
    reporter: [
      'verbose', // Mostrar detalles en consola
      'json',    // Para CI/CD
      'html'     // Para revisión local
    ],
    
    // Directorio de salida para reports
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    },
    
    // Configuración de watch
    watch: true,
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'test-results/**',
      'storage/**'
    ],
    
    // Configuración para tests de base de datos
    testNamePattern: undefined,
    bail: 0, // Continuar ejecutando tests aunque fallen algunos
    
    // Configuración de mocking
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Configuración de isolación
    isolate: true,
    
    // Configuración de retry
    retry: 0, // No reintentar tests fallidos por defecto
    
    // Configuración de threads
    threads: true,
    
    // Configuración de snapshot
    resolveSnapshotPath: (testPath, snapExtension) => {
      return path.join(
        path.dirname(testPath),
        '__snapshots__',
        path.basename(testPath) + snapExtension
      );
    }
  },
  
  // Configuración de resolve para aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@config': path.resolve(__dirname, './src/config'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
      '@services': path.resolve(__dirname, './src/services'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@models': path.resolve(__dirname, './src/models')
    }
  },
  
  // Configuración de variables de entorno para tests
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  
  // Configuración de optimización
  optimizeDeps: {
    exclude: ['@prisma/client']
  },
  
  // Configuración de esbuild
  esbuild: {
    target: 'node18'
  }
});

// Configuración específica para diferentes tipos de tests
export const unitConfig = defineConfig({
  test: {
    ...defineConfig().test,
    name: 'unit',
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    testTimeout: 10000, // Tests unitarios más rápidos
    coverage: {
      ...defineConfig().test.coverage,
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});

export const integrationConfig = defineConfig({
  test: {
    ...defineConfig().test,
    name: 'integration',
    include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
    testTimeout: 30000, // Tests de integración más lentos
    setupFiles: [
      './tests/setup.js',
      './tests/integration/setup.js'
    ]
  }
});

export const e2eConfig = defineConfig({
  test: {
    ...defineConfig().test,
    name: 'e2e',
    include: ['tests/e2e/**/*.{test,spec}.{js,ts}'],
    testTimeout: 60000, // Tests E2E muy lentos
    setupFiles: [
      './tests/setup.js',
      './tests/e2e/setup.js'
    ]
  }
});