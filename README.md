# 🌱 GREEN WORK HUB - Plataforma de Otimização de Pegada de Carbono Corporativa

## 📋 Sobre o Projeto

O **GREEN WORK HUB** é uma solução tecnológica desenvolvida para responder ao desafio do **Global Solution 2**: *"Como a tecnologia pode tornar o trabalho mais humano, inclusivo e sustentável no futuro?"*

Nossa plataforma integra monitoramento IoT, inteligência artificial, análise estatística e gamificação para medir, prever e reduzir a pegada de carbono empresarial, promovendo um ambiente de trabalho mais sustentável, inclusivo e consciente.

## 🎯 Resumo da Solução

Sistema que mede, prevê e reduz pegada de carbono empresarial através de:
- 📊 **Monitoramento IoT em tempo real** de consumo energético
- 🎮 **Gamificação de práticas sustentáveis** para engajamento dos colaboradores
- 🤖 **Otimização automatizada** de decisões operacionais
- 📈 **Relatórios ESG automatizados** com blockchain para auditoria transparente
- 🔍 **Análise preditiva** de padrões de consumo e detecção de anomalias

## 🛡️ O que foi adicionado (cibersegurança e compliance)
- 🔐 Login OAuth2 simulado no dashboard com sessão de 60 minutos e escopos mínimos
- 🔑 Exportação de dados criptografada (AES-GCM 256) com senha definida pelo usuário
- 📜 Simulação de fluxo LGPD/GDPR: registro de pedidos de anonimização/exportação e checklist de privacidade

## 💡 Como Responde ao Desafio

### 🤝 **Trabalho Mais Humano**
- **Gamificação ética**: Sistema de recompensas que incentiva sem punir, promovendo bem-estar
- **Educação ambiental corporativa**: Chatbot com NLP para orientação em tempo real
- **Transparência**: Dados acessíveis democratizam informações ambientais

### 🌍 **Trabalho Mais Inclusivo**
- **Justiça climática**: Inclusão de comunidades vulneráveis nas métricas e benefícios
- **Democratização de dados**: Transparência total dos dados ambientais corporativos
- **Acessibilidade**: Interface intuitiva para todos os níveis hierárquicos

### 🌿 **Trabalho Mais Sustentável**
- **Redução ativa de emissões**: Otimização automatizada reduz pegada de carbono
- **Energia renovável**: Infraestrutura em nuvem com foco em regiões sustentáveis
- **Modelos de trabalho verde**: Otimização de escalas home office vs presencial

## 🏗️ Arquitetura da Solução

### Disciplinas e Tecnologias Envolvidas

#### 🤖 **AICSS (Inteligência Artificial e Ciência de Dados)**
- Chatbot que sugere decisões sustentáveis em tempo real
- Análise NLP para educação ambiental corporativa
- Geração automática de relatórios narrativos ESG

#### 🔒 **Cybersecurity**
- Blockchain para certificações de carbono neutralidade
- Criptografia de dados corporativos de consumo energético
- Proteção contra greenwashing e manipulação de métricas

#### 📊 **Machine Learning**
- Predição de consumo energético mensal (regressão)
- Recomendação de ações de redução de emissões
- Otimização de escalas home office vs presencial

#### 🧠 **Redes Neurais**
- LSTM para forecasting de padrões elétricos
- Detecção de anomalias em consumo energético
- Otimização de rotas logísticas para reduzir emissões

#### 📈 **Linguagem R**
- Correlação entre políticas verdes e redução de emissões
- Testes de hipóteses sobre eficácia de intervenções
- Visualizações científicas (heatmaps, tendências)

#### 🐍 **Python**
- Backend FastAPI + APIs para sensores IoT
- Scripts ETL e cálculo de pegada de carbono (GHG Protocol)
- Orquestração de modelos ML e geração de relatórios

#### ☁️ **Computação em Nuvem**
- Serverless em regiões com energia renovável
- Monitoramento do próprio consumo da plataforma (PUE)
- Escalabilidade automática para IoT em grande escala

#### 💾 **Banco de Dados**
- InfluxDB para séries temporais de consumo
- PostgreSQL para metas, equipes, gamificação
- MongoDB para certificações e relatórios históricos

#### 🌐 **Formação Social**
- Justiça climática e inclusão de comunidades vulneráveis
- Democratização de dados ambientais (transparência)
- Gamificação ética sem punição por baixo engajamento

## 📁 Estrutura do Projeto

```
global-solution-2/
├── README.md                          # Este arquivo
├── README_R.md                        # Documentação do script R
├── requirements.txt                   # Dependências Python
├── .gitignore                         # Arquivos ignorados pelo Git
│
├── src/
│   └── data_gen.py                    # Geração de dados sintéticos de energia
│
├── analise_exploratoria.ipynb         # Análise exploratória em Python (Jupyter)
├── analise_estatistica.R              # Análise estatística em R
│
├── energy_readings_sinteticos.csv     # Dataset de consumo energético sintético
│
└── graficos/                          # Gráficos gerados pelo script R
    ├── 01_distribuicao_por_tipo.png
    ├── 02_histograma_consumo.png
    ├── 03_serie_temporal_diaria.png
    ├── 04_padrao_horario.png
    ├── 05_consumo_dia_semana.png
    ├── 06_consumo_vs_temperatura.png
    ├── 07_fds_vs_util.png
    ├── 08_matriz_correlacao.png
    ├── 09_anomalias_por_tipo.png
    └── 10_heatmap_horario_tipo.png
```

## 🚀 Como Executar

### Pré-requisitos

- Python 3.8+
- R 4.0+
- Jupyter Notebook (para análise exploratória)

### Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd global-solution-2
```

2. **Instale as dependências Python**
```bash
pip install -r requirements.txt
```

3. **Instale as dependências R** (o script R instala automaticamente, mas você pode instalar manualmente):
```r
install.packages(c("dplyr", "ggplot2", "corrplot", "car", "psych", 
                   "lubridate", "tidyr", "RColorBrewer"))
```

### Dashboard (React + Vite)
1. Entre na pasta do dashboard:
```bash
cd dashboard
```
2. Instale as dependências (uma vez):
```bash
npm install
```
3. Rode em modo dev:
```bash
npm run dev
```
4. Acesse a URL exibida no terminal e faça login clicando em **“Entrar com OAuth2 (simulado)”**. A sessão dura 60 minutos.

### Geração de Dados Sintéticos

```bash
python src/data_gen.py
```

Isso gerará o arquivo `energy_readings_sinteticos.csv` com dados de consumo energético sintéticos.

### Análise Exploratória (Python)

Abra o Jupyter Notebook:
```bash
jupyter notebook analise_exploratoria.ipynb
```

O notebook contém:
- Carregamento e preparação dos dados
- Estatísticas descritivas
- Análises por categoria (tipo de dispositivo, site, andar)
- Visualizações temporais
- Análise de padrões (fins de semana, horário comercial)
- Análise de anomalias
- Matriz de correlação
- Insights e conclusões

### Análise Estatística (R)

Execute o script R:
```bash
Rscript analise_estatistica.R
```

O script gera:
- Estatísticas descritivas completas
- Testes estatísticos (Mann-Whitney, Kruskal-Wallis, etc.)
- Análise de correlações
- Análise de anomalias
- 10 gráficos salvos na pasta `graficos/`

## 📊 Dados

O dataset `energy_readings_sinteticos.csv` contém:
- **276.480 registros** de consumo energético
- **Período**: 15 dias (01/01/2025 a 15/01/2025)
- **Frequência**: Leituras a cada 15 minutos
- **Variáveis**:
  - `ts`: Timestamp
  - `org_id`: ID da organização
  - `site_id`: ID do site (site_centro, site_zonasul)
  - `andar`: Andar do prédio (1-5)
  - `device_id`: ID do dispositivo
  - `device_type`: Tipo (HVAC, ILUMINACAO, TOMADAS, TI)
  - `kw`: Consumo em kilowatts
  - `kwh_interval`: Energia consumida no intervalo
  - `emissoes_tco2e`: Emissões em toneladas de CO2 equivalente
  - `temp_ext`: Temperatura externa (°C)
  - `eh_fds`: Final de semana (0/1)
  - `eh_horario_comercial`: Horário comercial (0/1)
  - `is_anomaly`: Indicador de anomalia (0/1)

## 🔒 Estratégia de Cibersegurança e Compliance (simulação)
- **Login OAuth2 simulado**: gera token aleatório com escopos `dashboard:read` e `export:secure`, expira em 60 minutos e pode ser revogado pelo botão “Sair”.
- **Exportação segura**: botão “Exportar dados criptografados” no dashboard usa WebCrypto (AES-GCM 256 + PBKDF2 120k iterações) para gerar `gwh-secure-export.json`. Defina uma senha forte antes de exportar.
- **LGPD/GDPR (simples)**: painel registra pedidos de anonimização/exportação, mostra checklist de consentimento/minimização e reforça privacidade by design para dados de IoT.
- **Dicas de endurecimento**: habilite MFA no IdP, restrinja escopos, registre auditoria de login e mantenha backups criptografados separados do ambiente de produção.

## 📈 Principais Descobertas

### Análise Exploratória
- **Consumo médio**: 1.78 kW
- **Tipo com maior consumo**: HVAC (12.3 kW médio)
- **Hora de pico**: 8:00 (início do horário comercial)
- **Anomalias detectadas**: 0.5% das leituras
- **Padrão temporal**: Consumo reduzido em finais de semana

### Análise Estatística
- **Testes confirmam diferenças significativas** entre:
  - Fins de semana vs dias úteis (p < 0.001)
  - Tipos de dispositivos (p < 0.001)
  - Horário comercial vs não comercial (p < 0.001)
- **Correlação temperatura-consumo**: -0.043 (fraca, mas significativa)
- **Anomalias**: Distribuídas principalmente em dispositivos HVAC

## 🎯 Eixos Temáticos Atendidos

✅ **Modelos de trabalho verde e sustentável**
- Otimização de consumo energético
- Redução de pegada de carbono
- Uso de energia renovável na infraestrutura

✅ **Soluções gamificadas para engajamento**
- Sistema de recompensas por práticas sustentáveis
- Metas coletivas e individuais
- Dashboard interativo

✅ **Ambientes colaborativos (otimização de espaços)**
- Análise de padrões de uso por andar e site
- Otimização de escalas home office vs presencial
- Redução de desperdício energético

## 🔮 Próximos Passos

- [ ] Implementação do backend FastAPI
- [ ] Integração com sensores IoT reais
- [ ] Desenvolvimento do chatbot com NLP
- [ ] Sistema de gamificação
- [ ] Dashboard web interativo
- [ ] Integração com blockchain para certificações
- [ ] Modelos de ML para predição e otimização
- [ ] Deploy em nuvem com energia renovável

## 👥 Equipe

Projeto desenvolvido para o **Global Solution 2** da FIAP, integrando conhecimentos de múltiplas disciplinas para criar uma solução tecnológica que torna o trabalho mais humano, inclusivo e sustentável.

## 📄 Licença

Este projeto é parte de uma solução acadêmica desenvolvida para o Global Solution 2 da FIAP.

## 📚 Referências

- GHG Protocol - Protocolo de Gases de Efeito Estufa
- ISO 14064 - Gestão de Gases de Efeito Estufa
- ESG (Environmental, Social, and Governance) Reporting
- IoT para Monitoramento Energético
- Machine Learning para Sustentabilidade

---

**🌱 Tecnologia para um futuro mais sustentável, inclusivo e humano.**
