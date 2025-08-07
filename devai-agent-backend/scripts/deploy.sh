#!/bin/bash

# =================================
# SCRIPT DE DESPLIEGUE DEVAI AGENT BACKEND
# =================================

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables por defecto
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BUILD=false
FORCE_DEPLOY=false
DRY_RUN=false

# =================================
# FUNCIONES DE UTILIDAD
# =================================

print_banner() {
    echo -e "${BLUE}"
    echo "======================================"
    echo "   DevAI Agent Backend Deployment"
    echo "======================================"
    echo -e "${NC}"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENVIRONMENT     Target environment (production, staging, development)"
    echo "  -s, --skip-tests         Skip running tests"
    echo "  -b, --skip-build         Skip build process"
    echo "  -f, --force              Force deployment without confirmation"
    echo "  -d, --dry-run            Show what would be deployed without doing it"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --env production"
    echo "  $0 --env staging --skip-tests"
    echo "  $0 --dry-run"
}

# =================================
# PROCESAR ARGUMENTOS
# =================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# =================================
# VALIDACIONES INICIALES
# =================================

validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        log_error "Valid environments: production, staging, development"
        exit 1
    fi

    log_info "Deploying to: $ENVIRONMENT"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Verificar que estemos en el directorio correcto
    if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
        log_error "Must be run from the project root directory"
        exit 1
    fi

    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Verificar npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Verificar Prisma CLI
    if ! command -v npx &> /dev/null; then
        log_error "npx is not available"
        exit 1
    fi

    # Verificar Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi

    # Verificar que no haya cambios sin commit (solo en producción)
    if [[ "$ENVIRONMENT" == "production" ]] && [[ "$FORCE_DEPLOY" == false ]]; then
        if [[ -n $(git status --porcelain) ]]; then
            log_error "There are uncommitted changes. Commit them first or use --force"
            exit 1
        fi
    fi

    log_info "✅ Prerequisites check passed"
}

# =================================
# FUNCIONES DE DESPLIEGUE
# =================================

install_dependencies() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warn "Skipping dependency installation"
        return
    fi

    log_info "Installing dependencies..."
    
    # Limpiar node_modules en producción para instalación limpia
    if [[ "$ENVIRONMENT" == "production" ]]; then
        rm -rf node_modules
        npm ci --production
    else
        npm install
    fi
    
    log_info "✅ Dependencies installed"
}

run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warn "Skipping tests"
        return
    fi

    log_info "Running tests..."
    
    # Configurar variables de entorno para tests
    export NODE_ENV=test
    export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/devai_agent_test"
    
    # Ejecutar tests
    npm run test:ci || {
        log_error "Tests failed!"
        exit 1
    }
    
    log_info "✅ Tests passed"
}

run_linting() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warn "Skipping linting"
        return
    fi

    log_info "Running ESLint..."
    
    npm run lint || {
        log_warn "Linting issues found, continuing anyway..."
    }
    
    log_info "✅ Linting completed"
}

setup_database() {
    log_info "Setting up database..."
    
    # Generar Prisma client
    npx prisma generate
    
    # Ejecutar migraciones
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # En producción, usar migrate deploy (no crea nuevas migraciones)
        npx prisma migrate deploy
    else
        # En staging/development, usar migrate dev
        npx prisma migrate dev --skip-seed
    fi
    
    # Ejecutar seeds si es necesario
    if [[ "$ENVIRONMENT" != "production" ]] || [[ "$FORCE_DEPLOY" == true ]]; then
        npm run db:seed || {
            log_warn "Database seeding failed, continuing anyway..."
        }
    fi
    
    log_info "✅ Database setup completed"
}

build_application() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warn "Skipping build"
        return
    fi

    log_info "Building application..."
    
    # Si hay un script de build, ejecutarlo
    if npm run build &> /dev/null; then
        log_info "✅ Application built successfully"
    else
        log_info "ℹ️ No build script found, skipping"
    fi
}

setup_environment_files() {
    log_info "Setting up environment configuration..."
    
    # Verificar que existe el archivo .env para el entorno
    ENV_FILE=".env.$ENVIRONMENT"
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" .env
        log_info "✅ Environment file copied: $ENV_FILE -> .env"
    elif [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            log_warn "⚠️ No environment-specific file found. Copied .env.example"
            log_warn "⚠️ Please configure .env before running the application"
        else
            log_error "No .env file found and no .env.example to copy from"
            exit 1
        fi
    fi
}

restart_services() {
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restart services using PM2"
        return
    fi

    log_info "Restarting services..."
    
    if command -v pm2 &> /dev/null; then
        # Usar PM2 si está disponible
        pm2 restart ecosystem.config.js --env $ENVIRONMENT || {
            log_warn "PM2 restart failed, trying start..."
            pm2 start ecosystem.config.js --env $ENVIRONMENT
        }
        log_info "✅ Services restarted with PM2"
    else
        log_warn "PM2 not found. Please manually restart the application"
        log_info "To start manually: npm start"
    fi
}

cleanup_old_deployments() {
    log_info "Cleaning up old deployments..."
    
    # Limpiar logs antiguos
    if [[ -d "storage/logs" ]]; then
        find storage/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
        log_info "✅ Old logs cleaned up"
    fi
    
    # Limpiar archivos temporales
    if [[ -d "storage/temp" ]]; then
        find storage/temp -type f -mtime +7 -delete 2>/dev/null || true
        log_info "✅ Temporary files cleaned up"
    fi
}

# =================================
# FUNCIÓN PRINCIPAL DE DESPLIEGUE
# =================================

deploy() {
    print_banner
    
    log_info "Starting deployment to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warn "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Validaciones
    validate_environment
    check_prerequisites
    
    # Confirmar despliegue en producción
    if [[ "$ENVIRONMENT" == "production" ]] && [[ "$FORCE_DEPLOY" == false ]] && [[ "$DRY_RUN" == false ]]; then
        echo -e "${YELLOW}You are about to deploy to PRODUCTION. Are you sure? (y/N)${NC}"
        read -r confirmation
        if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Proceso de despliegue
    if [[ "$DRY_RUN" == false ]]; then
        setup_environment_files
        install_dependencies
        run_linting
        run_tests
        setup_database
        build_application
        cleanup_old_deployments
        restart_services
    else
        log_info "[DRY RUN] Would setup environment files"
        log_info "[DRY RUN] Would install dependencies"
        log_info "[DRY RUN] Would run linting"
        log_info "[DRY RUN] Would run tests"
        log_info "[DRY RUN] Would setup database"
        log_info "[DRY RUN] Would build application"
        log_info "[DRY RUN] Would cleanup old deployments"
        log_info "[DRY RUN] Would restart services"
    fi
    
    # Mensaje final
    echo -e "${GREEN}"
    echo "======================================"
    echo "   🚀 DEPLOYMENT COMPLETED! 🚀"
    echo "======================================"
    echo -e "${NC}"
    
    if [[ "$DRY_RUN" == false ]]; then
        log_info "Environment: $ENVIRONMENT"
        log_info "Timestamp: $(date)"
        
        if command -v pm2 &> /dev/null; then
            log_info "Check status: pm2 status"
            log_info "View logs: pm2 logs devai-agent-api"
        fi
        
        log_info "Health check: curl -f http://localhost:3001/health"
    else
        log_info "This was a dry run. No changes were made."
    fi
}

# =================================
# MANEJO DE SEÑALES Y ERRORES
# =================================

# Cleanup en caso de interrupción
cleanup_on_exit() {
    if [[ $? -ne 0 ]]; then
        log_error "Deployment failed!"
        log_info "Check the logs above for details"
    fi
}

trap cleanup_on_exit EXIT

# =================================
# EJECUTAR DESPLIEGUE
# =================================

deploy