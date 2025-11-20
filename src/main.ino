//  * ESP32 IoT Energy Monitor - GREEN WORK HUB
//  * 
//  * Simula um dispositivo IoT que monitora consumo de energia
//  * e expõe dados via API HTTP no formato do projeto
//  * 
//  * Endpoints:
//  * - GET /api/reading - Retorna última leitura
//  * - GET /api/readings - Retorna últimas N leituras
//  * - GET /api/stats - Estatísticas do dispositivo
//  * 
//  * NOTA: Este arquivo é uma cópia de esp32-http-server.ino
//  * para facilitar o uso no Wokwi (que espera main.ino)

#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <uri/UriBraces.h>
#include <ArduinoJson.h>
#include <time.h>
#include <math.h>

#ifndef PI
#define PI 3.14159265358979323846
#endif

// ============================================================================
// CONFIGURAÇÃO WIFI
// ============================================================================
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define WIFI_CHANNEL 6

// ============================================================================
// CONFIGURAÇÃO DO DISPOSITIVO
// ============================================================================
#define ORG_ID "org_greenhub"
#define SITE_ID "site_centro"
#define ANDAR 1
#define DEVICE_ID "esp32_sensor_001"
#define DEVICE_TYPE "HVAC"

// ============================================================================
// PINOS
// ============================================================================
#define LED_STATUS 2
// Sensores removidos - todos os valores serão simulados

// ============================================================================
// CONSTANTES
// ============================================================================
#define FE_GRID 0.08  // Fator de emissão (kgCO2e/kWh)
#define READING_INTERVAL_MS 3000  // 3 segundos em ms (tempo real)
#define MAX_READINGS 100  // Máximo de leituras em memória

// ============================================================================
// OBJETOS
// ============================================================================
WebServer server(80);
// Sensores removidos - usando simulação

// ============================================================================
// ESTRUTURA DE DADOS
// ============================================================================
struct EnergyReading {
  String timestamp;
  float kw;
  float kwh_interval;
  float emissoes_tco2e;
  float temp_ext;
  bool eh_fds;
  bool eh_horario_comercial;
  bool is_anomaly;
};

EnergyReading readings[MAX_READINGS];
int readingCount = 0;
int readingIndex = 0;
unsigned long lastReadingTime = 0;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

String getTimestamp() {
  time_t now = time(nullptr);
  
  // Se time não estiver disponível, retornar timestamp padrão
  if (now <= 0 || now >= 2147483647) {
    return "2025-01-01 12:00:00";
  }
  
  struct tm timeinfo;
  if (localtime_r(&now, &timeinfo) == NULL) {
    return "2025-01-01 12:00:00";
  }
  
  char buffer[30];
  if (strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo) == 0) {
    return "2025-01-01 12:00:00";
  }
  
  return String(buffer);
}

bool isWeekend() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  int dayOfWeek = timeinfo.tm_wday;  // 0=domingo, 6=sábado
  return (dayOfWeek == 0 || dayOfWeek == 6);
}

bool isBusinessHours() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  int hour = timeinfo.tm_hour;
  return (hour >= 8 && hour < 18);
}

float readPowerConsumption() {
  // SIMULAR consumo de energia (sem sensor físico)
  // Base: 15 kW com variações baseadas em horário
  
  time_t now = time(nullptr);
  float kw = 15.0;  // Consumo base
  
  if (now > 0 && now < 2147483647) {
    struct tm timeinfo;
    if (localtime_r(&now, &timeinfo) != NULL) {
      int hour = timeinfo.tm_hour;
      
      // Simular curva de consumo (pico às 14h)
      // Usar função seno para curva suave
      float horaFactor = 0.5 + 0.5 * sin((hour - 6) * PI / 12.0);
      if (horaFactor < 0) horaFactor = 0.3;  // Mínimo 30% do consumo
      kw = 10.0 + (20.0 * horaFactor);  // Entre 10 e 30 kW
      
      // Adicionar variação aleatória (ruído)
      kw += random(-200, 200) / 100.0;  // ±2 kW de variação
      
      // Ajustar para fim de semana
      if (isWeekend()) {
        kw *= 0.5;
      }
      
      // Ajustar para horário comercial
      if (!isBusinessHours()) {
        kw *= 0.3;
      }
    }
  }
  
  // Garantir valores válidos
  if (kw < 0) kw = 0;
  if (kw > 50) kw = 50;
  
  return kw;
}

float readTemperature() {
  // SIMULAR temperatura externa (sem sensor físico)
  // Base: 26°C com variações sazonais e diárias
  
  time_t now = time(nullptr);
  float temp = 26.0;  // Temperatura base
  
  if (now > 0 && now < 2147483647) {
    struct tm timeinfo;
    if (localtime_r(&now, &timeinfo) != NULL) {
      int dayOfYear = timeinfo.tm_yday;
      int hour = timeinfo.tm_hour;
      
      // Variação sazonal (ano completo)
      float seasonal = 4.0 * sin(2 * PI * dayOfYear / 365.0);
      
      // Variação diária (mais quente à tarde)
      float daily = 3.0 * sin((hour - 6) * PI / 12.0);
      if (daily < 0) daily = 0;  // Não deixar muito frio à noite
      
      // Temperatura base + sazonal + diária + ruído
      temp = 24.0 + seasonal + daily + (random(-10, 10) / 10.0);
    }
  }
  
  // Garantir valores válidos (entre 15°C e 35°C)
  if (temp < 15.0) temp = 15.0;
  if (temp > 35.0) temp = 35.0;
  
  return temp;
}

bool detectAnomaly(float kw, float prevKw) {
  // Detectar picos ou quedas bruscas
  if (readingCount > 0 && prevKw > 0) {
    float change = abs(kw - prevKw) / prevKw;
    if (change > 2.0 || (change > 0.9 && kw < prevKw * 0.1)) {
      return true;
    }
  }
  return false;
}

EnergyReading takeReading() {
  EnergyReading reading;
  
  float kw = readPowerConsumption();
  float temp = readTemperature();
  float prevKw = (readingCount > 0) ? readings[(readingIndex - 1 + MAX_READINGS) % MAX_READINGS].kw : kw;
  
  reading.timestamp = getTimestamp();
  reading.kw = kw;
  reading.kwh_interval = kw * (3.0 / 3600.0);  // 3 segundos em horas (3/3600)
  reading.emissoes_tco2e = (reading.kwh_interval * FE_GRID) / 1000.0;  // Converter para toneladas
  reading.temp_ext = temp;
  reading.eh_fds = isWeekend();
  reading.eh_horario_comercial = isBusinessHours();
  reading.is_anomaly = detectAnomaly(kw, prevKw);
  
  return reading;
}

void saveReading(EnergyReading reading) {
  readings[readingIndex] = reading;
  readingIndex = (readingIndex + 1) % MAX_READINGS;
  if (readingCount < MAX_READINGS) {
    readingCount++;
  }
}

String readingToJson(EnergyReading reading) {
  StaticJsonDocument<512> doc;
  
  doc["ts"] = reading.timestamp;
  doc["org_id"] = ORG_ID;
  doc["site_id"] = SITE_ID;
  doc["andar"] = ANDAR;
  doc["device_id"] = DEVICE_ID;
  doc["device_type"] = DEVICE_TYPE;
  doc["kw"] = reading.kw;
  doc["kwh_interval"] = reading.kwh_interval;
  doc["emissoes_tco2e"] = reading.emissoes_tco2e;
  doc["temp_ext"] = reading.temp_ext;
  doc["eh_fds"] = reading.eh_fds ? 1 : 0;
  doc["eh_horario_comercial"] = reading.eh_horario_comercial ? 1 : 0;
  doc["is_anomaly"] = reading.is_anomaly ? 1 : 0;
  
  String output;
  serializeJson(doc, output);
  return output;
}

// ============================================================================
// HANDLERS HTTP
// ============================================================================

void handleRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <title>GREEN WORK HUB - ESP32 Energy Monitor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #2c3e50; }
    .endpoint { background: #ecf0f1; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .endpoint code { color: #e74c3c; }
    .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
    .status.online { background: #d4edda; color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌱 GREEN WORK HUB</h1>
    <h2>ESP32 Energy Monitor</h2>
    
    <div class="status online">
      <strong>Status:</strong> Online
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
      <li><strong>Org ID:</strong> )" + String(ORG_ID) + R"(</li>
      <li><strong>Site ID:</strong> )" + String(SITE_ID) + R"(</li>
      <li><strong>Andar:</strong> )" + String(ANDAR) + R"(</li>
      <li><strong>Device ID:</strong> )" + String(DEVICE_ID) + R"(</li>
      <li><strong>Device Type:</strong> )" + String(DEVICE_TYPE) + R"(</li>
    </ul>
    
    <p><a href="/api/reading">Ver última leitura →</a></p>
  </div>
</body>
</html>
  )";
  
  server.send(200, "text/html", html);
}

void handleReading() {
  if (readingCount == 0) {
    server.send(404, "application/json", "{\"error\":\"No readings available\"}");
    return;
  }
  
  int lastIdx = (readingIndex - 1 + MAX_READINGS) % MAX_READINGS;
  String json = readingToJson(readings[lastIdx]);
  server.send(200, "application/json", json);
}

void handleReadings() {
  int limit = server.arg("limit").toInt();
  if (limit <= 0) limit = 10;
  if (limit > MAX_READINGS) limit = MAX_READINGS;
  if (limit > readingCount) limit = readingCount;
  
  // Tamanho fixo suficiente para até 100 leituras
  StaticJsonDocument<16384> doc;  // ~160 bytes por leitura * 100
  JsonArray readingsArray = doc.to<JsonArray>();
  
  int startIdx = (readingIndex - limit + MAX_READINGS) % MAX_READINGS;
  
  for (int i = 0; i < limit; i++) {
    int idx = (startIdx + i) % MAX_READINGS;
    JsonObject reading = readingsArray.createNestedObject();
    
    reading["ts"] = readings[idx].timestamp;
    reading["org_id"] = ORG_ID;
    reading["site_id"] = SITE_ID;
    reading["andar"] = ANDAR;
    reading["device_id"] = DEVICE_ID;
    reading["device_type"] = DEVICE_TYPE;
    reading["kw"] = readings[idx].kw;
    reading["kwh_interval"] = readings[idx].kwh_interval;
    reading["emissoes_tco2e"] = readings[idx].emissoes_tco2e;
    reading["temp_ext"] = readings[idx].temp_ext;
    reading["eh_fds"] = readings[idx].eh_fds ? 1 : 0;
    reading["eh_horario_comercial"] = readings[idx].eh_horario_comercial ? 1 : 0;
    reading["is_anomaly"] = readings[idx].is_anomaly ? 1 : 0;
  }
  
  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

void handleStats() {
  if (readingCount == 0) {
    server.send(404, "application/json", "{\"error\":\"No readings available\"}");
    return;
  }
  
  float totalKw = 0;
  float totalKwh = 0;
  float totalEmissions = 0;
  float avgTemp = 0;
  int anomalies = 0;
  float minKw = 9999;
  float maxKw = 0;
  
  for (int i = 0; i < readingCount; i++) {
    totalKw += readings[i].kw;
    totalKwh += readings[i].kwh_interval;
    totalEmissions += readings[i].emissoes_tco2e;
    avgTemp += readings[i].temp_ext;
    if (readings[i].is_anomaly) anomalies++;
    if (readings[i].kw < minKw) minKw = readings[i].kw;
    if (readings[i].kw > maxKw) maxKw = readings[i].kw;
  }
  
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["device_type"] = DEVICE_TYPE;
  doc["total_readings"] = readingCount;
  doc["total_kw"] = totalKw;
  doc["total_kwh"] = totalKwh;
  doc["total_emissions_tco2e"] = totalEmissions;
  doc["avg_temp"] = avgTemp / readingCount;
  doc["anomalies_count"] = anomalies;
  doc["min_kw"] = minKw;
  doc["max_kw"] = maxKw;
  doc["avg_kw"] = totalKw / readingCount;
  
  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  // IMPORTANTE: Serial.begin PRIMEIRO e aguardar estabilização
  Serial.begin(115200);
  delay(1000);  // Aguardar Serial estabilizar antes de qualquer print
  
  Serial.println();
  Serial.println("=== INICIANDO ESP32 ===");
  Serial.println("Inicializando pinos...");
  
  pinMode(LED_STATUS, OUTPUT);
  digitalWrite(LED_STATUS, LOW);
  
  // Sensores físicos removidos - usando simulação
  Serial.println("Modo: Simulação (sem sensores físicos)");
  
  // Configurar NTP para timestamps (ANTES de conectar WiFi)
  Serial.println("Configurando NTP...");
  configTime(0, 0, "pool.ntp.org");
  
  // Conectar WiFi
  Serial.print("Conectando ao WiFi ");
  Serial.print(WIFI_SSID);
  Serial.print("...");
  
  // Definir modo WiFi antes de conectar
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, WIFI_CHANNEL);
  
  int wifi_timeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifi_timeout < 50) {
    delay(100);
    Serial.print(".");
    digitalWrite(LED_STATUS, !digitalRead(LED_STATUS));  // Piscar LED
    wifi_timeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_STATUS, HIGH);  // LED aceso = conectado
  } else {
    Serial.println(" FALHOU!");
    Serial.println("Continuando sem WiFi...");
  }
  
  // Aguardar sincronização NTP (com timeout)
  Serial.print("Sincronizando horário");
  int ntp_timeout = 0;
  while (time(nullptr) < 1000000000 && ntp_timeout < 30) {
    delay(100);
    Serial.print(".");
    ntp_timeout++;
  }
  
  if (time(nullptr) >= 1000000000) {
    Serial.println(" OK");
  } else {
    Serial.println(" TIMEOUT (usando horário local)");
    // Configurar horário manualmente se NTP falhar
    struct tm timeinfo;
    timeinfo.tm_year = 125;  // 2025
    timeinfo.tm_mon = 0;     // Janeiro
    timeinfo.tm_mday = 1;
    timeinfo.tm_hour = 12;
    timeinfo.tm_min = 0;
    timeinfo.tm_sec = 0;
    timeinfo.tm_isdst = 0;
    time_t t = mktime(&timeinfo);
    struct timeval tv;
    tv.tv_sec = t;
    tv.tv_usec = 0;
    settimeofday(&tv, NULL);
  }
  
  // Configurar rotas do servidor HTTP
  Serial.println("Configurando servidor HTTP...");
  server.on("/", handleRoot);
  server.on("/api/reading", handleReading);
  server.on("/api/readings", handleReadings);
  server.on("/api/stats", handleStats);
  
  server.begin();
  Serial.println("Servidor HTTP iniciado");
  Serial.println("Endpoints:");
  Serial.println("  GET /api/reading");
  Serial.println("  GET /api/readings?limit=N");
  Serial.println("  GET /api/stats");
  
  // Fazer primeira leitura (com delay para garantir que tudo está pronto)
  delay(500);  // Pequeno delay antes da primeira leitura
  Serial.println("Fazendo primeira leitura...");
  
  // Verificar se time está disponível antes de fazer leitura
  time_t testTime = time(nullptr);
  if (testTime > 0 && testTime < 2147483647) {
    EnergyReading firstReading = takeReading();
    saveReading(firstReading);
    lastReadingTime = millis();
    Serial.println("Primeira leitura concluída");
  } else {
    Serial.println("Aguardando sincronização de tempo para primeira leitura...");
    // Inicializar com valores padrão mesmo sem time
    lastReadingTime = millis();
  }
  
  Serial.println("\n=== DISPOSITIVO PRONTO ===");
  Serial.flush();  // Garantir que todas as mensagens foram enviadas
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
  server.handleClient();
  
  // Fazer leitura a cada 3 segundos (tempo real)
  unsigned long currentTime = millis();
  if (currentTime - lastReadingTime >= READING_INTERVAL_MS) {
    EnergyReading reading = takeReading();
    saveReading(reading);
    lastReadingTime = currentTime;
    
    // Imprimir leitura no Serial (apenas resumo para não poluir)
    Serial.print("[");
    Serial.print(reading.timestamp);
    Serial.print("] ");
    Serial.print("kW: ");
    Serial.print(reading.kw, 2);
    Serial.print(" | Temp: ");
    Serial.print(reading.temp_ext, 1);
    Serial.print("°C | Anomalia: ");
    Serial.println(reading.is_anomaly ? "SIM" : "NAO");
  }
  
  delay(50);  // Delay menor para resposta mais rápida do servidor
}

