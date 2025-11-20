import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
  RefreshCw
} from 'lucide-react';

const securityTips = [
  'Use MFA + OAuth2 para bloquear credenciais roubadas.',
  'Restrinja escopos: apenas leitura no dashboard e export seguro.',
  'Registre auditoria de login e revogue tokens inativos.',
  'Faça backup criptografado e segregue dados sensíveis.'
];

const privacyBaseline = [
  { key: 'consent', label: 'Consentimento explícito', status: 'ok' },
  { key: 'privacy', label: 'Privacidade by design', status: 'ok' },
  { key: 'rights', label: 'Direito de esquecimento', status: 'tracking' },
  { key: 'minimization', label: 'Minimização de dados', status: 'ok' }
];

const initialPrivacyRequests = [
  { id: 'req-001', type: 'Anonimização', requester: 'colaborador@empresa.com', status: 'concluída', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 'req-002', type: 'Exportação de dados', requester: 'dpo@cliente.com', status: 'em análise', timestamp: new Date(Date.now() - 1000 * 60 * 20) }
];

const textEncoder = new TextEncoder();

const randomToken = () =>
  (crypto.randomUUID?.() || `token-${Math.random().toString(36).slice(2)}`) +
  `-${Math.random().toString(36).slice(2, 8)}`;

const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const encryptPayload = async (payload, password) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(JSON.stringify(payload))
  );

  return {
    algorithm: 'AES-GCM',
    iterations: 120000,
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    ciphertext: bufferToBase64(cipherBuffer)
  };
};

const loadStoredSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('gwh_session');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed?.expiresAt && parsed.expiresAt > Date.now()) {
      return parsed;
    }
    localStorage.removeItem('gwh_session');
  } catch {
    return null;
  }
  return null;
};

const LoginScreen = ({ onOAuthLogin, auditLog }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-6">
    <div className="max-w-3xl w-full bg-slate-900/70 border border-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="uppercase text-xs tracking-widest text-slate-400 mb-2">Green Work Hub</p>
          <h1 className="text-3xl font-bold">Acesso Seguro</h1>
          <p className="text-slate-400 mt-1">Simulação de login OAuth2 com escopos mínimos</p>
        </div>
        <ShieldCheck className="text-emerald-400" size={40} />
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <KeyRound className="text-amber-400" size={22} />
          <div className="text-left">
            <p className="font-semibold">Provedor OAuth2 (simulado)</p>
            <p className="text-sm text-slate-400">Gera token de acesso de 60 minutos com scopes: dashboard:read, export:secure.</p>
          </div>
        </div>
      </div>

      <button
        onClick={onOAuthLogin}
        className="w-full bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-3 rounded-lg font-semibold mb-4"
      >
        Entrar com OAuth2 (simulado)
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={18} className="text-sky-400" />
            <p className="text-sm font-semibold">Estratégias de Cibersegurança</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300 text-left">
            {securityTips.map((tip, idx) => (
              <li key={idx} className="flex gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={18} className="text-amber-400" />
            <p className="text-sm font-semibold">Auditoria recente</p>
          </div>
          {auditLog.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum evento. O primeiro login gera log.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-300 text-left">
              {auditLog.map((evt) => (
                <li key={evt.id} className="flex justify-between">
                  <span>{evt.message}</span>
                  <span className="text-slate-400">{evt.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  </div>
);

const IoTEnergyMonitor = () => {
  const [session, setSession] = useState(loadStoredSession);
  const [authAudit, setAuthAudit] = useState([]);
  const [exportPassword, setExportPassword] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [privacyRequests, setPrivacyRequests] = useState(initialPrivacyRequests);

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
  useEffect(() => {
    if (!session) return undefined;
    localStorage.setItem('gwh_session', JSON.stringify(session));

    const interval = setInterval(() => {
      if (session.expiresAt <= Date.now()) {
        setSession(null);
        localStorage.removeItem('gwh_session');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [session]);

  const handleOAuthLogin = () => {
    const now = Date.now();
    const newSession = {
      user: { name: 'Gestor ESG', email: 'esg.lead@greenworkhub.com', role: 'admin' },
      token: randomToken(),
      scopes: ['dashboard:read', 'export:secure'],
      expiresAt: now + 60 * 60 * 1000
    };
    setSession(newSession);
    setAuthAudit((prev) => [
      {
        id: `audit-${now}`,
        message: 'Login OAuth2 simulado aprovado',
        timestamp: new Date()
      },
      ...prev.slice(0, 4)
    ]);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('gwh_session');
  };

  const handleSecureExport = async () => {
    if (!exportPassword) {
      setExportStatus('Defina uma senha forte para criptografar o arquivo.');
      return;
    }
    if (!window.crypto?.subtle) {
      setExportStatus('Navegador sem suporte a WebCrypto.');
      return;
    }

    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        user: session?.user ?? { name: 'anônimo' },
        scopes: session?.scopes ?? [],
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          kw: Number(d.kw.toFixed(2)),
          kwh: Number(d.kwh.toFixed(2)),
          powerFactor: Number(d.powerFactor.toFixed(3))
        })),
        alerts,
        globalStats
      };

      const cipher = await encryptPayload(payload, exportPassword);
      const blob = new Blob([JSON.stringify(cipher, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gwh-secure-export.json';
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('Arquivo exportado e criptografado (AES-GCM 256).');
      setTimeout(() => setExportStatus(''), 3500);
    } catch (err) {
      setExportStatus(`Falha ao exportar: ${err.message}`);
    }
  };

  const handlePrivacyRequest = (type) => {
    const now = new Date();
    const entry = {
      id: `req-${now.getTime()}`,
      type,
      requester: session?.user?.email || 'usuario@empresa.com',
      status: 'registrada',
      timestamp: now
    };
    setPrivacyRequests((prev) => [entry, ...prev.slice(0, 4)]);
  };

  const expiryMinutes = session ? Math.max(1, Math.round((session.expiresAt - Date.now()) / 60000)) : null;

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

  if (!session) return <LoginScreen onOAuthLogin={handleOAuthLogin} auditLog={authAudit} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                🌱 GREEN WORK HUB - Monitor IoT
              </h1>
              <p className="text-slate-400">Sistema de monitoramento em tempo real via API com camada de segurança simulada</p>
              <div className="flex items-center gap-2 mt-2">
              <div className="text-right">
                <p className="font-semibold text-sm">{session.user.name}</p>
                <p className="text-xs text-slate-400">
                  Token expira em {expiryMinutes} min · Escopos: {session.scopes.join(', ')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
              >
                Sair
              </button>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Consumo Total</span>
                <Zap className="text-yellow-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{globalStats.totalKwh.toFixed(2)} kWh</div>
              <div className="text-xs text-slate-400 mt-1">{totalEmissions.toFixed(3)} tCO₂e</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Dispositivos Ativos</span>
                <Activity className="text-green-500" size={20} />
              </div>
              <div className="text-2xl font-bold">
                {globalStats.activeDevices}/{globalStats.totalDevices}
              </div>
              <div className="text-xs text-green-400 mt-1">
                {((globalStats.activeDevices / globalStats.totalDevices) * 100 || 0).toFixed(0)}% Online
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
                {alerts.filter((a) => a.severity === 'high').length} críticos
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <p className="text-sm font-semibold">Sessão protegida (OAuth2)</p>
              </div>
              <p className="text-sm text-slate-300">
                Tokens temporários (60 min), escopos mínimos e botão de revogação rápida.
              </p>
              <div className="mt-2 text-xs text-slate-400">Token: {session.token.slice(0, 16)}...</div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={18} className="text-amber-400" />
                <p className="text-sm font-semibold">Estratégia de cibersegurança</p>
              </div>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>✔️ MFA + OAuth2 + escopos mínimos</li>
                <li>✔️ Exportação criptografada (AES-GCM 256)</li>
                <li>✔️ Monitoramento de anomalias e auditoria de login</li>
              </ul>
            </div>
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={18} className="text-sky-400" />
                <p className="text-sm font-semibold">LGPD/GDPR (simulação)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {privacyBaseline.map((item) => (
                  <span
                    key={item.key}
                    className={`px-2 py-1 rounded-md text-xs ${
                      item.status === 'ok' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Wifi size={20} />
              Dispositivos IoT
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {devices.map((device) => (
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

          <div className="lg:col-span-2 space-y-6">
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
                  {devices.slice(0, 4).map((device) => (
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

            {alerts.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-orange-500" size={20} />
                  Alertas Recentes
                </h2>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {alerts.map((alert) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold">Exportação Segura</h2>
                <p className="text-sm text-slate-400">Criptografia AES-GCM 256 bits via WebCrypto</p>
              </div>
              <Lock size={22} className="text-emerald-400" />
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Senha forte para criptografar o JSON"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="px-2 py-1 rounded-md bg-slate-700/60">PBKDF2 120k iterações</span>
                <span className="px-2 py-1 rounded-md bg-slate-700/60">AES-GCM 256</span>
                <span className="px-2 py-1 rounded-md bg-slate-700/60">IV + Salt salvos no arquivo</span>
              </div>
              <button
                onClick={handleSecureExport}
                className="w-full bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-2 rounded-lg font-semibold"
              >
                Exportar dados criptografados
              </button>
              {exportStatus && <p className="text-xs text-slate-300">{exportStatus}</p>}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold">Simulação LGPD/GDPR</h2>
                <p className="text-sm text-slate-400">Registre pedidos de privacidade e acompanhe status.</p>
              </div>
              <ShieldAlert size={22} className="text-amber-400" />
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handlePrivacyRequest('Anonimização')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-sm py-2 rounded-lg"
              >
                Solicitar anonimização
              </button>
              <button
                onClick={() => handlePrivacyRequest('Exportação de dados')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-sm py-2 rounded-lg"
              >
                Solicitar exportação
              </button>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {privacyRequests.map((req) => (
                <div key={req.id} className="bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-emerald-300">{req.type}</span>
                    <span className="text-xs text-slate-400">
                      {req.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">Solicitante: {req.requester}</div>
                  <div className="text-xs text-slate-400">Status: {req.status}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Simulação inclui: registro de consentimento, direito de esquecimento e exportação criptografada.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IoTEnergyMonitor;
