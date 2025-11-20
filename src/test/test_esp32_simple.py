"""
============================================================================
TESTE SIMPLES DO ESP32
============================================================================
Testa a leitura de dados do ESP32 de forma simplificada
============================================================================
"""

import requests
import json
import time

ESP32_URL = "http://localhost:9080"

def test_esp32():
    """Testa o ESP32 mock server"""
    print("=" * 80)
    print("TESTE DO ESP32 MOCK SERVER")
    print("=" * 80)
    print()
    
    # Teste 1: Conexão
    print("1. Testando conexão...")
    try:
        response = requests.get(f"{ESP32_URL}/", timeout=5)
        if response.status_code == 200:
            print("   ✓ Servidor está online")
        else:
            print(f"   ✗ Status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ✗ Não foi possível conectar")
        print("   ⚠️  Inicie o mock server primeiro:")
        print("      python3 src/test_esp32_mock.py")
        return False
    except Exception as e:
        print(f"   ✗ Erro: {e}")
        return False
    
    # Teste 2: Última leitura
    print("\n2. Obtendo última leitura...")
    try:
        response = requests.get(f"{ESP32_URL}/api/reading", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("   ✓ Leitura obtida:")
            print(f"     Timestamp: {data.get('ts')}")
            print(f"     Consumo: {data.get('kw', 0):.2f} kW")
            print(f"     kWh: {data.get('kwh_interval', 0):.4f} kWh")
            print(f"     Emissões: {data.get('emissoes_tco2e', 0):.8f} tCO2e")
            print(f"     Temperatura: {data.get('temp_ext', 0):.1f}°C")
            print(f"     Fim de semana: {'Sim' if data.get('eh_fds') else 'Não'}")
            print(f"     Horário comercial: {'Sim' if data.get('eh_horario_comercial') else 'Não'}")
            print(f"     Anomalia: {'Sim' if data.get('is_anomaly') else 'Não'}")
        else:
            print(f"   ✗ Status: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
    except Exception as e:
        print(f"   ✗ Erro: {e}")
        return False
    
    # Teste 3: Múltiplas leituras
    print("\n3. Obtendo múltiplas leituras...")
    try:
        response = requests.get(f"{ESP32_URL}/api/readings?limit=5", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ {len(data)} leituras obtidas")
            if data:
                print(f"     Primeira: {data[0].get('kw', 0):.2f} kW")
                print(f"     Última: {data[-1].get('kw', 0):.2f} kW")
        else:
            print(f"   ✗ Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ✗ Erro: {e}")
        return False
    
    # Teste 4: Estatísticas
    print("\n4. Obtendo estatísticas...")
    try:
        response = requests.get(f"{ESP32_URL}/api/stats", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("   ✓ Estatísticas obtidas:")
            print(f"     Total de leituras: {data.get('total_readings', 0)}")
            print(f"     Consumo médio: {data.get('avg_kw', 0):.2f} kW")
            print(f"     Consumo total: {data.get('total_kw', 0):.2f} kW")
            print(f"     Energia total: {data.get('total_kwh', 0):.2f} kWh")
            print(f"     Emissões totais: {data.get('total_emissions_tco2e', 0):.6f} tCO2e")
            print(f"     Temperatura média: {data.get('avg_temp', 0):.1f}°C")
            print(f"     Anomalias: {data.get('anomalies_count', 0)}")
        else:
            print(f"   ✗ Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ✗ Erro: {e}")
        return False
    
    # Teste 5: Formato JSON
    print("\n5. Verificando formato JSON...")
    try:
        response = requests.get(f"{ESP32_URL}/api/reading", timeout=5)
        data = response.json()
        
        required = ['ts', 'org_id', 'site_id', 'andar', 'device_id', 'device_type',
                   'kw', 'kwh_interval', 'emissoes_tco2e', 'temp_ext',
                   'eh_fds', 'eh_horario_comercial', 'is_anomaly']
        
        missing = [f for f in required if f not in data]
        if missing:
            print(f"   ✗ Campos faltando: {missing}")
            return False
        
        print("   ✓ Todos os campos presentes")
        print("   ✓ Formato JSON válido")
        
    except Exception as e:
        print(f"   ✗ Erro: {e}")
        return False
    
    print("\n" + "=" * 80)
    print("✓ TODOS OS TESTES PASSARAM!")
    print("=" * 80)
    print("\nO ESP32 está funcionando corretamente e gerando dados no formato esperado.")
    
    return True

if __name__ == "__main__":
    import sys
    success = test_esp32()
    sys.exit(0 if success else 1)

