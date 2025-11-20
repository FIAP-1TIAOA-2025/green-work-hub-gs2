"""
============================================================================
SCRIPT DE VERIFICAÇÃO DE CONEXÃO COM BANCO DE DADOS
============================================================================
Verifica se a conexão com PostgreSQL está funcionando
============================================================================
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Carregar variáveis de ambiente
load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'greenworkhub')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

print("=" * 80)
print("VERIFICAÇÃO DE CONEXÃO COM POSTGRESQL")
print("=" * 80)
print(f"\nConfiguração:")
print(f"  Host: {DB_HOST}")
print(f"  Port: {DB_PORT}")
print(f"  Database: {DB_NAME}")
print(f"  User: {DB_USER}")
print()

# Tentar conectar
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

try:
    print("Tentando conectar...")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"✓ Conexão bem-sucedida!")
        print(f"\nVersão do PostgreSQL: {version}")
        
        # Verificar se o banco existe
        result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :db_name"), {"db_name": DB_NAME})
        if result.fetchone():
            print(f"✓ Banco de dados '{DB_NAME}' existe")
        else:
            print(f"⚠️  Banco de dados '{DB_NAME}' não existe")
            print(f"   Execute: createdb {DB_NAME}")
        
        # Verificar se a tabela existe
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'energy_readings'
            );
        """))
        if result.fetchone()[0]:
            print(f"✓ Tabela 'energy_readings' existe")
            
            # Contar registros
            result = conn.execute(text("SELECT COUNT(*) FROM energy_readings"))
            count = result.fetchone()[0]
            print(f"✓ Total de registros: {count:,}")
        else:
            print(f"⚠️  Tabela 'energy_readings' não existe (será criada automaticamente)")
        
except OperationalError as e:
    error_msg = str(e)
    print(f"✗ Erro de conexão: {error_msg}")
    print()
    
    if "role" in error_msg.lower() and "does not exist" in error_msg.lower():
        print("=" * 80)
        print("SOLUÇÃO: Configurar usuário do PostgreSQL")
        print("=" * 80)
        print()
        print("O usuário 'postgres' não existe. No macOS, o usuário padrão")
        print("geralmente é o seu nome de usuário do sistema.")
        print()
        print("Opções:")
        print()
        print("1. Usar seu usuário do sistema:")
        print(f"   Edite o arquivo .env e altere:")
        print(f"   DB_USER={os.getenv('USER', 'seu_usuario')}")
        print()
        print("2. Criar o usuário 'postgres':")
        print("   createuser -s postgres")
        print()
        print("3. Verificar usuários existentes:")
        print("   psql -l")
        print()
    elif "password authentication failed" in error_msg.lower():
        print("=" * 80)
        print("SOLUÇÃO: Verificar senha")
        print("=" * 80)
        print()
        print("A senha está incorreta. Verifique o arquivo .env")
        print()
    elif "could not connect" in error_msg.lower():
        print("=" * 80)
        print("SOLUÇÃO: Verificar se PostgreSQL está rodando")
        print("=" * 80)
        print()
        print("O PostgreSQL não está rodando ou não está acessível.")
        print()
        print("Para iniciar (macOS com Homebrew):")
        print("  brew services start postgresql")
        print()
        print("Ou:")
        print("  pg_ctl -D /usr/local/var/postgres start")
        print()
    else:
        print("Verifique:")
        print("  1. PostgreSQL está instalado e rodando")
        print("  2. Credenciais no arquivo .env estão corretas")
        print("  3. Banco de dados existe")
    
    sys.exit(1)

print()
print("=" * 80)
print("✓ Verificação concluída com sucesso!")
print("=" * 80)

