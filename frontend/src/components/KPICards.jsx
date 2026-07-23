function KPICard({ label, value, color, sub }) {
  const display = value == null ? '—'
    : typeof value === 'number' ? value.toLocaleString()
    : value;
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-value" style={{ color }}>{display}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function ConfidenceCard({ pct }) {
  const color = pct >= 70 ? '#15803d' : pct >= 40 ? '#b45309' : '#b91c1c';
  const label = pct >= 70 ? 'ALTA' : pct >= 40 ? 'MEDIA' : 'BAJA';
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-value" style={{ color }}>{pct}%</div>
      <div className="kpi-label">Confianza ({label})</div>
      <div className="kpi-sub">entidades identificadas</div>
    </div>
  );
}

export default function KPICards({ summary }) {
  const dq = summary.dataQuality ?? {};

  return (
    <>
      {/* Fila 1: volumen por tipo */}
      <div className="kpi-section-label">Volumen</div>
      <div className="kpi-grid">
        <KPICard label="Total eventos"   value={summary.total}                color="#3b82f6" />
        <KPICard label="Incidentes"      value={summary.byType?.INCIDENT ?? 0} color="#ef4444" />
        <KPICard label="Issues"          value={summary.byType?.ISSUE ?? 0}    color="#f97316" />
        <KPICard label="Cambios"         value={summary.byType?.CHANGE ?? 0}   color="#8b5cf6" />
      </div>

      {/* Fila 2: severidad / estado */}
      <div className="kpi-section-label">Severidad y estado</div>
      <div className="kpi-grid">
        <KPICard label="Críticos"        value={summary.bySeverity?.CRITICAL ?? 0} color="#dc2626" />
        <KPICard label="Advertencias"    value={summary.bySeverity?.WARNING  ?? 0} color="#f59e0b" />
        <KPICard label="Abiertos"        value={summary.byState?.OPEN        ?? 0} color="#ea580c" />
        <KPICard label="Cerrados"        value={summary.byState?.CLOSED      ?? 0} color="#22c55e" />
      </div>

      {/* Fila 3: entidades y calidad */}
      <div className="kpi-section-label">Entidades y calidad</div>
      <div className="kpi-grid">
        <KPICard label="Identificadas"   value={dq.identified ?? 0}             color="#0ea5e9" />
        <KPICard label="Genéricas"       value={dq.generic    ?? 0}             color="#94a3b8" />
        <KPICard label="Hosts detectados" value={summary.hostsDetectedCount ?? 0}
          color="#475569"
          sub={summary.hostsDetectedCount === 0 ? 'N/D — sin patrones hostname' : undefined} />
        <ConfidenceCard pct={dq.confidencePct ?? 0} />
      </div>
    </>
  );
}
