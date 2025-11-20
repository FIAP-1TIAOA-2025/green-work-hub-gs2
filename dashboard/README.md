# 📊 Dashboard - GREEN WORK HUB

Dashboard em tempo real para visualização de dados de consumo energético coletados do ESP32 via API FastAPI.

## 🚀 Como Executar

### 1. Instalar Dependências

```bash
cd dashboard
npm install
```

### 2. Configurar URL da API (Opcional)

Crie um arquivo `.env` na pasta `dashboard`:

```env
VITE_API_URL=http://localhost:8000
```

Se não criar, usará `http://localhost:8000` por padrão.

### 3. Iniciar Dashboard

```bash
npm run dev
```

A dashboard estará disponível em: http://localhost:5173

## 🔌 Requisitos

- API FastAPI rodando em `http://localhost:8000`
- Dados sendo coletados do ESP32 e salvos na API

## 📊 Funcionalidades

### Visualização em Tempo Real
- ✅ Atualização automática a cada 3 segundos
- ✅ Gráfico de consumo em tempo real
- ✅ Lista de dispositivos com status
- ✅ Detalhes de cada dispositivo
- ✅ Alertas de anomalias

### Estatísticas Globais
- Consumo total (kWh)
- Emissões totais (tCO₂e)
- Dispositivos ativos
- Contador de alertas

### Dados por Dispositivo
- Potência ativa (kW)
- Consumo acumulado (kWh)
- Temperatura externa (°C)
- Emissões (tCO₂e)
- Status de anomalia

## 🔄 Fluxo de Dados

1. **ESP32** → Gera leitura a cada 3 segundos
2. **Coletor Python** → Coleta leituras e envia para API
3. **API FastAPI** → Armazena no PostgreSQL
4. **Dashboard** → Busca dados da API a cada 3 segundos e exibe

## 🎨 Interface

- Design moderno com gradientes
- Tema escuro (slate)
- Gráficos interativos (Recharts)
- Indicadores visuais de status
- Alertas em tempo real

## ⚙️ Configuração

### Variáveis de Ambiente

- `VITE_API_URL`: URL da API FastAPI (padrão: `http://localhost:8000`)

### Personalização

Edite `src/App.jsx` para:
- Alterar intervalo de atualização
- Modificar cores dos dispositivos
- Ajustar número de leituras exibidas
- Personalizar gráficos

## 🐛 Troubleshooting

### Dashboard não mostra dados

1. Verifique se a API está rodando:
   ```bash
   curl http://localhost:8000/health
   ```

2. Verifique se há dados na API:
   ```bash
   curl http://localhost:8000/readings?limit=10
   ```

3. Verifique o console do navegador (F12) para erros

### Erro de CORS

A API já está configurada para permitir CORS de qualquer origem. Se houver problemas, verifique `src/main.py`.

### Dados não atualizam

- Verifique se o coletor está rodando
- Verifique se o ESP32 está gerando leituras
- Verifique a conexão com a API no console do navegador

---

**Desenvolvido para GREEN WORK HUB - Global Solution 2**

