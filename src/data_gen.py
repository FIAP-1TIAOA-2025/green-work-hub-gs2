import numpy as np
import pandas as pd
from datetime import datetime

# =========================
# 1) CONFIGURAÇÃO GLOBAL
# =========================

np.random.seed(42)

ORG_ID = "org_greenhub"
SITES = [
    {"site_id": "site_centro", "nome": "Prédio Centro", "n_andares": 5},
    {"site_id": "site_zonasul", "nome": "Prédio Zona Sul", "n_andares": 3},
]

DEVICE_TYPES = {
    "HVAC": {"base_kw": 15.0},
    "ILUMINACAO": {"base_kw": 1.2},
    "TOMADAS": {"base_kw": 0.5},
    "TI": {"base_kw": 3.0},
}

# Fator de emissão do grid (kgCO2e/kWh) – valor fictício
FE_GRID = 0.08  # 80 gCO2e/kWh

# Período e frequência
START = "2025-01-01 00:00:00"
END   = "2025-01-15 23:59:59"
FREQ  = "15min"


# =========================
# 2) GERAR CALENDÁRIO BASE
# =========================

dt_index = pd.date_range(start=START, end=END, freq=FREQ)
df_time = pd.DataFrame({"ts": dt_index})
df_time["hora"] = df_time["ts"].dt.hour
df_time["minuto"] = df_time["ts"].dt.minute
df_time["dia_semana"] = df_time["ts"].dt.dayofweek  # 0=segunda, 6=domingo
df_time["eh_fds"] = df_time["dia_semana"].isin([5, 6]).astype(int)
df_time["eh_horario_comercial"] = (
    (df_time["hora"] >= 8) & (df_time["hora"] < 18)
).astype(int)

# Temperatura externa sintética (°C)
# Sazonalidade diária + ruído
dia_frac = (df_time["ts"].astype(np.int64) // 10**9) / (24 * 3600)
df_time["temp_ext"] = 26 + 4 * np.sin(2 * np.pi * dia_frac) + np.random.normal(0, 1.5, len(df_time))


# =========================
# 3) GERAR DISPOSITIVOS
# =========================

devices = []
for site in SITES:
    for andar in range(1, site["n_andares"] + 1):
        # quantidade aproximada de devices por tipo por andar
        for dev_type, cfg in DEVICE_TYPES.items():
            n_devices_tipo = {
                "HVAC": 2,
                "ILUMINACAO": 10,
                "TOMADAS": 8,
                "TI": 4,
            }[dev_type]
            for i in range(n_devices_tipo):
                devices.append({
                    "org_id": ORG_ID,
                    "site_id": site["site_id"],
                    "andar": andar,
                    "device_id": f"{site['site_id']}_F{andar}_{dev_type}_{i+1}",
                    "device_type": dev_type,
                    "base_kw": cfg["base_kw"] * np.random.uniform(0.8, 1.2)
                })

df_devices = pd.DataFrame(devices)


# =========================================
# 4) FUNÇÕES DE PERFIL DE CARGA (kW)
# =========================================

def curva_horaria(hora):
    """
    Curva diária em formato sino:
    pico por volta de 14h, mais baixo de madrugada.
    Retorna fator [0, 1.5]
    """
    # deslocar para ter pico por volta de 14h
    centro = 14
    largura = 6
    fator = np.exp(-((hora - centro) ** 2) / (2 * (largura ** 2)))
    # normalizar e escalar
    fator = fator / fator.max()  # max = 1
    return 0.3 + 1.2 * fator     # min ~0.3, max ~1.5


def fator_dia_semana(dia_semana):
    """
    Menor consumo em finais de semana.
    """
    if dia_semana >= 5:  # sábado/domingo
        return 0.5
    else:
        return 1.0


def fator_temp(temp, device_type):
    """
    Ajuste por temperatura externa.
    HVAC é sensível à temperatura; outros quase não.
    """
    if device_type == "HVAC":
        # quanto mais quente, mais consumo
        return 1.0 + 0.03 * max(0, temp - 24)
    else:
        return 1.0


# =========================================
# 5) GERAR SÉRIE SINTÉTICA POR DEVICE
# =========================================

rows = []

for _, dev in df_devices.iterrows():
    # para cada dispositivo, replicar df_time
    df_tmp = df_time.copy()
    df_tmp["org_id"] = dev["org_id"]
    df_tmp["site_id"] = dev["site_id"]
    df_tmp["andar"] = dev["andar"]
    df_tmp["device_id"] = dev["device_id"]
    df_tmp["device_type"] = dev["device_type"]
    df_tmp["base_kw_device"] = dev["base_kw"]
    
    # fatores
    df_tmp["f_hora"] = df_tmp["hora"].apply(curva_horaria)
    df_tmp["f_dia_semana"] = df_tmp["dia_semana"].apply(fator_dia_semana)
    df_tmp["f_temp"] = df_tmp["temp_ext"].apply(lambda t: fator_temp(t, dev["device_type"]))
    
    # HVAC/TI não é totalmente desligado fora do horário comercial; Iluminação/Tomadas sim
    if dev["device_type"] in ["ILUMINACAO", "TOMADAS"]:
        df_tmp["f_ocupacao"] = df_tmp["eh_horario_comercial"]
    else:
        df_tmp["f_ocupacao"] = 0.3 + 0.7 * df_tmp["eh_horario_comercial"]
    
    # Cálculo do kW esperado (sem ruído)
    df_tmp["kw_clean"] = (
        df_tmp["base_kw_device"] *
        df_tmp["f_hora"] *
        df_tmp["f_dia_semana"] *
        df_tmp["f_temp"] *
        df_tmp["f_ocupacao"]
    )
    
    # Adicionar ruído gaussiano
    noise = np.random.normal(0, df_tmp["kw_clean"].mean() * 0.05, size=len(df_tmp))
    df_tmp["kw"] = np.clip(df_tmp["kw_clean"] + noise, a_min=0, a_max=None)
    
    rows.append(df_tmp)

df_energy = pd.concat(rows, ignore_index=True)


# =========================================
# 6) INJETAR ANOMALIAS
# =========================================

df_energy["is_anomaly"] = 0

n_rows = len(df_energy)
n_anomalias = int(0.005 * n_rows)  # 0,5% das leituras, ajustável
idx_anomalia = np.random.choice(df_energy.index, size=n_anomalias, replace=False)

tipo_anomalia = np.random.choice(["pico", "queda"], size=n_anomalias)

for i, idx in enumerate(idx_anomalia):
    if tipo_anomalia[i] == "pico":
        df_energy.loc[idx, "kw"] *= np.random.uniform(2.0, 4.0)
    else:
        # queda brusca (quase zero) em horário que deveria ter consumo
        df_energy.loc[idx, "kw"] *= np.random.uniform(0.0, 0.1)
    df_energy.loc[idx, "is_anomaly"] = 1


# =========================================
# 7) CALCULAR kWh E EMISSÕES
# =========================================

# para intervalo de 15min
intervalo_horas = 15 / 60.0

df_energy["kwh_interval"] = df_energy["kw"] * intervalo_horas
df_energy["emissoes_kgco2e"] = df_energy["kwh_interval"] * FE_GRID
df_energy["emissoes_tco2e"] = df_energy["emissoes_kgco2e"] / 1000.0


# =========================================
# 8) EXPORTAR
# =========================================

# colunas finais úteis para ingest
cols_export = [
    "ts", "org_id", "site_id", "andar", "device_id", "device_type",
    "kw", "kwh_interval", "emissoes_tco2e", "temp_ext",
    "eh_fds", "eh_horario_comercial", "is_anomaly"
]

df_export = df_energy[cols_export].sort_values(["site_id", "andar", "device_id", "ts"])

df_export.to_csv("energy_readings_sinteticos.csv", index=False)
print("Arquivo gerado: energy_readings_sinteticos.csv")
print(df_export.head())
