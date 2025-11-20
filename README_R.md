# Análise Estatística em R

Este documento descreve como usar o script `analise_estatistica.R` para realizar análises estatísticas dos dados de energia.

## Pré-requisitos

### Instalação do R
- Baixe e instale o R: https://www.r-project.org/
- Recomendado: instale também o RStudio: https://www.rstudio.com/

### Instalação dos Pacotes

Execute no R ou RStudio:

```r
install.packages(c("dplyr", "ggplot2", "corrplot", "car", "psych", 
                   "lubridate", "tidyr", "RColorBrewer"))
```

## Como Executar

### Opção 1: Via RStudio
1. Abra o RStudio
2. Abra o arquivo `analise_estatistica.R`
3. Execute o script completo (Ctrl+Shift+Enter ou Cmd+Shift+Enter)

### Opção 2: Via Terminal/Console
```bash
Rscript analise_estatistica.R
```

## O que o Script Faz

### 1. Carregamento e Preparação dos Dados
- Carrega o arquivo CSV `energy_readings_sinteticos.csv`
- Converte tipos de dados
- Cria variáveis temporais (data, hora, dia da semana)

### 2. Estatísticas Descritivas
- Estatísticas gerais (média, mediana, desvio padrão, etc.)
- Resumo por tipo de dispositivo
- Resumo por site

### 3. Análise de Distribuições
- Teste de normalidade (Shapiro-Wilk)
- Análise de distribuições

### 4. Testes Estatísticos
- **Mann-Whitney**: Compara fins de semana vs dias úteis
- **Kruskal-Wallis**: Compara tipos de dispositivos
- **Teste de Levene**: Verifica homogeneidade de variâncias

### 5. Análise de Correlações
- Matriz de correlação entre variáveis
- Testes de correlação de Pearson

### 6. Análise de Anomalias
- Estatísticas de anomalias
- Comparação normal vs anomalia
- Distribuição por tipo de dispositivo

### 7. Análise Temporal
- Consumo diário
- Padrão horário
- Consumo por dia da semana

### 8. Visualizações
O script gera 10 gráficos salvos na pasta `graficos/`:
1. `01_distribuicao_por_tipo.png` - Boxplot por tipo de dispositivo
2. `02_histograma_consumo.png` - Distribuição geral de consumo
3. `03_serie_temporal_diaria.png` - Série temporal diária
4. `04_padrao_horario.png` - Padrão horário de consumo
5. `05_consumo_dia_semana.png` - Consumo por dia da semana
6. `06_consumo_vs_temperatura.png` - Relação consumo vs temperatura
7. `07_fds_vs_util.png` - Comparação fins de semana vs dias úteis
8. `08_matriz_correlacao.png` - Matriz de correlação
9. `09_anomalias_por_tipo.png` - Anomalias por tipo de dispositivo
10. `10_heatmap_horario_tipo.png` - Heatmap consumo por hora e tipo

## Estrutura de Saída

```
projeto/
├── analise_estatistica.R
├── energy_readings_sinteticos.csv
└── graficos/
    ├── 01_distribuicao_por_tipo.png
    ├── 02_histograma_consumo.png
    ├── ...
    └── 10_heatmap_horario_tipo.png
```

## Interpretação dos Resultados

### Testes Estatísticos
- **p-value < 0.05**: Diferença estatisticamente significativa
- **p-value >= 0.05**: Não há evidência de diferença significativa

### Correlações
- **r > 0.7**: Correlação forte positiva
- **0.3 < r < 0.7**: Correlação moderada
- **r < 0.3**: Correlação fraca

## Personalização

Você pode modificar o script para:
- Alterar o tamanho dos gráficos
- Adicionar novos testes estatísticos
- Modificar as cores dos gráficos
- Incluir análises adicionais

## Troubleshooting

### Erro: "package not found"
Execute: `install.packages("nome_do_pacote")`

### Erro: "cannot open file"
Certifique-se de que o arquivo CSV está no mesmo diretório do script R.

### Gráficos não aparecem
Verifique se a pasta `graficos/` foi criada. O script cria automaticamente, mas pode falhar se não houver permissões.

