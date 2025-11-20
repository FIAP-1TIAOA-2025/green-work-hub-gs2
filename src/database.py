"""
============================================================================
CONFIGURAÇÃO DO BANCO DE DADOS
============================================================================
Módulo para configuração e conexão com PostgreSQL
============================================================================
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do banco de dados
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'greenworkhub')
# No macOS, usar nome do usuário do sistema se DB_USER não estiver definido
DB_USER = os.getenv('DB_USER', os.getenv('USER', 'postgres'))
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

# String de conexão
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Criar engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Criar sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()


# ============================================================================
# MODELO DE DADOS
# ============================================================================

class EnergyReading(Base):
    """Modelo para leituras de energia"""
    __tablename__ = "energy_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    ts = Column(DateTime, nullable=False, index=True)
    org_id = Column(String(50), nullable=False, index=True)
    site_id = Column(String(50), nullable=False, index=True)
    andar = Column(Integer, nullable=False)
    device_id = Column(String(100), nullable=False, index=True)
    device_type = Column(String(50), nullable=False, index=True)
    kw = Column(Float, nullable=False)
    kwh_interval = Column(Float, nullable=False)
    emissoes_tco2e = Column(Float, nullable=False)
    temp_ext = Column(Float, nullable=False)
    eh_fds = Column(Boolean, nullable=False)
    eh_horario_comercial = Column(Boolean, nullable=False)
    is_anomaly = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def init_db():
    """Cria as tabelas no banco de dados"""
    Base.metadata.create_all(bind=engine)
    print("✓ Tabelas criadas no banco de dados")


def get_db():
    """Dependency para obter sessão do banco"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_data_exists():
    """Verifica se existem dados no banco"""
    db = SessionLocal()
    try:
        count = db.query(EnergyReading).count()
        return count > 0
    finally:
        db.close()


def get_data_count():
    """Retorna o número de registros no banco"""
    db = SessionLocal()
    try:
        return db.query(EnergyReading).count()
    finally:
        db.close()

