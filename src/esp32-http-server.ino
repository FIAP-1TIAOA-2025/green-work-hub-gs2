/*
 * ESP32 IoT Energy Monitor - GREEN WORK HUB
 * 
 * Simula um dispositivo IoT que monitora consumo de energia
 * e expõe dados via API HTTP no formato do projeto
 * 
 * Endpoints:
 * - GET /api/reading - Retorna última leitura
 * - GET /api/readings - Retorna últimas N leituras
 * - GET /api/stats - Estatísticas do dispositivo
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <uri/UriBraces.h>
#include <OneWire.h>
#include <DallasTemperature.h>
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
#define TEMP_SENSOR_PIN 4
#define POWER_SENSOR_PIN 34  // ADC1_CH6 (GPIO34)

// ============================================================================
// CONSTANTES
// ============================================================================
#define FE_GRID 0.08  // Fator de emissão (kgCO2e/kWh)
#define READING_INTERVAL_MS 900000  // 15 minutos em ms
#define MAX_READINGS 100  // Máximo de leituras em memória

// ============================================================================
// OBJETOS
// ============================================================================
WebServer server(80);
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature tempSensor(&oneWire);

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
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
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
  // Ler potenciômetro (0-4095) e converter para kW (0-30 kW)
  int adcValue = analogRead(POWER_SENSOR_PIN);
  float kw = (adcValue / 4095.0) * 30.0;
  
  // Adicionar variação baseada em horário
  time_t now = time(nullptr);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  int hour = timeinfo.tm_hour;
  
  // Simular curva de consumo (pico às 14h)
  float horaFactor = 0.3 + 1.2 * exp(-pow((hour - 14), 2) / (2 * pow(6, 2)));
  kw *= horaFactor;
  
  // Ajustar para fim de semana
  if (isWeekend()) {
    kw *= 0.5;
  }
  
  // Ajustar para horário comercial
  if (!isBusinessHours()) {
    kw *= 0.3;
  }
  
  return kw;
}

float readTemperature() {
  tempSensor.requestTemperatures();
  float temp = tempSensor.getTempCByIndex(0);
  
  // Se sensor não disponível, simular temperatura
  if (temp == -127.0 || temp == 85.0) {
    time_t now = time(nullptr);
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);
    int dayOfYear = timeinfo.tm_yday;
    
    // Simular temperatura com sazonalidade
    temp = 26.0 + 4.0 * sin(2 * PI * dayOfYear / 365.0) + random(-15, 15) / 10.0;
  }
  
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
  reading.kwh_interval = kw * (15.0 / 60.0);  // 15 minutos em horas
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
  Serial.begin(115200);
  pinMode(LED_STATUS, OUTPUT);
  pinMode(POWER_SENSOR_PIN, INPUT);
  
  // Inicializar sensor de temperatura
  tempSensor.begin();
  
  // Configurar NTP para timestamps
  configTime(0, 0, "pool.ntp.org");
  
  // Conectar WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, WIFI_CHANNEL);
  Serial.print("Conectando ao WiFi ");
  Serial.print(WIFI_SSID);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
    digitalWrite(LED_STATUS, !digitalRead(LED_STATUS));  // Piscar LED
  }
  
  Serial.println(" Conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  digitalWrite(LED_STATUS, HIGH);  // LED aceso = conectado
  
  // Aguardar sincronização NTP
  Serial.print("Sincronizando horário");
  while (time(nullptr) < 1000000000) {
    delay(100);
    Serial.print(".");
  }
  Serial.println(" OK");
  
  // Configurar rotas
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
  
  // Fazer primeira leitura
  EnergyReading firstReading = takeReading();
  saveReading(firstReading);
  lastReadingTime = millis();
  
  Serial.println("\nDispositivo pronto!");
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
  server.handleClient();
  
  // Fazer leitura a cada 15 minutos (ou 1 minuto para teste)
  unsigned long currentTime = millis();
  if (currentTime - lastReadingTime >= READING_INTERVAL_MS) {
    EnergyReading reading = takeReading();
    saveReading(reading);
    lastReadingTime = currentTime;
    
    Serial.println("\n=== Nova Leitura ===");
    Serial.println(readingToJson(reading));
    Serial.print("Total de leituras: ");
    Serial.println(readingCount);
  }
  
  delay(100);
}
