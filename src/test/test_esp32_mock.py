"""
============================================================================
MOCK SERVER DO ESP32 PARA TESTES
============================================================================
Simula o servidor HTTP do ESP32 para testar a integração
============================================================================
"""

from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import random
import time

app = Flask(__name__)

# Simular leituras armazenadas
readings = []
reading_count = 0

# Configuração do dispositivo
ORG_ID = "org_greenhub"
SITE_ID = "site_centro"
ANDAR = 1
DEVICE_ID = "esp32_sensor_001"
DEVICE_TYPE = "HVAC"
FE_GRID = 0.08

def generate_reading():
    """Gera uma leitura simulada"""
    global reading_count
    
    # Simular consumo baseado em horário
    now = datetime.now()
    hour = now.hour
    is_weekend = now.weekday() >= 5
    is_business_hours = 8 <= hour < 18
    
    # Curva de consumo (pico às 14h)
    hora_factor = 0.3 + 1.2 * (1.0 / (1.0 + ((hour - 14) ** 2) / 36.0))
    
    # Consumo base
    base_kw = 15.0 * random.uniform(0.8, 1.2)
    kw = base_kw * hora_factor
    
    # Ajustes
    if is_weekend:
        kw *= 0.5
    if not is_business_hours:
        kw *= 0.3
    
    # Adicionar ruído
    kw += random.gauss(0, kw * 0.05)
    kw = max(0, kw)
    
    # Temperatura
    temp = 26.0 + 4.0 * random.uniform(-1, 1) + random.gauss(0, 1.5)
    
    # Detectar anomalia (5% de chance)
    is_anomaly = random.random() < 0.05
    if is_anomaly:
        if random.random() < 0.5:
            kw *= random.uniform(2.0, 4.0)  # Pico
        else:
            kw *= random.uniform(0.0, 0.1)  # Queda
    
    # Calcular derivados
    kwh_interval = kw * (15.0 / 60.0)
    emissoes_tco2e = (kwh_interval * FE_GRID) / 1000.0
    
    reading = {
        "ts": now.strftime("%Y-%m-%d %H:%M:%S"),
        "org_id": ORG_ID,
        "site_id": SITE_ID,
        "andar": ANDAR,
        "device_id": DEVICE_ID,
        "device_type": DEVICE_TYPE,
        "kw": round(kw, 6),
        "kwh_interval": round(kwh_interval, 6),
        "emissoes_tco2e": round(emissoes_tco2e, 10),
        "temp_ext": round(temp, 2),
        "eh_fds": 1 if is_weekend else 0,
        "eh_horario_comercial": 1 if is_business_hours else 0,
        "is_anomaly": 1 if is_anomaly else 0
    }
    
    readings.append(reading)
    reading_count += 1
    
    # Manter apenas últimas 100
    if len(readings) > 100:
        readings.pop(0)
    
    return reading


@app.route('/')
def root():
    """Página inicial"""
    html = f"""
<!DOCTYPE html>
<html>
<head>
  <title>GREEN WORK HUB - ESP32 Mock Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
    .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }}
    h1 {{ color: #2c3e50; }}
    .endpoint {{ background: #ecf0f1; padding: 10px; margin: 10px 0; border-radius: 4px; }}
    .endpoint code {{ color: #e74c3c; }}
    .status {{ padding: 10px; margin: 10px 0; border-radius: 4px; background: #d4edda; color: #155724; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>🌱 GREEN WORK HUB</h1>
    <h2>ESP32 Mock Server (Teste)</h2>
    
    <div class="status">
      <strong>Status:</strong> Online (Mock Server)
    </div>
    
    <h3>Endpoints Disponíveis:</h3>
    
    <div class="endpoint">
      <strong>GET</strong> <code>/api/reading</code><br>
      Retorna a última leitura de energia
    </div>
    
    <div class="endpoint">
      <strong>GET</strong> <code>/api/readings?limit=10</code><br>
      Retorna as últimas N leituras (máx: 100)
    </div>
    
    <div class="endpoint">
      <strong>GET</strong> <code>/api/stats</code><br>
      Retorna estatísticas do dispositivo
    </div>
    
    <h3>Informações do Dispositivo:</h3>
    <ul>
      <li><strong>Org ID:</strong> {ORG_ID}</li>
      <li><strong>Site ID:</strong> {SITE_ID}</li>
      <li><strong>Andar:</strong> {ANDAR}</li>
      <li><strong>Device ID:</strong> {DEVICE_ID}</li>
      <li><strong>Device Type:</strong> {DEVICE_TYPE}</li>
      <li><strong>Total de Leituras:</strong> {reading_count}</li>
    </ul>
    
    <p><a href="/api/reading">Ver última leitura →</a></p>
  </div>
</body>
</html>
    """
    return html


@app.route('/api/reading')
def get_reading():
    """Retorna última leitura"""
    if not readings:
        return jsonify({"error": "No readings available"}), 404
    
    return jsonify(readings[-1])


@app.route('/api/readings')
def get_readings():
    """Retorna múltiplas leituras"""
    limit = int(request.args.get('limit', 10))
    limit = min(limit, 100, len(readings))
    
    if not readings:
        return jsonify([])
    
    return jsonify(readings[-limit:])


@app.route('/api/stats')
def get_stats():
    """Retorna estatísticas"""
    if not readings:
        return jsonify({"error": "No readings available"}), 404
    
    total_kw = sum(r['kw'] for r in readings)
    total_kwh = sum(r['kwh_interval'] for r in readings)
    total_emissions = sum(r['emissoes_tco2e'] for r in readings)
    avg_temp = sum(r['temp_ext'] for r in readings) / len(readings)
    anomalies = sum(1 for r in readings if r['is_anomaly'])
    
    stats = {
        "device_id": DEVICE_ID,
        "device_type": DEVICE_TYPE,
        "total_readings": len(readings),
        "total_kw": round(total_kw, 2),
        "total_kwh": round(total_kwh, 2),
        "total_emissions_tco2e": round(total_emissions, 6),
        "avg_temp": round(avg_temp, 2),
        "anomalies_count": anomalies,
        "min_kw": round(min(r['kw'] for r in readings), 2),
        "max_kw": round(max(r['kw'] for r in readings), 2),
        "avg_kw": round(total_kw / len(readings), 2)
    }
    
    return jsonify(stats)


def generate_initial_readings():
    """Gera leituras iniciais"""
    print("Gerando leituras iniciais...")
    for _ in range(10):
        generate_reading()
        time.sleep(0.1)
    print(f"✓ {len(readings)} leituras geradas")


if __name__ == '__main__':
    from flask import request
    
    print("=" * 80)
    print("ESP32 MOCK SERVER - GREEN WORK HUB")
    print("=" * 80)
    print("Servidor de teste para simular o ESP32")
    print("Disponível em: http://localhost:9080")
    print("=" * 80)
    print()
    
    # Gerar leituras iniciais
    generate_initial_readings()
    
    # Iniciar thread para gerar leituras periodicamente
    import threading
    
    def generate_periodic():
        while True:
            time.sleep(60)  # Gerar nova leitura a cada minuto (para teste)
            generate_reading()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Nova leitura gerada: {readings[-1]['kw']:.2f} kW")
    
    thread = threading.Thread(target=generate_periodic, daemon=True)
    thread.start()
    
    print("Servidor iniciado!")
    print("Pressione Ctrl+C para parar")
    print()
    
    app.run(host='0.0.0.0', port=9080, debug=False)

