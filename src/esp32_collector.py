"""
============================================================================
COLETOR DE DADOS DO ESP32
============================================================================
Script Python para coletar dados do ESP32 e enviar para a API FastAPI
============================================================================
"""

import requests
import time
import json
from datetime import datetime
from typing import Optional

class ESP32Collector:
    def __init__(self, esp32_ip: str, api_url: str = "http://localhost:8000"):
        """
        Inicializa o coletor
        
        Args:
            esp32_ip: IP do ESP32 (ex: "192.168.1.100" ou "localhost:9080" para Wokwi)
            api_url: URL da API FastAPI
        """
        self.esp32_ip = esp32_ip
        self.api_url = api_url
        self.esp32_base_url = f"http://{esp32_ip}"
        
    def get_reading(self) -> Optional[dict]:
        """Obtém a última leitura do ESP32"""
        try:
            response = requests.get(f"{self.esp32_base_url}/api/reading", timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Erro ao obter leitura: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Erro de conexão com ESP32: {e}")
            return None
    
    def get_readings(self, limit: int = 10) -> Optional[list]:
        """Obtém múltiplas leituras do ESP32"""
        try:
            response = requests.get(
                f"{self.esp32_base_url}/api/readings",
                params={"limit": limit},
                timeout=5
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Erro ao obter leituras: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Erro de conexão com ESP32: {e}")
            return None
    
    def get_stats(self) -> Optional[dict]:
        """Obtém estatísticas do ESP32"""
        try:
            response = requests.get(f"{self.esp32_base_url}/api/stats", timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Erro ao obter estatísticas: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Erro de conexão com ESP32: {e}")
            return None
    
    def send_to_api(self, reading: dict) -> bool:
        """Envia leitura para a API FastAPI"""
        try:
            # Converter formato do ESP32 para formato da API
            # (se necessário ajustar campos)
            response = requests.post(
                f"{self.api_url}/api/readings",
                json=reading,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print(f"✓ Leitura enviada: {reading['kw']:.2f} kW em {reading['ts']}")
                return True
            else:
                print(f"✗ Erro ao enviar: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"✗ Erro de conexão com API: {e}")
            return False
    
    def collect_continuous(self, interval_seconds: int = 900):
        """
        Coleta dados continuamente do ESP32 e envia para a API
        
        Args:
            interval_seconds: Intervalo entre coletas (padrão: 900 = 15 minutos)
        """
        print("=" * 80)
        print("COLETOR ESP32 - GREEN WORK HUB")
        print("=" * 80)
        print(f"ESP32: {self.esp32_base_url}")
        print(f"API: {self.api_url}")
        print(f"Intervalo: {interval_seconds} segundos ({interval_seconds/60:.1f} minutos)")
        print("=" * 80)
        print()
        
        while True:
            try:
                # Obter última leitura
                reading = self.get_reading()
                
                if reading:
                    # Enviar para API
                    success = self.send_to_api(reading)
                    
                    if success:
                        print(f"  Timestamp: {reading['ts']}")
                        print(f"  Consumo: {reading['kw']:.2f} kW")
                        print(f"  Temperatura: {reading['temp_ext']:.1f}°C")
                        print(f"  Anomalia: {'Sim' if reading['is_anomaly'] else 'Não'}")
                        print()
                else:
                    print("⚠️  Nenhuma leitura disponível no ESP32")
                    print()
                
                # Aguardar próximo intervalo
                print(f"⏳ Aguardando {interval_seconds} segundos até próxima coleta...")
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\n\nColeta interrompida pelo usuário")
                break
            except Exception as e:
                print(f"\n✗ Erro inesperado: {e}")
                print("Aguardando antes de tentar novamente...")
                time.sleep(60)


if __name__ == "__main__":
    import sys
    import os
    
    # Configuração
    # Para Wokwi: use "localhost:9080"
    # Para ESP32 real: use o IP do dispositivo (ex: "192.168.1.100")
    ESP32_IP = os.getenv("ESP32_IP", "localhost:9080")
    API_URL = os.getenv("API_URL", "http://localhost:8000")
    INTERVAL = int(os.getenv("COLLECT_INTERVAL", "900"))  # 15 minutos
    
    collector = ESP32Collector(ESP32_IP, API_URL)
    
    # Verificar conexão com ESP32
    print("Verificando conexão com ESP32...")
    stats = collector.get_stats()
    if stats:
        print(f"✓ ESP32 conectado!")
        print(f"  Device ID: {stats['device_id']}")
        print(f"  Total de leituras: {stats['total_readings']}")
        print()
    else:
        print("✗ Não foi possível conectar ao ESP32")
        print("  Verifique:")
        print("  1. ESP32 está rodando e conectado à rede")
        print("  2. IP está correto")
        print("  3. Para Wokwi, use: ESP32_IP=localhost:9080")
        sys.exit(1)
    
    # Verificar conexão com API
    print("Verificando conexão com API...")
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            print(f"✓ API conectada!")
            print(f"  Status: {response.json()}")
            print()
        else:
            print(f"⚠️  API retornou status {response.status_code}")
    except Exception as e:
        print(f"✗ Não foi possível conectar à API: {e}")
        print("  Certifique-se de que a API está rodando")
        sys.exit(1)
    
    # Iniciar coleta contínua
    collector.collect_continuous(INTERVAL)

