# 🔌 ESP32 IoT Energy Monitor - GREEN WORK HUB

## 📋 Visão Geral

Código Arduino para ESP32 que simula um dispositivo IoT de monitoramento de energia. O dispositivo lê dados de sensores e expõe via API HTTP no mesmo formato dos dados sintéticos do projeto.

## 🎯 Funcionalidades

- ✅ Leitura de consumo de energia (simulado via potenciômetro)
- ✅ Leitura de temperatura externa (sensor DS18B20)
- ✅ Cálculo automático de kWh e emissões CO2
- ✅ Detecção de horário comercial e fins de semana
- ✅ Detecção de anomalias (picos e quedas)
- ✅ API REST com endpoints JSON
- ✅ Armazenamento circular das últimas 100 leituras

## 🔧 Hardware Necessário

### Componentes no Wokwi:
- ESP32 DevKit C v4
- Sensor de temperatura DS18B20
- Potenciômetro (simula consumo de energia)
- LED de status
- Resistores

### Conexões:
- **GPIO 4**: Sensor de temperatura DS18B20 (OneWire)
- **GPIO 34**: Potenciômetro (ADC para simular consumo)
- **GPIO 2**: LED de status

## 📡 Endpoints da API

### `GET /`
Página HTML com informações do dispositivo e documentação dos endpoints.

### `GET /api/reading`
Retorna a última leitura de energia no formato JSON:

```json
{
  "ts": "2025-01-15 14:30:00",
  "org_id": "org_greenhub",
  "site_id": "site_centro",
  "andar": 1,
  "device_id": "esp32_sensor_001",
  "device_type": "HVAC",
  "kw": 12.45,
  "kwh_interval": 3.1125,
  "emissoes_tco2e": 0.000249,
  "temp_ext": 28.5,
  "eh_fds": 0,
  "eh_horario_comercial": 1,
  "is_anomaly": 0
}
```

### `GET /api/readings?limit=10`
Retorna as últimas N leituras (máximo 100):

```json
[
  {
    "ts": "2025-01-15 14:30:00",
    "org_id": "org_greenhub",
    ...
  },
  ...
]
```

### `GET /api/stats`
Retorna estatísticas do dispositivo:

```json
{
  "device_id": "esp32_sensor_001",
  "device_type": "HVAC",
  "total_readings": 50,
  "total_kw": 625.5,
  "total_kwh": 156.375,
  "total_emissions_tco2e": 0.01251,
  "avg_temp": 26.8,
  "anomalies_count": 2,
  "min_kw": 3.2,
  "max_kw": 18.5,
  "avg_kw": 12.51
}
```

## 🔄 Formato dos Dados

Os dados seguem exatamente o mesmo formato do CSV sintético:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `ts` | String | Timestamp (YYYY-MM-DD HH:MM:SS) |
| `org_id` | String | ID da organização |
| `site_id` | String | ID do site |
| `andar` | Integer | Andar do prédio |
| `device_id` | String | ID único do dispositivo |
| `device_type` | String | Tipo (HVAC, ILUMINACAO, etc.) |
| `kw` | Float | Consumo em kilowatts |
| `kwh_interval` | Float | Energia no intervalo (15min) |
| `emissoes_tco2e` | Float | Emissões em toneladas CO2e |
| `temp_ext` | Float | Temperatura externa (°C) |
| `eh_fds` | Integer | 1=final de semana, 0=dia útil |
| `eh_horario_comercial` | Integer | 1=horário comercial, 0=fora |
| `is_anomaly` | Integer | 1=anomalia detectada, 0=normal |

## ⚙️ Configuração

### Bibliotecas Necessárias

Instale via Arduino Library Manager:
- `WiFi` (incluída no ESP32)
- `WebServer` (incluída no ESP32)
- `OneWire` (by Paul Stoffregen)
- `DallasTemperature` (by Miles Burton)
- `ArduinoJson` (by Benoit Blanchon) - versão 6.x

### Configurações do Dispositivo

Edite no código (`esp32-http-server.ino`):

```cpp
#define ORG_ID "org_greenhub"
#define SITE_ID "site_centro"
#define ANDAR 1
#define DEVICE_ID "esp32_sensor_001"
#define DEVICE_TYPE "HVAC"
```

### Intervalo de Leituras

Por padrão, leituras a cada 15 minutos (900.000 ms). Para testes, altere:

```cpp
#define READING_INTERVAL_MS 60000  // 1 minuto para testes
```

## 🧪 Testando no Wokwi

1. Abra o projeto no Wokwi: https://wokwi.com
2. Carregue o arquivo `diagram.json`
3. Carregue o código `esp32-http-server.ino`
4. Inicie a simulação
5. Acesse: http://localhost:9080 (requer Wokwi Club)

### Serial Monitor

O Serial Monitor mostrará:
- Status de conexão WiFi
- IP do dispositivo
- Leituras realizadas
- JSON das leituras

## 🔗 Integração com Backend

### Enviar dados para a API FastAPI

Você pode criar um script Python para coletar dados do ESP32:

```python
import requests
import time

ESP32_IP = "192.168.1.100"  # IP do seu ESP32

while True:
    try:
        # Obter última leitura
        response = requests.get(f"http://{ESP32_IP}/api/reading")
        reading = response.json()
        
        # Enviar para API FastAPI
        api_response = requests.post(
            "http://localhost:8000/api/readings",
            json=reading
        )
        
        print(f"Leitura enviada: {reading['kw']} kW")
        
    except Exception as e:
        print(f"Erro: {e}")
    
    time.sleep(900)  # Aguardar 15 minutos
```

## 📊 Simulação de Dados

O ESP32 simula:
- **Consumo variável**: Baseado em potenciômetro + fatores temporais
- **Curva horária**: Pico às 14h, menor consumo à noite
- **Fins de semana**: 50% do consumo normal
- **Horário comercial**: Redução fora do horário
- **Temperatura**: Sensor real ou simulação baseada em sazonalidade
- **Anomalias**: Detecta picos (>200% variação) ou quedas (>90% redução)

## 🚨 Detecção de Anomalias

O sistema detecta anomalias comparando com a leitura anterior:
- **Pico**: Aumento > 200% do valor anterior
- **Queda**: Redução > 90% em horário de consumo esperado

## 📝 Notas

- O ESP32 mantém apenas as últimas 100 leituras em memória (buffer circular)
- Timestamps são sincronizados via NTP
- O LED de status indica conexão WiFi (pisca durante conexão, aceso quando conectado)
- Para produção, considere adicionar autenticação e HTTPS

## 🔧 Troubleshooting

### WiFi não conecta
- Verifique SSID e senha
- No Wokwi, use "Wokwi-GUEST" sem senha

### Sensor de temperatura não funciona
- O código simula temperatura se o sensor não estiver disponível
- Verifique conexões do DS18B20

### Leituras não aparecem
- Verifique Serial Monitor para logs
- Aguarde 15 minutos (ou ajuste intervalo para testes)
- Acesse `/api/stats` para ver total de leituras

---

**🌱 Dispositivo IoT desenvolvido para o GREEN WORK HUB**

