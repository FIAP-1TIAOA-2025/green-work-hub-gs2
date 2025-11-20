"""
============================================================================
TESTE DE INTEGRAÇÃO ESP32 + API
============================================================================
Testa a integração completa entre ESP32 (mock) e API FastAPI
============================================================================
"""

import requests
import json
import time
from datetime import datetime

# Configuração
ESP32_URL = "http://localhost:9080"
API_URL = "http://localhost:8000"

def print_section(title):
    """Imprime seção formatada"""
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)

def test_esp32_connection():
    """Testa conexão com ESP32"""
    print_section("TESTE 1: Conexão com ESP32")
    
    try:
        response = requests.get(f"{ESP32_URL}/", timeout=5)
        if response.status_code == 200:
            print("✓ ESP32 Mock Server está online")
            return True
        else:
            print(f"✗ ESP32 retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Erro ao conectar: {e}")
        print("\n⚠️  Certifique-se de que o mock server está rodando:")
        print("   python3 src/test_esp32_mock.py")
        return False

def test_esp32_endpoints():
    """Testa endpoints do ESP32"""
    print_section("TESTE 2: Endpoints do ESP32")
    
    # Teste /api/reading
    try:
        response = requests.get(f"{ESP32_URL}/api/reading", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✓ GET /api/reading - OK")
            print(f"  Última leitura: {data['kw']:.2f} kW em {data['ts']}")
            print(f"  Temperatura: {data['temp_ext']:.1f}°C")
            print(f"  Anomalia: {'Sim' if data['is_anomaly'] else 'Não'}")
        else:
            print(f"✗ GET /api/reading - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Erro: {e}")
        return False
    
    # Teste /api/readings
    try:
        response = requests.get(f"{ESP32_URL}/api/readings?limit=5", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ GET /api/readings - OK ({len(data)} leituras)")
        else:
            print(f"✗ GET /api/readings - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Erro: {e}")
        return False
    
    # Teste /api/stats
    try:
        response = requests.get(f"{ESP32_URL}/api/stats", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✓ GET /api/stats - OK")
            print(f"  Total de leituras: {data['total_readings']}")
            print(f"  Consumo médio: {data['avg_kw']:.2f} kW")
            print(f"  Anomalias: {data['anomalies_count']}")
        else:
            print(f"✗ GET /api/stats - Status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Erro: {e}")
        return False
    
    return True

def test_data_format():
    """Testa formato dos dados"""
    print_section("TESTE 3: Formato dos Dados")
    
    try:
        response = requests.get(f"{ESP32_URL}/api/reading", timeout=5)
        data = response.json()
        
        # Verificar campos obrigatórios
        required_fields = [
            'ts', 'org_id', 'site_id', 'andar', 'device_id', 'device_type',
            'kw', 'kwh_interval', 'emissoes_tco2e', 'temp_ext',
            'eh_fds', 'eh_horario_comercial', 'is_anomaly'
        ]
        
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"✗ Campos faltando: {missing_fields}")
            return False
        
        print("✓ Todos os campos obrigatórios presentes")
        
        # Verificar tipos
        checks = [
            (isinstance(data['ts'], str), 'ts é string'),
            (isinstance(data['kw'], (int, float)), 'kw é numérico'),
            (isinstance(data['kwh_interval'], (int, float)), 'kwh_interval é numérico'),
            (isinstance(data['emissoes_tco2e'], (int, float)), 'emissoes_tco2e é numérico'),
            (isinstance(data['temp_ext'], (int, float)), 'temp_ext é numérico'),
            (data['eh_fds'] in [0, 1], 'eh_fds é 0 ou 1'),
            (data['eh_horario_comercial'] in [0, 1], 'eh_horario_comercial é 0 ou 1'),
            (data['is_anomaly'] in [0, 1], 'is_anomaly é 0 ou 1'),
        ]
        
        all_ok = True
        for check, desc in checks:
            if check:
                print(f"✓ {desc}")
            else:
                print(f"✗ {desc}")
                all_ok = False
        
        # Verificar formato do timestamp
        try:
            datetime.strptime(data['ts'], "%Y-%m-%d %H:%M:%S")
            print("✓ Formato de timestamp válido")
        except ValueError:
            print("✗ Formato de timestamp inválido")
            all_ok = False
        
        return all_ok
        
    except Exception as e:
        print(f"✗ Erro: {e}")
        return False

def test_api_connection():
    """Testa conexão com API"""
    print_section("TESTE 4: Conexão com API FastAPI")
    
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✓ API FastAPI está online")
            print(f"  Status: {data.get('status', 'unknown')}")
            print(f"  Total de registros: {data.get('total_records', 0):,}")
            return True
        else:
            print(f"✗ API retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Erro ao conectar: {e}")
        print("\n⚠️  Certifique-se de que a API está rodando:")
        print("   uvicorn src.main:app --reload")
        return False

def test_send_to_api():
    """Testa envio de dados para API"""
    print_section("TESTE 5: Envio de Dados para API")
    
    # Obter leitura do ESP32
    try:
        response = requests.get(f"{ESP32_URL}/api/reading", timeout=5)
        reading = response.json()
        print(f"✓ Leitura obtida do ESP32: {reading['kw']:.2f} kW")
    except Exception as e:
        print(f"✗ Erro ao obter leitura: {e}")
        return False
    
    # Enviar para API
    try:
        response = requests.post(
            f"{API_URL}/api/readings",
            json=reading,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            print("✓ Leitura enviada com sucesso para API")
            print(f"  ID: {data.get('id', 'N/A')}")
            print(f"  Device ID: {data.get('device_id', 'N/A')}")
            print(f"  Consumo: {data.get('kw', 0):.2f} kW")
            return True
        else:
            print(f"✗ API retornou status {response.status_code}")
            print(f"  Resposta: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Erro ao enviar: {e}")
        return False

def test_continuous_collection():
    """Testa coleta contínua"""
    print_section("TESTE 6: Coleta Contínua (3 leituras)")
    
    success_count = 0
    
    for i in range(3):
        try:
            # Obter leitura
            response = requests.get(f"{ESP32_URL}/api/reading", timeout=5)
            reading = response.json()
            
            # Enviar para API
            response = requests.post(
                f"{API_URL}/api/readings",
                json=reading,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                success_count += 1
                print(f"✓ Leitura {i+1}/3: {reading['kw']:.2f} kW enviada")
            else:
                print(f"✗ Leitura {i+1}/3: Falha ao enviar")
            
            time.sleep(2)  # Aguardar 2 segundos entre leituras
            
        except Exception as e:
            print(f"✗ Erro na leitura {i+1}/3: {e}")
    
    print(f"\n✓ {success_count}/3 leituras enviadas com sucesso")
    return success_count == 3

def test_verify_in_api():
    """Verifica se dados estão na API"""
    print_section("TESTE 7: Verificação de Dados na API")
    
    try:
        # Buscar leituras do dispositivo ESP32
        response = requests.get(
            f"{API_URL}/readings",
            params={
                "device_id": "esp32_sensor_001",
                "limit": 10
            },
            timeout=10
        )
        
        if response.status_code == 200:
            readings = response.json()
            print(f"✓ {len(readings)} leituras encontradas na API")
            
            if readings:
                latest = readings[0]
                print(f"\nÚltima leitura:")
                print(f"  ID: {latest.get('id')}")
                print(f"  Timestamp: {latest.get('ts')}")
                print(f"  Consumo: {latest.get('kw'):.2f} kW")
                print(f"  Device: {latest.get('device_id')}")
                return True
            else:
                print("⚠️  Nenhuma leitura encontrada")
                return False
        else:
            print(f"✗ API retornou status {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Erro: {e}")
        return False

def main():
    """Executa todos os testes"""
    print("=" * 80)
    print("TESTE DE INTEGRAÇÃO ESP32 + API FASTAPI")
    print("=" * 80)
    print(f"ESP32 Mock: {ESP32_URL}")
    print(f"API FastAPI: {API_URL}")
    print("=" * 80)
    
    results = []
    
    # Executar testes
    results.append(("Conexão ESP32", test_esp32_connection()))
    results.append(("Endpoints ESP32", test_esp32_endpoints()))
    results.append(("Formato de Dados", test_data_format()))
    results.append(("Conexão API", test_api_connection()))
    results.append(("Envio para API", test_send_to_api()))
    results.append(("Coleta Contínua", test_continuous_collection()))
    results.append(("Verificação na API", test_verify_in_api()))
    
    # Resumo
    print_section("RESUMO DOS TESTES")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSOU" if result else "✗ FALHOU"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n🎉 Todos os testes passaram! Sistema funcionando corretamente.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} teste(s) falharam. Verifique os erros acima.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())

