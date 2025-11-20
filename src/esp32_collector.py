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
    
    def print_reading(self, reading: dict, index: int = None):
        """Imprime uma leitura formatada no console"""
        prefix = f"[{index}] " if index is not None else ""
        print(f"{prefix}Timestamp: {reading['ts']}")
        print(f"{' ' * len(prefix)}Consumo: {reading['kw']:.2f} kW")
        print(f"{' ' * len(prefix)}kWh (intervalo): {reading['kwh_interval']:.4f} kWh")
        print(f"{' ' * len(prefix)}Emissões: {reading['emissoes_tco2e']:.8f} tCO2e")
        print(f"{' ' * len(prefix)}Temperatura: {reading['temp_ext']:.1f}°C")
        print(f"{' ' * len(prefix)}Fim de semana: {'Sim' if reading['eh_fds'] else 'Não'}")
        print(f"{' ' * len(prefix)}Horário comercial: {'Sim' if reading['eh_horario_comercial'] else 'Não'}")
        print(f"{' ' * len(prefix)}Anomalia: {'Sim ⚠️' if reading['is_anomaly'] else 'Não ✓'}")
        print()
    
    def print_all_readings(self, limit: int = 100):
        """Obtém e imprime todas as leituras disponíveis"""
        print("=" * 80)
        print("OBTENDO TODAS AS LEITURAS DO ESP32")
        print("=" * 80)
        
        readings = self.get_readings(limit)
        if readings:
            print(f"\n📊 Total de leituras obtidas: {len(readings)}\n")
            print("-" * 80)
            
            for idx, reading in enumerate(readings, 1):
                print(f"\n📋 LEITURA {idx}/{len(readings)}")
                print("-" * 80)
                self.print_reading(reading, idx)
            
            print("=" * 80)
            print(f"✅ Total: {len(readings)} leituras exibidas")
            print("=" * 80)
            return readings
        else:
            print("⚠️  Nenhuma leitura disponível")
            return None
    
    def collect_continuous(self, interval_seconds: float = 3.0, show_all_readings: bool = False):
        """
        Coleta dados continuamente do ESP32 em tempo real e envia para a API
        
        Args:
            interval_seconds: Intervalo entre coletas em segundos (padrão: 3.0 = tempo real)
            show_all_readings: Se True, imprime todas as leituras disponíveis a cada ciclo
        """
        print("=" * 80)
        print("COLETOR ESP32 - GREEN WORK HUB (TEMPO REAL)")
        print("=" * 80)
        print(f"ESP32: {self.esp32_base_url}")
        print(f"API: {self.api_url}")
        print(f"Intervalo de coleta: {interval_seconds} segundos (tempo real)")
        print(f"Modo: {'Todas leituras' if show_all_readings else 'Apenas novas leituras'}")
        print("=" * 80)
        print()
        
        cycle_count = 0
        last_timestamp = None
        total_sent = 0
        
        while True:
            try:
                cycle_count += 1
                current_time = datetime.now().strftime("%H:%M:%S")
                
                if show_all_readings:
                    # Modo: obter todas as leituras
                    print(f"\n🔄 [{current_time}] CICLO {cycle_count} - Obtendo todas as leituras...")
                    all_readings = self.get_readings(limit=100)
                    
                    if all_readings:
                        print(f"📊 {len(all_readings)} leituras encontradas")
                        
                        # Filtrar apenas leituras novas (se tivermos timestamp anterior)
                        if last_timestamp:
                            new_readings = [r for r in all_readings if r['ts'] > last_timestamp]
                            if new_readings:
                                print(f"🆕 {len(new_readings)} novas leituras desde última coleta")
                                all_readings = new_readings
                            else:
                                print("ℹ️  Nenhuma leitura nova")
                                time.sleep(interval_seconds)
                                continue
                        
                        # Enviar todas as leituras
                        sent_count = 0
                        for reading in all_readings:
                            if self.send_to_api(reading):
                                sent_count += 1
                                total_sent += 1
                                # Imprimir leitura enviada
                                print(f"  ✓ [{sent_count}/{len(all_readings)}] {reading['ts']} - {reading['kw']:.2f} kW - {reading['temp_ext']:.1f}°C")
                        
                        print(f"✅ {sent_count}/{len(all_readings)} leituras enviadas (Total: {total_sent})")
                        
                        # Atualizar último timestamp
                        if all_readings:
                            last_timestamp = all_readings[-1]['ts']
                    else:
                        print("⚠️  Nenhuma leitura disponível")
                else:
                    # Modo tempo real: apenas última leitura (mais eficiente)
                    reading = self.get_reading()
                    
                    if reading:
                        # Verificar se é uma leitura nova
                        if last_timestamp and reading['ts'] <= last_timestamp:
                            # Leitura já processada, aguardar próxima
                            time.sleep(interval_seconds)
                            continue
                        
                        # Imprimir leitura
                        print(f"\n📋 [{current_time}] NOVA LEITURA:")
                        print("-" * 80)
                        self.print_reading(reading)
                        
                        # Enviar para API
                        if self.send_to_api(reading):
                            total_sent += 1
                            print(f"✅ Leitura enviada! (Total enviadas: {total_sent})")
                            last_timestamp = reading['ts']
                        else:
                            print("❌ Falha ao enviar leitura")
                    else:
                        print(f"⚠️  [{current_time}] Nenhuma leitura disponível")
                
                # Aguardar próximo intervalo (tempo real)
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("\n\n⏹️  Coleta interrompida pelo usuário")
                print(f"Total de ciclos: {cycle_count}")
                print(f"Total de leituras enviadas: {total_sent}")
                break
            except Exception as e:
                print(f"\n✗ Erro inesperado: {e}")
                import traceback
                traceback.print_exc()
                print("Aguardando antes de tentar novamente...")
                time.sleep(5)


if __name__ == "__main__":
    import sys
    import os
    
    # Configuração
    # Para Wokwi: use "localhost:9080"
    # Para ESP32 real: use o IP do dispositivo (ex: "192.168.1.100")
    ESP32_IP = os.getenv("ESP32_IP", "localhost:9080")
    API_URL = os.getenv("API_URL", "http://localhost:8000")
    INTERVAL = float(os.getenv("COLLECT_INTERVAL", "3.0"))  # 3 segundos (tempo real)
    
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
        print("  Continuando sem API (apenas exibição)...")
        print()
    
    # Perguntar se quer ver todas as leituras
    show_all = os.getenv("SHOW_ALL_READINGS", "true").lower() == "true"
    
    # Iniciar coleta contínua
    collector.collect_continuous(INTERVAL, show_all_readings=show_all)

