"""
============================================================================
MODELO DE MACHINE LEARNING - PREDIÇÃO DE CONSUMO ENERGÉTICO MENSAL
============================================================================
Este script implementa modelos de regressão para prever o consumo energético
mensal com base em dados históricos de consumo.
============================================================================
"""

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Machine Learning
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

# Visualização
import matplotlib.pyplot as plt
import seaborn as sns

# Configuração
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")
np.random.seed(42)

print("=" * 80)
print("MODELO DE MACHINE LEARNING - PREDIÇÃO DE CONSUMO ENERGÉTICO MENSAL")
print("=" * 80)


# ============================================================================
# 1. CARREGAMENTO E PREPARAÇÃO DOS DADOS
# ============================================================================

print("\n[1/6] Carregando e preparando dados...")

# Carregar dados
import os
csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'energy_readings_sinteticos.csv')
df = pd.read_csv(csv_path)
df['ts'] = pd.to_datetime(df['ts'])

# Criar variáveis temporais
df['ano'] = df['ts'].dt.year
df['mes'] = df['ts'].dt.month
df['dia'] = df['ts'].dt.day
df['hora'] = df['ts'].dt.hour
df['dia_semana'] = df['ts'].dt.dayofweek
df['dia_ano'] = df['ts'].dt.dayofyear

print(f"Dataset carregado: {len(df):,} registros")
print(f"Período: {df['ts'].min()} a {df['ts'].max()}")


# ============================================================================
# 2. AGREGAÇÃO MENSAL (TARGET)
# ============================================================================

print("\n[2/6] Agregando dados mensais...")

# Agregar consumo mensal por site e tipo de dispositivo
consumo_mensal = df.groupby(['ano', 'mes', 'site_id', 'device_type']).agg({
    'kw': 'sum',  # Consumo total mensal em kW
    'kwh_interval': 'sum',  # Energia total mensal em kWh
    'emissoes_tco2e': 'sum',  # Emissões totais mensais
    'temp_ext': 'mean',  # Temperatura média mensal
    'eh_fds': 'mean',  # Proporção de finais de semana
    'eh_horario_comercial': 'mean',  # Proporção de horário comercial
    'is_anomaly': 'sum'  # Total de anomalias no mês
}).reset_index()

# Criar data do mês
consumo_mensal['data_mes'] = pd.to_datetime(
    consumo_mensal['ano'].astype(str) + '-' + 
    consumo_mensal['mes'].astype(str).str.zfill(2) + '-01'
)

print(f"Registros mensais criados: {len(consumo_mensal)}")
print(f"\nPrimeiras linhas:")
print(consumo_mensal.head())


# ============================================================================
# 3. FEATURE ENGINEERING
# ============================================================================

print("\n[3/6] Criando features para o modelo...")

# Criar dataset para modelagem
df_model = consumo_mensal.copy()

# Features temporais
df_model['mes_sin'] = np.sin(2 * np.pi * df_model['mes'] / 12)
df_model['mes_cos'] = np.cos(2 * np.pi * df_model['mes'] / 12)

# Features de lag (consumo do mês anterior)
df_model = df_model.sort_values(['site_id', 'device_type', 'data_mes'])
df_model['kw_lag1'] = df_model.groupby(['site_id', 'device_type'])['kw'].shift(1)
df_model['kwh_lag1'] = df_model.groupby(['site_id', 'device_type'])['kwh_interval'].shift(1)

# Média móvel (últimos 3 meses)
df_model['kw_ma3'] = df_model.groupby(['site_id', 'device_type'])['kw'].transform(
    lambda x: x.rolling(window=3, min_periods=1).mean()
)

# Preencher NaN de lag com a média do grupo (para primeira observação de cada série)
df_model['kw_lag1'] = df_model.groupby(['site_id', 'device_type'])['kw_lag1'].transform(
    lambda x: x.fillna(x.mean() if not x.isna().all() else 0)
)
df_model['kwh_lag1'] = df_model.groupby(['site_id', 'device_type'])['kwh_lag1'].transform(
    lambda x: x.fillna(x.mean() if not x.isna().all() else 0)
)

# Se ainda houver NaN, preencher com 0
df_model['kw_lag1'] = df_model['kw_lag1'].fillna(0)
df_model['kwh_lag1'] = df_model['kwh_lag1'].fillna(0)

# Features categóricas
le_site = LabelEncoder()
le_device = LabelEncoder()

df_model['site_id_encoded'] = le_site.fit_transform(df_model['site_id'])
df_model['device_type_encoded'] = le_device.fit_transform(df_model['device_type'])

# Verificar se há dados suficientes
if len(df_model) == 0:
    print("\n⚠️  AVISO: Dados insuficientes para treinamento!")
    print("   O dataset contém apenas um mês de dados.")
    print("   Para treinar o modelo, são necessários pelo menos 2 meses de dados.")
    print("   Gerando dados sintéticos adicionais...")
    
    # Gerar dados sintéticos adicionais para demonstração
    # (Em produção, isso viria de dados reais)
    import sys
    sys.exit("Por favor, gere mais dados ou use um dataset com múltiplos meses.")

# Selecionar features para o modelo
features = [
    'mes_sin', 'mes_cos',  # Sazonalidade
    'temp_ext',  # Temperatura média
    'eh_fds', 'eh_horario_comercial',  # Padrões temporais
    'is_anomaly',  # Anomalias
    'kw_lag1', 'kwh_lag1', 'kw_ma3',  # Features de lag e média móvel
    'site_id_encoded', 'device_type_encoded'  # Categóricas
]

X = df_model[features]
y = df_model['kw']  # Target: consumo mensal em kW

print(f"\nFeatures selecionadas: {len(features)}")
print(f"Features: {features}")
print(f"\nShape dos dados: X={X.shape}, y={y.shape}")
print(f"\nEstatísticas do target:")
print(y.describe())


# ============================================================================
# 4. DIVISÃO TREINO/TESTE
# ============================================================================

print("\n[4/6] Dividindo dados em treino e teste...")

# Dividir por data (últimos meses para teste)
df_model_sorted = df_model.sort_values('data_mes')
split_idx = int(len(df_model_sorted) * 0.8)

X_train = X.iloc[:split_idx]
X_test = X.iloc[split_idx:]
y_train = y.iloc[:split_idx]
y_test = y.iloc[split_idx:]

print(f"Treino: {len(X_train):,} amostras ({len(X_train)/len(X)*100:.1f}%)")
print(f"Teste: {len(X_test):,} amostras ({len(X_test)/len(X)*100:.1f}%)")

# Normalização (opcional para alguns modelos)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


# ============================================================================
# 5. TREINAMENTO DE MÚLTIPLOS MODELOS
# ============================================================================

print("\n[5/6] Treinando modelos de regressão...")

models = {
    'Linear Regression': LinearRegression(),
    'Ridge Regression': Ridge(alpha=1.0),
    'Lasso Regression': Lasso(alpha=1.0),
    'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42)
}

results = {}

for name, model in models.items():
    print(f"\nTreinando {name}...")
    
    # Usar dados normalizados para modelos lineares
    if 'Linear' in name or 'Ridge' in name or 'Lasso' in name:
        model.fit(X_train_scaled, y_train)
        y_pred_train = model.predict(X_train_scaled)
        y_pred_test = model.predict(X_test_scaled)
    else:
        model.fit(X_train, y_train)
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)
    
    # Métricas
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    train_mae = mean_absolute_error(y_train, y_pred_train)
    test_mae = mean_absolute_error(y_test, y_pred_test)
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    
    results[name] = {
        'model': model,
        'train_rmse': train_rmse,
        'test_rmse': test_rmse,
        'train_mae': train_mae,
        'test_mae': test_mae,
        'train_r2': train_r2,
        'test_r2': test_r2,
        'y_pred_test': y_pred_test
    }
    
    print(f"  RMSE (teste): {test_rmse:.2f}")
    print(f"  MAE (teste): {test_mae:.2f}")
    print(f"  R² (teste): {test_r2:.4f}")


# ============================================================================
# 6. SELEÇÃO DO MELHOR MODELO
# ============================================================================

print("\n" + "=" * 80)
print("COMPARAÇÃO DE MODELOS")
print("=" * 80)

# Criar DataFrame com resultados
comparison_df = pd.DataFrame({
    'Modelo': list(results.keys()),
    'RMSE Treino': [r['train_rmse'] for r in results.values()],
    'RMSE Teste': [r['test_rmse'] for r in results.values()],
    'MAE Treino': [r['train_mae'] for r in results.values()],
    'MAE Teste': [r['test_mae'] for r in results.values()],
    'R² Treino': [r['train_r2'] for r in results.values()],
    'R² Teste': [r['test_r2'] for r in results.values()]
})

comparison_df = comparison_df.sort_values('R² Teste', ascending=False)
print("\n", comparison_df.to_string(index=False))

# Selecionar melhor modelo (maior R² no teste)
best_model_name = comparison_df.iloc[0]['Modelo']
best_model = results[best_model_name]['model']
best_predictions = results[best_model_name]['y_pred_test']

print(f"\n✓ Melhor modelo: {best_model_name}")
print(f"  RMSE: {results[best_model_name]['test_rmse']:.2f}")
print(f"  MAE: {results[best_model_name]['test_mae']:.2f}")
print(f"  R²: {results[best_model_name]['test_r2']:.4f}")


# ============================================================================
# 7. ANÁLISE DE IMPORTÂNCIA DAS FEATURES (para modelos tree-based)
# ============================================================================

if hasattr(best_model, 'feature_importances_'):
    print("\n" + "=" * 80)
    print("IMPORTÂNCIA DAS FEATURES (Top 10)")
    print("=" * 80)
    
    feature_importance = pd.DataFrame({
        'feature': features,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n", feature_importance.head(10).to_string(index=False))
    
    # Gráfico de importância
    plt.figure(figsize=(10, 6))
    top_features = feature_importance.head(10)
    plt.barh(range(len(top_features)), top_features['importance'])
    plt.yticks(range(len(top_features)), top_features['feature'])
    plt.xlabel('Importância')
    plt.title(f'Top 10 Features Mais Importantes - {best_model_name}')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    graficos_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'graficos')
    os.makedirs(graficos_dir, exist_ok=True)
    plt.savefig(os.path.join(graficos_dir, 'ml_feature_importance.png'), dpi=150, bbox_inches='tight')
    print("\n✓ Gráfico salvo: graficos/ml_feature_importance.png")


# ============================================================================
# 8. VISUALIZAÇÕES
# ============================================================================

print("\n[6/6] Gerando visualizações...")

# Criar diretório de gráficos
graficos_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'graficos')
os.makedirs(graficos_dir, exist_ok=True)

# 8.1. Predições vs Valores Reais
fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Scatter plot
ax1 = axes[0]
ax1.scatter(y_test, best_predictions, alpha=0.5)
ax1.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
         'r--', lw=2, label='Predição Perfeita')
ax1.set_xlabel('Valor Real (kW)')
ax1.set_ylabel('Valor Predito (kW)')
ax1.set_title(f'Predições vs Valores Reais - {best_model_name}')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Resíduos
ax2 = axes[1]
residuos = y_test - best_predictions
ax2.scatter(best_predictions, residuos, alpha=0.5)
ax2.axhline(y=0, color='r', linestyle='--', lw=2)
ax2.set_xlabel('Valor Predito (kW)')
ax2.set_ylabel('Resíduos (Real - Predito)')
ax2.set_title('Análise de Resíduos')
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(graficos_dir, 'ml_predicoes_residuos.png'), dpi=150, bbox_inches='tight')
print("✓ Gráfico salvo: graficos/ml_predicoes_residuos.png")

# 8.2. Comparação de modelos
fig, ax = plt.subplots(figsize=(12, 6))
x_pos = np.arange(len(models))
width = 0.35

ax.bar(x_pos - width/2, comparison_df['R² Treino'], width, 
       label='R² Treino', alpha=0.8)
ax.bar(x_pos + width/2, comparison_df['R² Teste'], width, 
       label='R² Teste', alpha=0.8)

ax.set_xlabel('Modelo')
ax.set_ylabel('R² Score')
ax.set_title('Comparação de Modelos - R² Score')
ax.set_xticks(x_pos)
ax.set_xticklabels(comparison_df['Modelo'], rotation=45, ha='right')
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig(os.path.join(graficos_dir, 'ml_comparacao_modelos.png'), dpi=150, bbox_inches='tight')
print("✓ Gráfico salvo: graficos/ml_comparacao_modelos.png")

# 8.3. Série temporal de predições
if len(y_test) > 0:
    fig, ax = plt.subplots(figsize=(14, 6))
    
    # Ordenar por data para visualização
    test_indices = y_test.index
    test_dates = df_model.loc[test_indices, 'data_mes'].values
    
    # Criar índice para plotagem
    idx = np.arange(len(y_test))
    
    ax.plot(idx, y_test.values, label='Valor Real', marker='o', markersize=4, alpha=0.7)
    ax.plot(idx, best_predictions, label='Predição', marker='s', markersize=4, alpha=0.7)
    ax.set_xlabel('Amostra')
    ax.set_ylabel('Consumo Mensal (kW)')
    ax.set_title(f'Série Temporal: Predições vs Valores Reais - {best_model_name}')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(graficos_dir, 'ml_serie_temporal.png'), dpi=150, bbox_inches='tight')
    print("✓ Gráfico salvo: graficos/ml_serie_temporal.png")


# ============================================================================
# 9. SALVAR MODELO E PREPROCESSADORES
# ============================================================================

print("\n" + "=" * 80)
print("SALVANDO MODELO E ARQUIVOS")
print("=" * 80)

# Criar diretório para modelos
models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
os.makedirs(models_dir, exist_ok=True)

# Salvar melhor modelo
modelo_path = os.path.join(models_dir, f'modelo_consumo_mensal_{best_model_name.lower().replace(" ", "_")}.pkl')
joblib.dump(best_model, modelo_path)
print(f"✓ Modelo salvo: models/modelo_consumo_mensal_{best_model_name.lower().replace(' ', '_')}.pkl")

# Salvar scaler
scaler_path = os.path.join(models_dir, 'scaler.pkl')
joblib.dump(scaler, scaler_path)
print("✓ Scaler salvo: models/scaler.pkl")

# Salvar encoders
joblib.dump(le_site, os.path.join(models_dir, 'label_encoder_site.pkl'))
joblib.dump(le_device, os.path.join(models_dir, 'label_encoder_device.pkl'))
print("✓ Encoders salvos: models/label_encoder_*.pkl")

# Salvar lista de features
import json
features_path = os.path.join(models_dir, 'features.json')
with open(features_path, 'w') as f:
    json.dump(features, f)
print("✓ Features salvas: models/features.json")

# Salvar resultados
comparison_path = os.path.join(models_dir, 'comparacao_modelos.csv')
comparison_df.to_csv(comparison_path, index=False)
print("✓ Comparação de modelos salva: models/comparacao_modelos.csv")


# ============================================================================
# 10. PREDIÇÃO PARA PRÓXIMO MÊS (EXEMPLO)
# ============================================================================

print("\n" + "=" * 80)
print("EXEMPLO: PREDIÇÃO PARA PRÓXIMO MÊS")
print("=" * 80)

# Pegar último mês de cada combinação site/device
ultimo_mes = df_model.groupby(['site_id', 'device_type']).tail(1)

print(f"\nPredições para {len(ultimo_mes)} combinações site/device:")
print("-" * 80)

for idx, row in ultimo_mes.iterrows():
    # Preparar features para predição
    features_pred = pd.DataFrame({
        'mes_sin': [np.sin(2 * np.pi * (row['mes'] % 12 + 1) / 12)],
        'mes_cos': [np.cos(2 * np.pi * (row['mes'] % 12 + 1) / 12)],
        'temp_ext': [row['temp_ext']],  # Usar média histórica ou previsão
        'eh_fds': [row['eh_fds']],
        'eh_horario_comercial': [row['eh_horario_comercial']],
        'is_anomaly': [0],  # Assumir sem anomalias
        'kw_lag1': [row['kw']],
        'kwh_lag1': [row['kwh_interval']],
        'kw_ma3': [row['kw_ma3']],
        'site_id_encoded': [row['site_id_encoded']],
        'device_type_encoded': [row['device_type_encoded']]
    })
    
    # Fazer predição
    if 'Linear' in best_model_name or 'Ridge' in best_model_name or 'Lasso' in best_model_name:
        features_pred_scaled = scaler.transform(features_pred)
        predicao = best_model.predict(features_pred_scaled)[0]
    else:
        predicao = best_model.predict(features_pred)[0]
    
    print(f"{row['site_id']} - {row['device_type']}:")
    print(f"  Consumo atual: {row['kw']:.2f} kW")
    print(f"  Predição próximo mês: {predicao:.2f} kW")
    print(f"  Variação: {(predicao - row['kw'])/row['kw']*100:+.1f}%")
    print()


print("\n" + "=" * 80)
print("TREINAMENTO CONCLUÍDO COM SUCESSO!")
print("=" * 80)
print(f"\nMelhor modelo: {best_model_name}")
print(f"R² Score: {results[best_model_name]['test_r2']:.4f}")
print(f"RMSE: {results[best_model_name]['test_rmse']:.2f} kW")
print(f"\nArquivos salvos em: models/")
print("Gráficos salvos em: graficos/")

