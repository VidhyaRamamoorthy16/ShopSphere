import React, { useState, useEffect } from 'react';

const MONITOR = (import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000')

export default function ThreatDetection() {
  const [threats, setThreats] = useState([]);
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const res = await fetch(`${MONITOR}/monitor/threats/live`);
        const data = await res.json();
        setThreats(data.threats || []);
        setStats({ total: data.total || 0 });
      } catch (e) {}
    };
    fetchThreats();
    const interval = setInterval(fetchThreats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getThreatColor = (type) => {
    if (type === 'SQL Injection') return '#FF6B6B';
    if (type === 'XSS') return '#FFE66D';
    if (type === 'Path Traversal') return '#FF9F43';
    if (type === 'Rate Limit') return '#6C63FF';
    return '#8888AA';
  };

  const S = {
    container: { padding: '20px', color: '#e0e0e0' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { fontSize: '20px', fontWeight: 600, color: '#fff' },
    stats: { fontSize: '14px', color: '#8888AA' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
    card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px', padding: '16px' },
    threatBadge: (t) => ({ background: getThreatColor(t), color: '#1a1a2e', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, display: 'inline-block', marginBottom: '12px' }),
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' },
    label: { color: '#8888AA' },
    value: { color: '#e0e0e0', fontFamily: 'JetBrains Mono, monospace' },
    code: { background: '#2a2a4a', padding: '8px 12px', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#FF6B6B', marginTop: '8px', wordBreak: 'break-all' },
    source: { fontSize: '11px', color: '#8888AA', marginTop: '8px' },
  };

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.title}>Threat Detection</div>
        <div style={S.stats}>Total threats detected: {stats.total}</div>
      </div>

      <div style={S.grid}>
        {threats.map((threat, i) => (
          <div key={i} style={S.card}>
            <span style={S.threatBadge(threat.threat_type)}>{threat.threat_type}</span>
            <div style={S.row}>
              <span style={S.label}>IP Address</span>
              <span style={S.value}>{threat.ip}</span>
            </div>
            <div style={S.row}>
              <span style={S.label}>Endpoint</span>
              <span style={S.value}>{threat.endpoint}</span>
            </div>
            <div style={S.row}>
              <span style={S.label}>Method</span>
              <span style={S.value}>{threat.method}</span>
            </div>
            <div style={S.row}>
              <span style={S.label}>Timestamp</span>
              <span style={S.value}>{threat.timestamp}</span>
            </div>
            {threat.payload && threat.payload.length > 0 && (
              <div style={S.code}>{threat.payload}</div>
            )}
            <div style={S.source}>Source: {threat.source}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
