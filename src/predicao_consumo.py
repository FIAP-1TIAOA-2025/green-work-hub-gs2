"""
============================================================================
SCRIPT DE PREDIÇÃO - CONSUMO ENERGÉTICO MENSAL
============================================================================
Script auxiliar para fazer predições usando o modelo treinado.
============================================================================
"""

import pandas as pd
import numpy as np
import joblib
import json
import sys
import os
from datetime import datetime

def carregar_modelo_e_preprocessadores():
    """Carrega o modelo e preprocessadores salvos"""
    # Obter diretório base do projeto (um nível acima de src/)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    
    try:
        # Tentar carregar o melhor modelo (tentar vários nomes possíveis)
        modelo = None
        modelo_nome = None
        
        # Lista de possíveis nomes de modelos
        possiveis_modelos = [
            ('modelo_consumo_mensal_random_forest_regressor.pkl', 'Random Forest'),
            ('modelo_consumo_mensal_gradient_boosting_regressor.pkl', 'Gradient Boosting'),
            ('modelo_consumo_mensal_linear_regression.pkl', 'Linear Regression'),
            ('modelo_consumo_mensal_ridge_regression.pkl', 'Ridge Regression'),
            ('modelo_consumo_mensal_lasso_regression.pkl', 'Lasso Regression')
        ]
        
        for arquivo, nome in possiveis_modelos:
            caminho = os.path.join(models_dir, arquivo)
            if os.path.exists(caminho):
                modelo = joblib.load(caminho)
                modelo_nome = nome
                break
        
        if modelo is None:
            raise FileNotFoundError("Nenhum modelo encontrado. Execute ml_consumo_mensal.py primeiro.")
        
        # Carregar preprocessadores
        scaler_path = os.path.join(models_dir, 'scaler.pkl')
        le_site_path = os.path.join(models_dir, 'label_encoder_site.pkl')
        le_device_path = os.path.join(models_dir, 'label_encoder_device.pkl')
        features_path = os.path.join(models_dir, 'features.json')
        
        if not all(os.path.exists(p) for p in [scaler_path, le_site_path, le_device_path, features_path]):
            raise FileNotFoundError("Arquivos de preprocessamento não encontrados.")
        
        scaler = joblib.load(scaler_path)
        le_site = joblib.load(le_site_path)
        le_device = joblib.load(le_device_path)
        
        with open(features_path, 'r') as f:
            features = json.load(f)
        
        return modelo, modelo_nome, scaler, le_site, le_device, features
    except Exception as e:
        print(f"Erro ao carregar modelo: {e}")
        print(f"Procurando modelos em: {models_dir}")
        print("Certifique-se de que o modelo foi treinado primeiro executando:")
        print("  python3 src/ml_consumo_mensal.py")
        sys.exit(1)


def preparar_features(mes, site_id, device_type, temp_ext, eh_fds, 
                     eh_horario_comercial, kw_mes_anterior, kwh_mes_anterior, 
                     kw_ma3, le_site, le_device):
    """Prepara as features para predição"""
    
    # Features temporais
    mes_sin = np.sin(2 * np.pi * mes / 12)
    mes_cos = np.cos(2 * np.pi * mes / 12)
    
    # Encodings
    try:
        site_encoded = le_site.transform([site_id])[0]
    except:
        # Se site não visto, usar 0
        site_encoded = 0
    
    try:
        device_encoded = le_device.transform([device_type])[0]
    except:
        # Se device não visto, usar 0
        device_encoded = 0
    
    # Criar DataFrame com features
    features_dict = {
        'mes_sin': [mes_sin],
        'mes_cos': [mes_cos],
        'temp_ext': [temp_ext],
        'eh_fds': [eh_fds],
        'eh_horario_comercial': [eh_horario_comercial],
        'is_anomaly': [0],  # Assumir sem anomalias
        'kw_lag1': [kw_mes_anterior],
        'kwh_lag1': [kwh_mes_anterior],
        'kw_ma3': [kw_ma3],
        'site_id_encoded': [site_encoded],
        'device_type_encoded': [device_encoded]
    }
    
    return pd.DataFrame(features_dict)


def prever_consumo_mensal(mes, site_id, device_type, temp_ext=None, 
                         eh_fds=0.3, eh_horario_comercial=0.4,
                         kw_mes_anterior=0, kwh_mes_anterior=0, kw_ma3=0):
    """
    Faz predição de consumo mensal
    
    Parâmetros:
    -----------
    mes : int
        Mês para predição (1-12)
    site_id : str
        ID do site (ex: 'site_centro', 'site_zonasul')
    device_type : str
        Tipo de dispositivo (ex: 'HVAC', 'ILUMINACAO', 'TOMADAS', 'TI')
    temp_ext : float, optional
        Temperatura externa média esperada. Se None, usa média histórica (26°C)
    eh_fds : float, optional
        Proporção de finais de semana (0-1). Default: 0.3
    eh_horario_comercial : float, optional
        Proporção de horário comercial (0-1). Default: 0.4
    kw_mes_anterior : float, optional
        Consumo do mês anterior em kW. Default: 0
    kwh_mes_anterior : float, optional
        Energia do mês anterior em kWh. Default: 0
    kw_ma3 : float, optional
        Média móvel de 3 meses em kW. Default: 0
    
    Retorna:
    --------
    float : Predição de consumo mensal em kW
    """
    
    # Carregar modelo e preprocessadores
    modelo, modelo_nome, scaler, le_site, le_device, features = \
        carregar_modelo_e_preprocessadores()
    
    # Usar temperatura padrão se não fornecida
    if temp_ext is None:
        temp_ext = 26.0  # Média histórica
    
    # Preparar features
    X_pred = preparar_features(
        mes, site_id, device_type, temp_ext, eh_fds, 
        eh_horario_comercial, kw_mes_anterior, kwh_mes_anterior, 
        kw_ma3, le_site, le_device
    )
    
    # Fazer predição
    if 'Linear' in modelo_nome or 'Ridge' in modelo_nome or 'Lasso' in modelo_nome:
        X_pred_scaled = scaler.transform(X_pred)
        predicao = modelo.predict(X_pred_scaled)[0]
    else:
        predicao = modelo.predict(X_pred)[0]
    
    return max(0, predicao)  # Garantir valor não negativo


if __name__ == "__main__":
    print("=" * 80)
    print("PREDIÇÃO DE CONSUMO ENERGÉTICO MENSAL")
    print("=" * 80)
    
    # Exemplo de uso
    print("\nExemplos de predição:")
    print("-" * 80)
    
    # Exemplo 1: HVAC em site_centro, mês 2 (fevereiro)
    pred1 = prever_consumo_mensal(
        mes=2,
        site_id='site_centro',
        device_type='HVAC',
        temp_ext=28.0,
        kw_mes_anterior=5000,
        kwh_mes_anterior=120000,
        kw_ma3=4800
    )
    print(f"\n1. HVAC - site_centro - Fevereiro:")
    print(f"   Predição: {pred1:.2f} kW")
    
    # Exemplo 2: ILUMINACAO em site_zonasul, mês 3 (março)
    pred2 = prever_consumo_mensal(
        mes=3,
        site_id='site_zonasul',
        device_type='ILUMINACAO',
        temp_ext=27.0,
        kw_mes_anterior=800,
        kwh_mes_anterior=20000,
        kw_ma3=750
    )
    print(f"\n2. ILUMINACAO - site_zonasul - Março:")
    print(f"   Predição: {pred2:.2f} kW")
    
    # Exemplo 3: TI em site_centro, mês 6 (junho)
    pred3 = prever_consumo_mensal(
        mes=6,
        site_id='site_centro',
        device_type='TI',
        temp_ext=24.0,
        kw_mes_anterior=1500,
        kwh_mes_anterior=36000,
        kw_ma3=1400
    )
    print(f"\n3. TI - site_centro - Junho:")
    print(f"   Predição: {pred3:.2f} kW")
    
    print("\n" + "=" * 80)
    print("Para usar em seu código:")
    print("=" * 80)
    print("""
from src.predicao_consumo import prever_consumo_mensal

predicao = prever_consumo_mensal(
    mes=2,
    site_id='site_centro',
    device_type='HVAC',
    temp_ext=28.0,
    kw_mes_anterior=5000,
    kwh_mes_anterior=120000,
    kw_ma3=4800
)
print(f"Consumo previsto: {predicao:.2f} kW")
    """)

