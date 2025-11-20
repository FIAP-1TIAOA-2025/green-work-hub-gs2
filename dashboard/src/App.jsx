import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const IoTEnergyMonitor = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalKwh: 0,
    totalDevices: 0,
    activeDevices: 0,
    totalEmissions: 0
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8000');
  const lastTimestampRef = useRef(null);

  // Fatores de emissão (kgCO2e/kWh)
  const EMISSION_FACTOR = 0.08; // Fator usado no projeto (FE_GRID)

  // Função para buscar dados da API
  const fetchReadings = async () => {
    try {
      // Buscar últimas leituras (últimas 100) - API já retorna ordenado por ts desc
      const response = await fetch(`${apiUrl}/readings?limit=100`);
      if (!response.ok) throw new Error('Erro ao buscar leituras');
      
      const readings = await response.json();
      if (!readings || readings.length === 0) {
        setIsConnected(false);
        return;
      }

      setIsConnected(true);
      setLastUpdate(new Date());

      // Agrupar leituras por device_id
      const devicesMap = new Map();
      const deviceBaselines = new Map();

      readings.forEach(reading => {
        const deviceId = reading.device_id || 'unknown';
        const deviceType = reading.device_type || 'unknown';
        
        if (!devicesMap.has(deviceId)) {
          devicesMap.set(deviceId, {
            id: deviceId,
            name: `${deviceType} - ${reading.site_id || 'N/A'}`,
            site: reading.site_id || 'N/A',
            floor: reading.andar?.toString() || 'N/A',
            type: deviceType.toLowerCase(),
            status: 'online',
            readings: [],
            totalKwh: 0,
            totalEmissions: 0
          });
          deviceBaselines.set(deviceId, reading.kw || 0);
        }

        const device = devicesMap.get(deviceId);
        device.readings.push(reading);
        device.totalKwh += reading.kwh_interval || 0;
        device.totalEmissions += reading.emissoes_tco2e || 0;
      });

      // Converter para array e calcular valores atuais
      const devicesArray = Array.from(devicesMap.values()).map(device => {
        const latestReading = device.readings[0]; // Mais recente (primeira do array ordenado)
        const baseline = deviceBaselines.get(device.id) || latestReading.kw || 0;
        
        // Calcular corrente e tensão estimados (se não disponíveis)
        const voltage = 220; // Valor padrão
        const current = (latestReading.kw / 0.22) || 0;
        const powerFactor = 0.90; // Valor padrão

        // Detectar anomalias
        if (latestReading.is_anomaly) {
          setAlerts(prev => {
            const newAlert = {
              id: `alert_${latestReading.id}_${device.id}`,
              deviceId: device.id,
              deviceName: device.name,
              type: 'anomaly',
              message: `Anomalia detectada: ${latestReading.kw.toFixed(1)} kW`,
              timestamp: new Date(latestReading.ts),
              severity: 'high'
            };
            // Evitar duplicatas
            if (prev.find(a => a.id === newAlert.id)) return prev;
            return [newAlert, ...prev.slice(0, 9)];
          });
        }

        return {
          ...device,
          kw: latestReading.kw || 0,
          kwh: device.totalKwh,
          voltage: voltage,
          current: current,
          powerFactor: powerFactor,
          baseline: baseline,
          lastUpdate: new Date(latestReading.ts),
          temperature: latestReading.temp_ext || 0,
          isAnomaly: latestReading.is_anomaly || false
        };
      });

      setDevices(devicesArray);
      if (!selectedDevice && devicesArray.length > 0) {
        setSelectedDevice(devicesArray[0]);
      } else if (selectedDevice) {
        // Atualizar dispositivo selecionado
        const updated = devicesArray.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }

      // Atualizar histórico para gráfico (últimas 60 leituras)
      // Agrupar leituras por timestamp para criar pontos do gráfico
      const timestampMap = new Map();
      
      // Processar todas as leituras e agrupar por timestamp
      readings.slice(0, 100).forEach(reading => {
        const ts = reading.ts;
        if (!timestampMap.has(ts)) {
          timestampMap.set(ts, { time: ts, readings: {} });
        }
        const point = timestampMap.get(ts);
        point.readings[reading.device_id] = reading.kw;
      });

      // Converter para array e ordenar por timestamp (mais antigo primeiro)
      const historical = Array.from(timestampMap.values())
        .sort((a, b) => new Date(a.time) - new Date(b.time))
        .slice(-60) // Últimas 60 leituras
        .map(point => {
          const timestamp = new Date(point.time);
          const timeStr = timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
          
          const chartPoint = { time: timeStr };
          devicesArray.forEach(device => {
            chartPoint[device.id] = point.readings[device.id] || null;
          });
          return chartPoint;
        });

      setHistoricalData(historical);

      // Calcular estatísticas globais
      const totalKwh = devicesArray.reduce((sum, d) => sum + d.totalKwh, 0);
      const totalEmissions = devicesArray.reduce((sum, d) => sum + d.totalEmissions, 0);
      const activeDevices = devicesArray.filter(d => d.status === 'online').length;

      setGlobalStats({
        totalKwh: totalKwh,
        totalDevices: devicesArray.length,
        activeDevices: activeDevices,
        totalEmissions: totalEmissions
      });

      // Atualizar timestamp de referência
      if (readings.length > 0) {
        lastTimestampRef.current = readings[0].ts;
      }

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setIsConnected(false);
    }
  };

  // Buscar dados iniciais
  useEffect(() => {
    fetchReadings();
  }, []);

  // Atualizar dados em tempo real a cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReadings();
    }, 3000); // Atualizar a cada 3 segundos (mesmo intervalo do ESP32)

    return () => clearInterval(interval);
  }, [apiUrl]);

  const totalEmissions = globalStats.totalEmissions || (globalStats.totalKwh * EMISSION_FACTOR);

  const getDeviceColor = (type) => {
    const colors = {
      hvac: '#3b82f6',
      lighting: '#eab308',
      datacenter: '#ef4444',
      elevator: '#8b5cf6',
      default: '#6b7280'
    };
    return colors[type] || colors.default;
  };

  const getStatusColor = (device) => {
    if (device.status === 'offline') return 'bg-gray-500';
    const diff = Math.abs(device.kw - device.baseline);
    if (diff > device.baseline * 0.25) return 'bg-red-500';
    if (diff > device.baseline * 0.15) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                🌱 GREEN WORK HUB - Monitor IoT
              </h1>
              <p className="text-slate-400">Sistema de monitoramento em tempo real via API</p>
              <div className="flex items-center gap-2 mt-2">
                {isConnected ? (
                  <>
                    <Wifi className="text-green-500" size={16} />
                    <span className="text-green-400 text-sm">Conectado à API</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="text-red-500" size={16} />
                    <span className="text-red-400 text-sm">Desconectado</span>
                  </>
                )}
                {lastUpdate && (
                  <span className="text-slate-500 text-xs ml-2">
                    Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={fetchReadings}
              className="px-6 py-3 rounded-lg font-semibold transition-all bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Atualizar Agora
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Consumo Total</span>
                <Zap className="text-yellow-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{globalStats.totalKwh.toFixed(2)} kWh</div>
              <div className="text-xs text-slate-400 mt-1">
                {totalEmissions.toFixed(3)} tCO₂e
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Dispositivos Ativos</span>
                <Activity className="text-green-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{globalStats.activeDevices}/{globalStats.totalDevices}</div>
              <div className="text-xs text-green-400 mt-1">
                {((globalStats.activeDevices / globalStats.totalDevices) * 100).toFixed(0)}% Online
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Emissões Totais</span>
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{totalEmissions.toFixed(6)} tCO₂e</div>
              <div className="text-xs text-slate-400 mt-1">
                {globalStats.totalKwh.toFixed(2)} kWh acumulado
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Alertas</span>
                <AlertTriangle className="text-orange-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <div className="text-xs text-slate-400 mt-1">
                {alerts.filter(a => a.severity === 'high').length} críticos
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Dispositivos */}
          <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Wifi size={20} />
              Dispositivos IoT
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {devices.map(device => (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedDevice?.id === device.id
                      ? 'bg-blue-600/30 border-2 border-blue-500'
                      : 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(device)} animate-pulse`} />
                      <span className="font-semibold text-sm">{device.name}</span>
                    </div>
                    {device.status === 'online' ? (
                      <Wifi size={14} className="text-green-500" />
                    ) : (
                      <WifiOff size={14} className="text-gray-500" />
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {device.site} • {device.floor}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{device.kw.toFixed(2)} kW</span>
                    <span className="text-slate-400">{device.temperature?.toFixed(1) || 'N/A'}°C</span>
                  </div>
                  {device.isAnomaly && (
                    <div className="mt-1 text-xs text-orange-400 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Anomalia detectada
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico e Detalhes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gráfico de Consumo */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-4">Consumo em Tempo Real (kW)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  {devices.slice(0, 4).map(device => (
                    <Line
                      key={device.id}
                      type="monotone"
                      dataKey={device.id}
                      stroke={getDeviceColor(device.type)}
                      name={device.name}
                      strokeWidth={selectedDevice?.id === device.id ? 3 : 1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Detalhes do Dispositivo Selecionado */}
            {selectedDevice && (
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <h2 className="text-xl font-bold mb-4">Detalhes: {selectedDevice.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Potência Ativa</div>
                    <div className="text-2xl font-bold">{selectedDevice.kw.toFixed(2)} kW</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Tensão</div>
                    <div className="text-2xl font-bold">{selectedDevice.voltage.toFixed(1)} V</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Corrente</div>
                    <div className="text-2xl font-bold">{selectedDevice.current.toFixed(1)} A</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Temperatura Externa</div>
                    <div className="text-2xl font-bold">{selectedDevice.temperature?.toFixed(1) || 'N/A'}°C</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Consumo Acumulado</div>
                    <div className="text-2xl font-bold">{selectedDevice.kwh.toFixed(4)} kWh</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Emissões Totais</div>
                    <div className="text-2xl font-bold">{selectedDevice.totalEmissions.toFixed(6)} tCO₂e</div>
                  </div>
                  {selectedDevice.isAnomaly && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 col-span-3">
                      <div className="text-xs text-red-400 mb-1 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Anomalia Detectada
                      </div>
                      <div className="text-sm text-red-300">Consumo fora do padrão normal</div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  Última atualização: {selectedDevice.lastUpdate.toLocaleTimeString('pt-BR')}
                </div>
              </div>
            )}

            {/* Alertas */}
            {alerts.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={20} />
                  Alertas Recentes
                </h2>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {alerts.map(alert => (
                    <div key={alert.id} className="bg-orange-900/20 border border-orange-700 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-orange-300">{alert.deviceName}</div>
                          <div className="text-xs text-slate-300 mt-1">{alert.message}</div>
                        </div>
                        <div className="text-xs text-slate-400">
                          {alert.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IoTEnergyMonitor;