import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  KeyRound,
  MessageCircle,
  Lock,
  FileText,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

const nlpKeywords = [
  { key: 'energia', label: 'Energia' },
  { key: 'carbono', label: 'Carbono' },
  { key: 'clima', label: 'Clima' },
  { key: 'recicla', label: 'Resíduos' },
  { key: 'agua', label: 'Água' },
  { key: 'treinamento', label: 'Treinamento' },
  { key: 'sustent', label: 'Sustentabilidade' },
  { key: 'compliance', label: 'Governança' }
];

const chatbotQuickPrompts = [
  'Sugira cortes rápidos de consumo sem afetar conforto',
  'Como reduzir emissões do HVAC agora?',
  'Quais ações de educação ambiental devo comunicar hoje?',
  'Monte um plano de ação ESG resumido para o turno'
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
  const [isSimulating, setIsSimulating] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalKwh: 0,
    totalDevices: 0,
    activeDevices: 0,
    avgPowerFactor: 0
  });
  const [chatMessages, setChatMessages] = useState(() => [
    {
      id: 'bot-welcome',
      author: 'bot',
      tone: 'system',
      content: 'Sou o EcoBot ESG. Monitoro o consumo em tempo real e devolvo ações rápidas para reduzir emissões.',
      ts: new Date()
    },
    {
      id: 'bot-nudge',
      author: 'bot',
      tone: 'auto',
      content: 'Ative a simulação para sugerir decisões sustentáveis imediatamente e gerar narrativas ESG.',
      ts: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [nlpInput, setNlpInput] = useState('');
  const [nlpAnalysis, setNlpAnalysis] = useState(null);
  const [reportNarrative, setReportNarrative] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const prevAlertCountRef = useRef(0);
  const prevTotalKwhRef = useRef(0);
  const lastAutoMessageRef = useRef(0);

  const EMISSION_FACTOR = 0.233; // kgCO2e/kWh

  const addBotMessage = (content, tone = 'auto') => {
    const entry = {
      id: `bot-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      author: 'bot',
      tone,
      content,
      ts: new Date()
    };
    setChatMessages((prev) => [...prev.slice(-11), entry]);
    lastAutoMessageRef.current = Date.now();
  };

  const buildBotReply = (text) => {
    const normalized = text.toLowerCase();
    const fallbackDevice = selectedDevice || devices[0];
    const totalDevices = globalStats.totalDevices || devices.length || 1;
    const onlineDevices = globalStats.activeDevices || devices.filter((d) => d.status === 'online').length;
    const emissions = (globalStats.totalKwh * EMISSION_FACTOR).toFixed(3);

    let response = `Energia monitorada em ${onlineDevices}/${totalDevices} dispositivos; emissões estimadas ${emissions} tCO₂e.`;

    if (normalized.includes('hvac') || normalized.includes('ar')) {
      response = 'HVAC consome a maior parte. Use setpoint dinâmico e desligue 30 minutos antes do fim do turno.';
    } else if (normalized.includes('alerta') || normalized.includes('anomalia')) {
      response = alerts.length
        ? `Novo alerta em ${alerts[0].deviceName}: ${alerts[0].message}`
        : 'Nenhum alerta ativo; mantenha rotinas preventivas.';
    } else if (normalized.includes('relatorio') || normalized.includes('narrativa')) {
      response = 'Gerando narrativa ESG resumida com foco ambiental, social e governança.';
    } else if (normalized.includes('educa') || normalized.includes('treinamento')) {
      response = 'Use mensagens curtas com meta semanal e destaque o impacto em CO₂ evitado.';
    }

    const action = fallbackDevice
      ? `Ajuste ${fallbackDevice.name} para ${(fallbackDevice.kw * 0.95).toFixed(
          1
        )} kW e programe desligamento automático fora do expediente.`
      : 'Desligue circuitos fora do expediente e refine automações.';
    const learningCall = 'Compartilhe este passo no canal interno e peça feedback do time sobre barreiras.';

    return {
      id: `bot-${Date.now()}`,
      author: 'bot',
      tone: 'guided',
      content: `${response} ${action} ${learningCall}`,
      ts: new Date()
    };
  };

  const handleQuickPrompt = (prompt) => {
    const now = new Date();
    const userEntry = { id: `user-${now.getTime()}`, author: 'user', tone: 'user', content: prompt, ts: now };
    const botEntry = buildBotReply(prompt);
    setChatMessages((prev) => [...prev.slice(-11), userEntry, botEntry]);
  };

  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date();
    const userEntry = { id: `user-${now.getTime()}`, author: 'user', tone: 'user', content: text, ts: now };
    const botEntry = buildBotReply(text);
    setChatMessages((prev) => [...prev.slice(-11), userEntry, botEntry]);
    setChatInput('');
  };

  const analyzeLearningText = () => {
    const text = nlpInput.trim();
    if (!text) {
      setNlpAnalysis({
        clarity: 0,
        engagement: 0,
        focusAreas: [],
        summary: 'Cole um comunicado interno para ver clareza, foco temático e próxima ação.',
        action: 'Nenhum texto analisado ainda.'
      });
      return;
    }

    const normalized = text.toLowerCase();
    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
    const keywordHits = nlpKeywords
      .map((kw) => ({ ...kw, hits: (normalized.match(new RegExp(kw.key, 'g')) || []).length }))
      .filter((kw) => kw.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    const clarity = Math.min(100, Math.round(60 + sentences.length * 5 + keywordHits.length * 4));
    const engagement = Math.min(100, Math.round(55 + Math.min(20, text.length / 80) + keywordHits.length * 5));
    const callToAction =
      keywordHits.length > 0
        ? `Inclua CTA prático sobre ${keywordHits[0].label.toLowerCase()} e defina meta semanal.`
        : 'Adicione uma meta clara (ex: reduzir 3% do consumo de HVAC nesta semana).';

    setNlpAnalysis({
      clarity,
      engagement,
      focusAreas: keywordHits.map((kw) => kw.label),
      summary: `Detectados ${keywordHits.length || 'nenhum'} temas ESG; texto com ${sentences.length || 1} frase(s).`,
      action: callToAction
    });
  };

  const generateNarrativeReport = () => {
    setIsGeneratingReport(true);
    setReportStatus('Gerando narrativa baseada nos dados em tempo real...');
    const totalDevices = globalStats.totalDevices || devices.length || 0;
    const onlineDevices = globalStats.activeDevices || devices.filter((d) => d.status === 'online').length;
    const emissions = (globalStats.totalKwh * EMISSION_FACTOR).toFixed(3);
    const critical = alerts[0];
    const focusDevice =
      devices.length > 0 ? devices.reduce((prev, dev) => (dev.kw > prev.kw ? dev : prev), devices[0]) : null;

    const narrative = [
      `Ambiental: consumo acumulado em ${globalStats.totalKwh.toFixed(
        2
      )} kWh no turno, emissões estimadas de ${emissions} tCO₂e. ${
        focusDevice ? `Maior carga: ${focusDevice.name} (${focusDevice.kw.toFixed(1)} kW).` : ''
      } Planeje redução de 5-8% via setpoint e automação.`,
      `Social: mantenha comunicação clara com equipes operacionais, compartilhando meta e impacto positivo por área. ${nlpAnalysis?.action || 'Inclua exemplos práticos em avisos rápidos.'}`,
      `Governança: ${onlineDevices}/${totalDevices} dispositivos online; ${
        critical ? `alerta recente em ${critical.deviceName}. ` : 'sem alertas críticos. '
      } Registre auditoria de login e exportações criptografadas no repositório interno.`
    ].join(' ');

    setTimeout(() => {
      setReportNarrative(narrative);
      setReportStatus('Narrativa ESG pronta para ser compartilhada.');
      setIsGeneratingReport(false);
    }, 250);
  };

  useEffect(() => {
    const initialDevices = [
      { id: 'device_001', name: 'HVAC - Andar 1', site: 'Prédio Principal', floor: '1', type: 'hvac', status: 'online', baseline: 45 },
      { id: 'device_002', name: 'Iluminação - Andar 1', site: 'Prédio Principal', floor: '1', type: 'lighting', status: 'online', baseline: 12 },
      { id: 'device_003', name: 'HVAC - Andar 2', site: 'Prédio Principal', floor: '2', type: 'hvac', status: 'online', baseline: 48 },
      { id: 'device_004', name: 'Data Center', site: 'Prédio Principal', floor: 'Subsolo', type: 'datacenter', status: 'online', baseline: 85 },
      { id: 'device_005', name: 'Elevadores', site: 'Prédio Principal', floor: 'Todos', type: 'elevator', status: 'online', baseline: 18 },
      { id: 'device_006', name: 'HVAC - Andar 3', site: 'Prédio Principal', floor: '3', type: 'hvac', status: 'online', baseline: 42 }
    ];

    const devicesWithData = initialDevices.map((dev) => ({
      ...dev,
      kwh: dev.baseline + (Math.random() - 0.5) * 5,
      kw: dev.baseline + (Math.random() - 0.5) * 5,
      voltage: 220 + (Math.random() - 0.5) * 10,
      current: dev.baseline / 0.22 + (Math.random() - 0.5) * 20,
      powerFactor: 0.85 + Math.random() * 0.12,
      lastUpdate: new Date()
    }));

    setDevices(devicesWithData);
    if (!selectedDevice) setSelectedDevice(devicesWithData[0]);

    const historical = [];
    for (let i = 60; i >= 0; i -= 1) {
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

    const totalKwh = devicesWithData.reduce((sum, d) => sum + d.kwh, 0);
    const avgPf = devicesWithData.reduce((sum, d) => sum + d.powerFactor, 0) / devicesWithData.length;
    const active = devicesWithData.filter((d) => d.status === 'online').length;
    setGlobalStats({
      totalKwh,
      totalDevices: devicesWithData.length,
      activeDevices: active,
      avgPowerFactor: avgPf
    });
  }, [selectedDevice]);

  useEffect(() => {
    if (!isSimulating) return undefined;

    const interval = setInterval(() => {
      const now = new Date();

      setDevices((prevDevices) => {
        const updated = prevDevices.map((dev) => {
          const variation = (Math.random() - 0.5) * 6;
          const newKw = Math.max(0, dev.baseline + variation);
          const newVoltage = 220 + (Math.random() - 0.5) * 8;
          const newCurrent = newKw / 0.22 + (Math.random() - 0.5) * 15;
          const newPf = Math.min(0.99, Math.max(0.75, 0.85 + (Math.random() - 0.5) * 0.15));

          if (Math.abs(newKw - dev.baseline) > dev.baseline * 0.3) {
            setAlerts((prev) => {
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
            kwh: dev.kwh + newKw / 60,
            kw: newKw,
            voltage: newVoltage,
            current: newCurrent,
            powerFactor: newPf,
            lastUpdate: now
          };
        });

        const totalKwh = updated.reduce((sum, d) => sum + d.kwh, 0);
        const avgPf = updated.reduce((sum, d) => sum + d.powerFactor, 0) / updated.length;
        const active = updated.filter((d) => d.status === 'online').length;

        setGlobalStats({
          totalKwh,
          totalDevices: updated.length,
          activeDevices: active,
          avgPowerFactor: avgPf
        });

        return updated;
      });

      setHistoricalData((prevData) => {
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

  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current && alerts.length > 0) {
      const latest = alerts[0];
      addBotMessage(
        `Recomendação imediata: ${latest.deviceName} com consumo fora do padrão. Reduza setpoint em 5% e confirme presença no local antes de acionar equipe.`,
        'realtime'
      );
    }
    prevAlertCountRef.current = alerts.length;
  }, [alerts]);

  useEffect(() => {
    const now = Date.now();
    const diff = globalStats.totalKwh - prevTotalKwhRef.current;

    if (
      isSimulating &&
      globalStats.totalKwh > 0 &&
      (diff > 1.5 || globalStats.avgPowerFactor < 0.9) &&
      now - lastAutoMessageRef.current > 12000
    ) {
      addBotMessage(
        `Sugestão sustentável: consumo acumulado em ${globalStats.totalKwh.toFixed(
          2
        )} kWh e fator de potência médio ${globalStats.avgPowerFactor.toFixed(
          3
        )}. Ajuste cargas menos críticas e programe desligamento escalonado.`,
        'realtime'
      );
    }

    prevTotalKwhRef.current = globalStats.totalKwh;
  }, [globalStats, isSimulating]);

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

  const totalEmissions = globalStats.totalKwh * EMISSION_FACTOR;
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
                Monitor IoT - Energia em Tempo Real
              </h1>
              <p className="text-slate-400">Sistema de monitoramento via MQTT/HTTP com camada de segurança simulada</p>
            </div>
            <div className="flex items-center gap-3">
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
              <button
                onClick={() => setIsSimulating((prev) => !prev)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSimulating ? '⏸ Pausar Sim.' : '▶ Iniciar Simulação'}
              </button>
            </div>
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
                <span className="text-slate-400 text-sm">Fator de Potência Médio</span>
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <div className="text-2xl font-bold">{globalStats.avgPowerFactor.toFixed(3)}</div>
              <div
                className={`text-xs mt-1 ${
                  globalStats.avgPowerFactor > 0.92 ? 'text-green-400' : 'text-yellow-400'
                }`}
              >
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
                    <span className="text-slate-300">{device.kw.toFixed(1)} kW</span>
                    <span className="text-slate-400">{device.voltage.toFixed(0)}V</span>
                  </div>
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
                    <div className="text-xs text-slate-400 mb-1">Fator de Potência</div>
                    <div className="text-2xl font-bold">{selectedDevice.powerFactor.toFixed(3)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Consumo Acumulado</div>
                    <div className="text-2xl font-bold">{selectedDevice.kwh.toFixed(2)} kWh</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Emissões</div>
                    <div className="text-2xl font-bold">
                      {(selectedDevice.kwh * EMISSION_FACTOR).toFixed(3)} kg
                    </div>
                  </div>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <div className="xl:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Bot size={20} className="text-emerald-400" />
                  Chatbot ESG em Tempo Real
                </h2>
                <p className="text-xs text-slate-400">
                  Sugestões automáticas ligadas às leituras IoT e geração instantânea de plano sustentável.
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="flex items-center gap-1 justify-end text-emerald-300">
                  <Sparkles size={14} />
                  <span>ativo</span>
                </div>
                <p className="text-slate-400">
                  {alerts.length} alertas · {globalStats.totalKwh.toFixed(1)} kWh
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 h-72 overflow-y-auto space-y-3 mb-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] rounded-lg p-3 text-sm shadow ${
                      msg.author === 'user' ? 'bg-emerald-700/70 text-white' : 'bg-slate-700/70 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-300 mb-1">
                      {msg.author === 'user' ? (
                        <MessageCircle size={12} />
                      ) : (
                        <Bot size={12} className="text-emerald-300" />
                      )}
                      <span>{msg.author === 'user' ? 'Você' : 'EcoBot'}</span>
                      <span className="text-slate-400">· {msg.tone || 'auto'}</span>
                    </div>
                    <div className="text-left leading-relaxed">{msg.content}</div>
                    <div className="text-[10px] text-slate-400 mt-2">
                      {msg.ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              {chatbotQuickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-3 py-2 text-left transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder="Peça decisões sustentáveis ou um resumo ESG..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleChatSend}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold text-sm"
              >
                <Send size={16} />
                Enviar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <BookOpen size={18} className="text-amber-300" />
                    Análise NLP Educacional
                  </h3>
                  <p className="text-xs text-slate-400">Feedback imediato para educação ambiental corporativa.</p>
                </div>
                <Sparkles size={16} className="text-emerald-300" />
              </div>
              <textarea
                rows={4}
                value={nlpInput}
                onChange={(e) => setNlpInput(e.target.value)}
                placeholder="Cole um comunicado interno ou mensagem para a equipe..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">Recomenda CTA, clareza e foco ESG.</span>
                <button
                  onClick={analyzeLearningText}
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md font-semibold"
                >
                  Rodar análise NLP
                </button>
              </div>
              {nlpAnalysis ? (
                <div className="mt-3 space-y-2 text-sm text-slate-100">
                  <div className="flex justify-between text-xs">
                    <span>Clareza</span>
                    <span>{nlpAnalysis.clarity}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Engajamento</span>
                    <span>{nlpAnalysis.engagement}%</span>
                  </div>
                  <div className="text-xs text-emerald-300">
                    Foco: {nlpAnalysis.focusAreas.length ? nlpAnalysis.focusAreas.join(', ') : 'Nenhum tema detectado'}
                  </div>
                  <div className="text-xs text-slate-300">{nlpAnalysis.summary}</div>
                  <div className="text-xs text-amber-300">Próximo passo: {nlpAnalysis.action}</div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Cole um comunicado para ver clareza e foco temático.</p>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText size={18} className="text-emerald-300" />
                    Relatório Narrativo ESG
                  </h3>
                  <p className="text-xs text-slate-400">Resumo automático para liderança.</p>
                </div>
                <Sparkles size={16} className="text-sky-300" />
              </div>
              <div className="text-xs text-slate-300 mb-3">
                Baseado em {globalStats.totalKwh.toFixed(1)} kWh, fator de potência médio{' '}
                {globalStats.avgPowerFactor.toFixed(3)} e {alerts.length} alerta(s) recente(s).
              </div>
              <button
                onClick={generateNarrativeReport}
                disabled={isGeneratingReport}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
                  isGeneratingReport ? 'bg-slate-700 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <FileText size={16} />
                {isGeneratingReport ? 'Gerando narrativa...' : 'Gerar narrativa ESG'}
              </button>
              {reportStatus && <p className="text-xs text-slate-400 mt-2">{reportStatus}</p>}
              {reportNarrative && (
                <div className="mt-3 bg-slate-900/40 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 space-y-2">
                  <p className="leading-relaxed">{reportNarrative}</p>
                  <div className="text-xs text-slate-400">Fonte: dados ao vivo + monitoramento de alertas.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IoTEnergyMonitor;
