#!/bin/bash
set -e

echo "=== Buildando imagens Docker ==="

echo "[1/2] Buildando backend..."
docker build -t automacoes-backend:latest ./backend

echo "[2/2] Buildando frontend..."
docker build -t automacoes-frontend:latest ./frontend

echo ""
echo "=== Build concluido ==="
echo "Imagens criadas:"
docker images | grep automacoes
echo ""
echo "Agora va no Portainer -> Stacks -> Add Stack"
echo "e use o docker-compose.yml deste repositorio."
