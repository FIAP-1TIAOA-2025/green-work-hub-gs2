#!/bin/bash

# Script para iniciar a API FastAPI

echo "=========================================="
echo "GREEN WORK HUB API - Iniciando..."
echo "=========================================="

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📝 Criando .env a partir do env.example..."
    cp env.example .env
    echo "✓ Arquivo .env criado. Por favor, edite com suas credenciais do PostgreSQL"
    echo ""
fi

# Verificar se as dependências estão instaladas
echo "🔍 Verificando dependências..."
python3 -c "import fastapi, uvicorn, sqlalchemy, psycopg2" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Instalando dependências..."
    pip3 install -r requirements.txt
fi

# Iniciar a API
echo ""
echo "🚀 Iniciando servidor..."
echo "📍 API disponível em: http://localhost:8000"
echo "📚 Documentação: http://localhost:8000/docs"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

