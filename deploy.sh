#!/bin/bash
set -e

APP_DIR="/opt/apps/automacoes-2"
ENV_FILE="$APP_DIR/.env"

echo "========================================="
echo "  DEPLOY - Jolu.ai (automacoes-2)"
echo "========================================="

# Load env vars
if [ -f "$ENV_FILE" ]; then
    export VITE_STRIPE_KEY=$(grep VITE_STRIPE_PUBLISHABLE_KEY "$ENV_FILE" | cut -d= -f2-)
    echo "[OK] .env loaded"
else
    echo "[ERRO] $ENV_FILE nao encontrado!"
    exit 1
fi

# Pull latest code
echo ""
echo "[1/5] Pulling latest code..."
cd "$APP_DIR"
git pull

# Build backend
echo ""
echo "[2/5] Building backend..."
docker build -t automacoes-backend:latest ./backend

# Build frontend
echo ""
echo "[3/5] Building frontend..."
docker build \
    --build-arg VITE_STRIPE_PUBLISHABLE_KEY="$VITE_STRIPE_KEY" \
    -t automacoes-frontend:latest \
    ./frontend

# Update services
echo ""
echo "[4/5] Updating backend service..."
docker service update --force automacoes_backend

echo ""
echo "[5/5] Updating frontend service..."
docker service update --force automacoes_frontend

# Verify
echo ""
echo "========================================="
echo "  Verificando services..."
echo "========================================="
sleep 5
docker service ls | grep automacoes

echo ""
echo "Deploy concluido!"
