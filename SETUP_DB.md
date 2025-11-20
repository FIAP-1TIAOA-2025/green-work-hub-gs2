# 🔧 Guia Rápido de Configuração do Banco de Dados

## ✅ Status Atual

Baseado na verificação, seu PostgreSQL está configurado corretamente:
- ✅ Usuário: `silasferenandes`
- ✅ Banco: `greenworkhub` existe
- ✅ Tabela: `energy_readings` existe
- ✅ Dados: 276,480 registros

## 📝 Configuração do .env

Seu arquivo `.env` deve estar assim:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=greenworkhub
DB_USER=silasferenandes
DB_PASSWORD=
```

## 🚀 Iniciar a API

Agora você pode iniciar a API normalmente:

```bash
# Opção 1: Script
./start_api.sh

# Opção 2: Direto
uvicorn src.main:app --reload
```

## 🔍 Verificar Conexão

Sempre que precisar verificar a conexão:

```bash
python3 src/check_db.py
```

## ❓ Problemas Comuns

### Erro: "role does not exist"

**Solução:** Use seu nome de usuário do sistema:
```bash
whoami  # Mostra seu usuário
# Use esse usuário no .env como DB_USER
```

### Erro: "database does not exist"

**Solução:** Crie o banco:
```bash
createdb greenworkhub
```

### Erro: "could not connect"

**Solução:** Verifique se PostgreSQL está rodando:
```bash
# macOS com Homebrew
brew services start postgresql

# Verificar status
brew services list | grep postgresql
```

## 📊 Próximos Passos

1. ✅ Banco configurado
2. ✅ Dados já existem
3. 🚀 Iniciar API: `uvicorn src.main:app --reload`
4. 📚 Acessar docs: http://localhost:8000/docs

---

**Tudo pronto para usar! 🎉**

