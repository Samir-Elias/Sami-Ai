module.exports = {
  // Configuración de entorno
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  
  // Extensiones de configuraciones base
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended'
  ],
  
  // Plugins adicionales
  plugins: [
    'security',
    'node',
    'promise'
  ],
  
  // Parser options
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  
  // Configuración de reglas
  rules: {
    // Errores de sintaxis y lógica
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-keys': 'error',
    
    // Mejores prácticas
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-proto': 'error',
    'no-iterator': 'error',
    'no-extend-native': 'error',
    'no-with': 'error',
    
    // Estilo de código
    'indent': ['error', 2, { 
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1
    }],
    'quotes': ['error', 'single', { 
      avoidEscape: true,
      allowTemplateLiterals: true 
    }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', {
      arrays: 'never',
      objects: 'never',
      imports: 'never',
      exports: 'never',
      functions: 'never'
    }],
    'comma-spacing': ['error', { before: false, after: true }],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'space-before-blocks': ['error', 'always'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'space-unary-ops': ['error', { words: true, nonwords: false }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // Funciones y objetos
    'func-call-spacing': ['error', 'never'],
    'no-multi-spaces': 'error',
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'computed-property-spacing': ['error', 'never'],
    
    // Nombres y variables
    'camelcase': ['error', { properties: 'never' }],
    'new-cap': ['error', { 
      newIsCap: true,
      capIsNew: false,
      properties: true
    }],
    
    // Node.js específicas
    'node/no-unpublished-require': 'off',
    'node/no-missing-require': 'error',
    'node/no-extraneous-require': 'error',
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'error',
    
    // Promesas
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-native': 'off',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    
    // Seguridad
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    
    // Async/Await
    'require-atomic-updates': 'error',
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'warn',
    'no-return-await': 'error',
    
    // Imports/Exports
    'no-duplicate-imports': 'error'
  },
  
  // Configuraciones específicas por archivos
  overrides: [
    {
      // Configuración para archivos de test
      files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
      env: {
        jest: true,
        node: true
      },
      rules: {
        'no-console': 'off',
        'node/no-unpublished-require': 'off'
      }
    },
    
    {
      // Configuración para archivos de configuración
      files: [
        '*.config.js',
        '.eslintrc.js',
        'ecosystem.config.js',
        'vitest.config.js'
      ],
      rules: {
        'node/no-unpublished-require': 'off'
      }
    },
    
    {
      // Configuración para scripts
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'node/no-unpublished-require': 'off'
      }
    },
    
    {
      // Configuración para archivos de migración de Prisma
      files: ['prisma/**/*.js'],
      rules: {
        'no-console': 'off',
        'camelcase': 'off'
      }
    }
  ],
  
  // Ignorar archivos
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'storage/',
    '*.min.js',
    'prisma/migrations/',
    '.next/',
    '.nuxt/'
  ],
  
  // Configuración de globals
  globals: {
    process: 'readonly',
    global: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    console: 'readonly',
    module: 'readonly',
    require: 'readonly',
    exports: 'readonly'
  },
  
  // Configuración de reportes
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.json']
      }
    }
  }
};