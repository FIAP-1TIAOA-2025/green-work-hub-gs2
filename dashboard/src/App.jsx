import React, { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const IoTEnergyMonitor = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalKwh: 0,
    totalDevices: 0,
    activeDevices: 0,
    avgPowerFactor: 0
  });

  // Fatores de emissão (kgCO2e/kWh)
  const EMISSION_FACTOR = 0.233; // Brasil (média nacional)

  // Inicializar dispositivos simulados
  useEffect(() => {
    const initialDevices = [
      { id: 'device_001', name: 'HVAC - Andar 1', site: 'Prédio Principal', floor: '1', type: 'hvac', status: 'online', baseline: 45 },
      { id: 'device_002', name: 'Iluminação - Andar 1', site: 'Prédio Principal', floor: '1', type: 'lighting', status: 'online', baseline: 12 },
      { id: 'device_003', name: 'HVAC - Andar 2', site: 'Prédio Principal', floor: '2', type: 'hvac', status: 'online', baseline: 48 },
      { id: 'device_004', name: 'Data Center', site: 'Prédio Principal', floor: 'Subsolo', type: 'datacenter', status: 'online', baseline: 85 },
      { id: 'device_005', name: 'Elevadores', site: 'Prédio Principal', floor: 'Todos', type: 'elevator', status: 'online', baseline: 18 },
      { id: 'device_006', name: 'HVAC - Andar 3', site: 'Prédio Principal', floor: '3', type: 'hvac', status: 'online', baseline: 42 }
    ];

    const devicesWithData = initialDevices.map(dev => ({
      ...dev,
      kwh: dev.baseline + (Math.random() - 0.5) * 5,
      kw: dev.baseline + (Math.random() - 0.5) * 5,
      voltage: 220 + (Math.random() - 0.5) * 10,
      current: (dev.baseline / 0.22) + (Math.random() - 0.5) * 20,
      powerFactor: 0.85 + Math.random() * 0.12,
      lastUpdate: new Date()
    }));

    setDevices(devicesWithData);
    if (!selectedDevice) setSelectedDevice(devicesWithData[0]);

    // Inicializar dados históricos
    const historical = [];
    for (let i = 60; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60000);
      historical.push({
        time: timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        ...devicesWithData.reduce((acc, dev) => {
          acc[dev.id] = dev.baseline + (Math.random() - 0.5) * 8;
          return acc;
        }, {})
      });
    }
    setHistoricalData(historical);
  }, []);

  // Simulação de dados em tempo real via MQTT
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const now = new Date();
      
      // Atualizar dispositivos
      setDevices(prevDevices => {
        const updated = prevDevices.map(dev => {
          const variation = (Math.random() - 0.5) * 6;
          const newKw = Math.max(0, dev.baseline + variation);
          const newVoltage = 220 + (Math.random() - 0.5) * 8;
          const newCurrent = (newKw / 0.22) + (Math.random() - 0.5) * 15;
          const newPf = Math.min(0.99, Math.max(0.75, 0.85 + (Math.random() - 0.5) * 0.15));

          // Detectar anomalias
          if (Math.abs(newKw - dev.baseline) > dev.baseline * 0.3) {
            setAlerts(prev => {
              const newAlert = {
                id: `alert_${Date.now()}_${dev.id}`,
                deviceId: dev.id,
                deviceName: dev.name,
                type: 'anomaly',
                message: `Consumo anormal detectado: ${newKw.toFixed(1)} kW (esperado ~${dev.baseline} kW)`,
                timestamp: now,
                severity: 'high'
              };
              return [newAlert, ...prev.slice(0, 9)];
            });
          }

          return {
            ...dev,
            kwh: dev.kwh + (newKw / 60),
            kw: newKw,
            voltage: newVoltage,
            current: newCurrent,
            powerFactor: newPf,
            lastUpdate: now
          };
        });

        // Calcular estatísticas globais
        const totalKwh = updated.reduce((sum, d) => sum + d.kwh, 0);
        const avgPf = updated.reduce((sum, d) => sum + d.powerFactor, 0) / updated.length;
        const active = updated.filter(d => d.status === 'online').length;

        setGlobalStats({
          totalKwh: totalKwh,
          totalDevices: updated.length,
          activeDevices: active,
          avgPowerFactor: avgPf
        });

        return updated;
      });

      // Atualizar histórico
      setHistoricalData(prevData => {
        const newPoint = {
          time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          ...devices.reduce((acc, dev) => {
            acc[dev.id] = dev.kw;
            return acc;
          }, {})
        };
        return [...prevData.slice(-59), newPoint];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating, devices]);

  const totalEmissions = globalStats.totalKwh * EMISSION_FACTOR;

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
                Monitor IoT - Energia em Tempo Real
              </h1>
              <p className="text-slate-400">Sistema de monitoramento via MQTT/HTTP</p>
            </div>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                isSimulating 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSimulating ? '⏸ Pausar Simulação' : '▶ Iniciar Simulação'}
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
                <span className="text-slate-400 text-sm">Fator de Potência Médio</span>
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{globalStats.avgPowerFactor.toFixed(3)}</div>
              <div className={`text-xs mt-1 ${globalStats.avgPowerFactor > 0.92 ? 'text-green-400' : 'text-yellow-400'}`}>
                {globalStats.avgPowerFactor > 0.92 ? 'Excelente' : 'Bom'}
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
                    <span className="text-slate-300">{device.kw.toFixed(1)} kW</span>
                    <span className="text-slate-400">{device.voltage.toFixed(0)}V</span>
                  </div>
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
                    <div className="text-xs text-slate-400 mb-1">Fator de Potência</div>
                    <div className="text-2xl font-bold">{selectedDevice.powerFactor.toFixed(3)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Consumo Acumulado</div>
                    <div className="text-2xl font-bold">{selectedDevice.kwh.toFixed(2)} kWh</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Emissões</div>
                    <div className="text-2xl font-bold">{(selectedDevice.kwh * EMISSION_FACTOR).toFixed(3)} kg</div>
                  </div>
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