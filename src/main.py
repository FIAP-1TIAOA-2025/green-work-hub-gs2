"""
============================================================================
BACKEND FASTAPI - GREEN WORK HUB
============================================================================
API REST para gerenciamento de dados de consumo energético
============================================================================
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
import os
import sys

# Adicionar src ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import (
    get_db, 
    check_data_exists, 
    get_data_count, 
    init_db,
    EnergyReading
)
import data_gen

# ============================================================================
# CONFIGURAÇÃO DA API
# ============================================================================

app = FastAPI(
    title="GREEN WORK HUB API",
    description="API para gerenciamento de dados de consumo energético",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# MODELOS PYDANTIC
# ============================================================================

class EnergyReadingResponse(BaseModel):
    id: int
    ts: datetime
    org_id: str
    site_id: str
    andar: int
    device_id: str
    device_type: str
    kw: float
    kwh_interval: float
    emissoes_tco2e: float
    temp_ext: float
    eh_fds: bool
    eh_horario_comercial: bool
    is_anomaly: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_records: int
    date_range: dict
    sites: List[str]
    device_types: List[str]
    total_consumption_kw: float
    total_consumption_kwh: float
    total_emissions_tco2e: float
    anomalies_count: int


# ============================================================================
# ROTAS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Inicializa o banco e verifica dados na inicialização"""
    print("=" * 80)
    print("INICIANDO GREEN WORK HUB API")
    print("=" * 80)
    
    # Criar tabelas se não existirem
    try:
        init_db()
        print("✓ Banco de dados inicializado")
    except Exception as e:
        print(f"✗ Erro ao inicializar banco: {e}")
        raise
    
    # Verificar se existem dados
    if not check_data_exists():
        print("\n⚠️  Nenhum dado encontrado no banco de dados")
        print("📊 Gerando dados sintéticos...")
        try:
            data_gen.salvar_no_banco()
            print("✓ Dados gerados e salvos com sucesso!")
        except Exception as e:
            print(f"✗ Erro ao gerar dados: {e}")
            raise
    else:
        count = get_data_count()
        print(f"✓ Banco de dados já contém {count:,} registros")


@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "GREEN WORK HUB API",
        "version": "1.0.0",
        "status": "online"
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Verifica saúde da API e banco de dados"""
    try:
        count = db.query(EnergyReading).count()
        return {
            "status": "healthy",
            "database": "connected",
            "total_records": count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


@app.get("/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Retorna estatísticas gerais dos dados"""
    # Total de registros
    total = db.query(EnergyReading).count()
    
    # Range de datas
    min_date = db.query(func.min(EnergyReading.ts)).scalar()
    max_date = db.query(func.max(EnergyReading.ts)).scalar()
    
    # Sites únicos
    sites = db.query(EnergyReading.site_id).distinct().all()
    sites = [s[0] for s in sites]
    
    # Tipos de dispositivos únicos
    device_types = db.query(EnergyReading.device_type).distinct().all()
    device_types = [d[0] for d in device_types]
    
    # Totais
    total_kw = db.query(func.sum(EnergyReading.kw)).scalar() or 0
    total_kwh = db.query(func.sum(EnergyReading.kwh_interval)).scalar() or 0
    total_emissions = db.query(func.sum(EnergyReading.emissoes_tco2e)).scalar() or 0
    
    # Anomalias
    anomalies = db.query(func.count(EnergyReading.id)).filter(
        EnergyReading.is_anomaly == True
    ).scalar()
    
    return StatsResponse(
        total_records=total,
        date_range={
            "min": min_date.isoformat() if min_date else None,
            "max": max_date.isoformat() if max_date else None
        },
        sites=sites,
        device_types=device_types,
        total_consumption_kw=float(total_kw),
        total_consumption_kwh=float(total_kwh),
        total_emissions_tco2e=float(total_emissions),
        anomalies_count=anomalies
    )


@app.get("/readings", response_model=List[EnergyReadingResponse])
async def get_readings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    site_id: Optional[str] = None,
    device_type: Optional[str] = None,
    device_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_anomaly: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Lista leituras de energia com filtros opcionais"""
    query = db.query(EnergyReading)
    
    # Aplicar filtros
    if site_id:
        query = query.filter(EnergyReading.site_id == site_id)
    if device_type:
        query = query.filter(EnergyReading.device_type == device_type)
    if device_id:
        query = query.filter(EnergyReading.device_id == device_id)
    if start_date:
        query = query.filter(EnergyReading.ts >= start_date)
    if end_date:
        query = query.filter(EnergyReading.ts <= end_date)
    if is_anomaly is not None:
        query = query.filter(EnergyReading.is_anomaly == is_anomaly)
    
    # Ordenar e paginar
    readings = query.order_by(desc(EnergyReading.ts)).offset(skip).limit(limit).all()
    
    return readings


@app.get("/readings/{reading_id}", response_model=EnergyReadingResponse)
async def get_reading(reading_id: int, db: Session = Depends(get_db)):
    """Obtém uma leitura específica por ID"""
    reading = db.query(EnergyReading).filter(EnergyReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Leitura não encontrada")
    return reading


@app.get("/readings/aggregate/daily")
async def get_daily_aggregate(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    site_id: Optional[str] = None,
    device_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Agrega consumo por dia"""
    # Aplicar filtros antes do group_by
    base_query = db.query(EnergyReading)
    
    if start_date:
        base_query = base_query.filter(func.date(EnergyReading.ts) >= start_date)
    if end_date:
        base_query = base_query.filter(func.date(EnergyReading.ts) <= end_date)
    if site_id:
        base_query = base_query.filter(EnergyReading.site_id == site_id)
    if device_type:
        base_query = base_query.filter(EnergyReading.device_type == device_type)
    
    # Agregação
    query = base_query.with_entities(
        func.date(EnergyReading.ts).label('date'),
        func.sum(EnergyReading.kw).label('total_kw'),
        func.sum(EnergyReading.kwh_interval).label('total_kwh'),
        func.sum(EnergyReading.emissoes_tco2e).label('total_emissions'),
        func.avg(EnergyReading.temp_ext).label('avg_temp')
    ).group_by(func.date(EnergyReading.ts))
    
    results = query.order_by('date').all()
    
    return [
        {
            "date": str(r.date),
            "total_kw": float(r.total_kw),
            "total_kwh": float(r.total_kwh),
            "total_emissions_tco2e": float(r.total_emissions),
            "avg_temp": float(r.avg_temp)
        }
        for r in results
    ]


@app.post("/generate-data")
async def generate_data(db: Session = Depends(get_db)):
    """Gera novos dados sintéticos e salva no banco"""
    try:
        data_gen.salvar_no_banco()
        count = get_data_count()
        return {
            "message": "Dados gerados com sucesso",
            "total_records": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar dados: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

