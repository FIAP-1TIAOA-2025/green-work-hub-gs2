# 🚀 API FastAPI - GREEN WORK HUB

## 📋 Visão Geral

Backend REST API desenvolvido com FastAPI para gerenciamento de dados de consumo energético, conectado a um banco de dados PostgreSQL.

## 🏗️ Arquitetura

- **Framework**: FastAPI
- **Banco de Dados**: PostgreSQL
- **ORM**: SQLAlchemy
- **Validação**: Pydantic

## 🔧 Configuração

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar Banco de Dados

Crie um arquivo `.env` na raiz do projeto:

```bash
cp env.example .env
```

**⚠️ IMPORTANTE - Configuração do Usuário PostgreSQL:**

No macOS, o usuário padrão do PostgreSQL geralmente é seu nome de usuário do sistema, não "postgres".

**Opção 1: Usar seu usuário do sistema (Recomendado)**
```bash
# Verificar seu usuário
whoami

# Editar .env e usar seu usuário:
DB_USER=seu_usuario
DB_PASSWORD=  # Deixe vazio se não tiver senha
```

**Opção 2: Criar usuário postgres**
```bash
createuser -s postgres
```

**Opção 3: Verificar usuários disponíveis**
```bash
psql -l
```

Edite o `.env` com suas credenciais corretas.

### 3. Verificar Conexão

Antes de iniciar a API, verifique a conexão:

```bash
python3 src/check_db.py
```

Este script irá:
- Testar a conexão
- Verificar se o banco existe
- Mostrar mensagens de erro úteis

### 4. Criar Banco de Dados

Se o banco não existir, crie:

```bash
createdb greenworkhub
```

Ou usando psql:
```sql
psql -U seu_usuario -c "CREATE DATABASE greenworkhub;"
```

### 4. Executar a API

```bash
# Opção 1: Usando uvicorn diretamente
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Opção 2: Executando o script
python3 src/main.py
```

A API estará disponível em: `http://localhost:8000`

## 📚 Documentação Interativa

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔄 Funcionamento

### Inicialização Automática

Ao iniciar a API:

1. ✅ Cria as tabelas no banco (se não existirem)
2. ✅ Verifica se existem dados no banco
3. ✅ Se não houver dados, executa `data_gen.py` automaticamente
4. ✅ Salva os dados gerados no banco PostgreSQL

### Geração de Dados

O arquivo `data_gen.py` foi modificado para:
- ✅ Salvar dados diretamente no PostgreSQL
- ✅ Inserir em lotes para melhor performance
- ✅ Criar tabelas automaticamente se necessário

## 📡 Endpoints Disponíveis

### GET `/`
Endpoint raiz com informações da API

### GET `/health`
Verifica saúde da API e conexão com banco

### GET `/stats`
Retorna estatísticas gerais:
- Total de registros
- Range de datas
- Sites e tipos de dispositivos
- Totais de consumo e emissões
- Contagem de anomalias

### GET `/readings`
Lista leituras com filtros opcionais:
- `skip`: Paginação (padrão: 0)
- `limit`: Limite de resultados (padrão: 100, máx: 1000)
- `site_id`: Filtrar por site
- `device_type`: Filtrar por tipo de dispositivo
- `device_id`: Filtrar por dispositivo específico
- `start_date`: Data inicial (ISO format)
- `end_date`: Data final (ISO format)
- `is_anomaly`: Filtrar anomalias (true/false)

**Exemplo:**
```
GET /readings?site_id=site_centro&device_type=HVAC&limit=50
```

### GET `/readings/{reading_id}`
Obtém uma leitura específica por ID

### GET `/readings/aggregate/daily`
Agrega consumo por dia com filtros opcionais:
- `start_date`: Data inicial
- `end_date`: Data final
- `site_id`: Filtrar por site
- `device_type`: Filtrar por tipo

**Exemplo:**
```
GET /readings/aggregate/daily?start_date=2025-01-01&end_date=2025-01-15
```

### POST `/generate-data`
Gera novos dados sintéticos e salva no banco

## 📊 Exemplos de Uso

### Usando cURL

```bash
# Estatísticas
curl http://localhost:8000/stats

# Leituras com filtro
curl "http://localhost:8000/readings?site_id=site_centro&limit=10"

# Agregação diária
curl "http://localhost:8000/readings/aggregate/daily?start_date=2025-01-01"
```

### Usando Python

```python
import requests

# Estatísticas
response = requests.get("http://localhost:8000/stats")
stats = response.json()
print(f"Total de registros: {stats['total_records']}")

# Leituras
response = requests.get(
    "http://localhost:8000/readings",
    params={
        "site_id": "site_centro",
        "device_type": "HVAC",
        "limit": 100
    }
)
readings = response.json()
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `energy_readings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | INTEGER | Primary Key |
| ts | TIMESTAMP | Timestamp da leitura |
| org_id | VARCHAR(50) | ID da organização |
| site_id | VARCHAR(50) | ID do site |
| andar | INTEGER | Andar do prédio |
| device_id | VARCHAR(100) | ID do dispositivo |
| device_type | VARCHAR(50) | Tipo de dispositivo |
| kw | FLOAT | Consumo em kW |
| kwh_interval | FLOAT | Energia no intervalo |
| emissoes_tco2e | FLOAT | Emissões em tCO2e |
| temp_ext | FLOAT | Temperatura externa |
| eh_fds | BOOLEAN | É final de semana |
| eh_horario_comercial | BOOLEAN | É horário comercial |
| is_anomaly | BOOLEAN | É anomalia |
| created_at | TIMESTAMP | Data de criação |

## 🔍 Índices

A tabela possui índices em:
- `ts` (timestamp)
- `org_id`
- `site_id`
- `device_id`
- `device_type`

## 🚨 Troubleshooting

### Erro de Conexão com Banco

```
OperationalError: could not connect to server
```

**Solução:**
1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Verifique se o banco `greenworkhub` existe

### Erro ao Criar Tabelas

```
ProgrammingError: relation "energy_readings" already exists
```

**Solução:** As tabelas já existem, isso é normal.

### Dados Não Aparecem

**Solução:** Verifique se os dados foram gerados:
```bash
curl http://localhost:8000/stats
```

Se `total_records` for 0, gere os dados:
```bash
curl -X POST http://localhost:8000/generate-data
```

## 📝 Notas

- A API cria automaticamente as tabelas na primeira execução
- Os dados são gerados automaticamente se o banco estiver vazio
- Use paginação para grandes volumes de dados
- Os filtros podem ser combinados

---

**🌱 API desenvolvida para o GREEN WORK HUB**

