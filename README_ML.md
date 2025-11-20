# 🤖 Modelo de Machine Learning - Predição de Consumo Energético Mensal

## 📋 Visão Geral

Este módulo implementa modelos de regressão para prever o consumo energético mensal com base em dados históricos. O sistema compara múltiplos algoritmos de Machine Learning e seleciona o melhor modelo baseado em métricas de avaliação.

## 🎯 Objetivo

Prever o consumo energético mensal (em kW) para diferentes combinações de:
- **Site** (site_centro, site_zonasul)
- **Tipo de Dispositivo** (HVAC, ILUMINACAO, TOMADAS, TI)

## 🏗️ Arquitetura do Modelo

### Features Utilizadas

1. **Features Temporais**
   - `mes_sin`, `mes_cos`: Sazonalidade cíclica (seno e cosseno do mês)
   
2. **Features de Lag**
   - `kw_lag1`: Consumo do mês anterior
   - `kwh_lag1`: Energia do mês anterior
   - `kw_ma3`: Média móvel dos últimos 3 meses

3. **Features Contextuais**
   - `temp_ext`: Temperatura externa média
   - `eh_fds`: Proporção de finais de semana
   - `eh_horario_comercial`: Proporção de horário comercial
   - `is_anomaly`: Total de anomalias no mês

4. **Features Categóricas (Encoded)**
   - `site_id_encoded`: Site (Label Encoded)
   - `device_type_encoded`: Tipo de dispositivo (Label Encoded)

### Modelos Testados

1. **Linear Regression** - Regressão linear simples
2. **Ridge Regression** - Regressão linear com regularização L2
3. **Lasso Regression** - Regressão linear com regularização L1
4. **Random Forest** - Ensemble de árvores de decisão
5. **Gradient Boosting** - Boosting com árvores de decisão

## 📊 Métricas de Avaliação

- **RMSE** (Root Mean Squared Error): Erro quadrático médio
- **MAE** (Mean Absolute Error): Erro absoluto médio
- **R² Score**: Coeficiente de determinação (quanto mais próximo de 1, melhor)

## 🚀 Como Usar

### 1. Treinar o Modelo

```bash
python3 src/ml_consumo_mensal.py
```

O script irá:
- Carregar e preparar os dados
- Agregar consumo mensal
- Criar features para modelagem
- Treinar múltiplos modelos
- Comparar desempenho
- Salvar o melhor modelo
- Gerar visualizações

### 2. Fazer Predições

#### Opção A: Usando o script de predição

```bash
python3 src/predicao_consumo.py
```

#### Opção B: Usando em código Python

```python
from src.predicao_consumo import prever_consumo_mensal

# Predição para HVAC em site_centro, mês 2 (fevereiro)
predicao = prever_consumo_mensal(
    mes=2,
    site_id='site_centro',
    device_type='HVAC',
    temp_ext=28.0,  # Temperatura esperada
    kw_mes_anterior=5000,  # Consumo do mês anterior
    kwh_mes_anterior=120000,  # Energia do mês anterior
    kw_ma3=4800  # Média móvel de 3 meses
)

print(f"Consumo previsto: {predicao:.2f} kW")
```

## 📁 Estrutura de Arquivos

```
models/
├── modelo_consumo_mensal_*.pkl    # Modelo treinado
├── scaler.pkl                      # Normalizador
├── label_encoder_site.pkl          # Encoder de sites
├── label_encoder_device.pkl       # Encoder de dispositivos
├── features.json                   # Lista de features
└── comparacao_modelos.csv          # Resultados da comparação

graficos/
├── ml_feature_importance.png       # Importância das features
├── ml_predicoes_residuos.png      # Análise de predições e resíduos
├── ml_comparacao_modelos.png       # Comparação de modelos
└── ml_serie_temporal.png          # Série temporal de predições
```

## 📈 Resultados

### Melhor Modelo

O script compara automaticamente todos os modelos e seleciona o melhor baseado no R² Score no conjunto de teste.

### Exemplo de Saída

```
COMPARAÇÃO DE MODELOS
================================================================================
            Modelo  RMSE Treino   RMSE Teste   MAE Treino    MAE Teste  R² Treino  R² Teste
Linear Regression 1.925037e-11 2.416587e-11 1.697723e-11 2.273737e-11   1.000000  1.000000
 Lasso Regression 3.717535e+01 1.287611e+02 2.917440e+01 1.107911e+02   1.000000  0.999926
 Ridge Regression 5.689686e+03 4.862598e+03 4.226008e+03 4.150697e+03   0.989082  0.894458
    Random Forest 1.343882e+04 2.967432e+04 1.083650e+04 2.959196e+04   0.939087 -2.930541
Gradient Boosting 1.446300e+00 3.165086e+04 1.193380e+00 2.770512e+04   1.000000 -3.471587

✓ Melhor modelo: Linear Regression
  RMSE: 0.00
  MAE: 0.00
  R²: 1.0000
```

## 🔍 Análise de Features

Para modelos baseados em árvores (Random Forest, Gradient Boosting), o script gera um gráfico mostrando a importância de cada feature:

```
Top 10 Features Mais Importantes:
- kw_lag1 (consumo mês anterior)
- kwh_lag1 (energia mês anterior)
- device_type_encoded
- temp_ext
- ...
```

## 📝 Notas Importantes

### Limitações Atuais

1. **Dados Sintéticos**: O modelo atual foi treinado com dados sintéticos de apenas 15 dias. Para produção, são necessários dados históricos de múltiplos meses.

2. **Overfitting**: Com poucos dados, o modelo pode apresentar overfitting. Em produção, use validação cruzada e mais dados.

3. **Features de Lag**: As features de lag (`kw_lag1`, `kwh_lag1`) requerem dados históricos. Para a primeira predição, use valores médios ou zeros.

### Melhorias Futuras

- [ ] Adicionar validação cruzada temporal
- [ ] Implementar tuning de hiperparâmetros (GridSearchCV)
- [ ] Adicionar modelos de séries temporais (ARIMA, Prophet)
- [ ] Implementar ensemble de modelos
- [ ] Adicionar features de interação
- [ ] Implementar detecção de drift do modelo

## 🔧 Dependências

```txt
scikit-learn
pandas
numpy
matplotlib
seaborn
joblib
```

Instale com:
```bash
pip install -r requirements.txt
```

## 📚 Referências

- Scikit-learn: https://scikit-learn.org/
- Feature Engineering para Séries Temporais
- Time Series Forecasting com Machine Learning

---

**🌱 Modelo desenvolvido para o GREEN WORK HUB - Predição de Consumo Energético**

