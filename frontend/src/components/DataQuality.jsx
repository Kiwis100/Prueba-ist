function Row({ label, value, total, warn }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barColor = warn && pct > 20 ? '#ef4444' : warn && pct > 5 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="dq-row">
      <div className="dq-label">{label}</div>
      <div className="dq-bar-wrap">
        <div className="dq-bar" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="dq-count">{value.toLocaleString()}</div>
      <div className="dq-pct">{pct}%</div>
    </div>
  );
}

export default function DataQuality({ summary }) {
  const dq = summary.dataQuality ?? {};
  const total = dq.total ?? summary.total ?? 0;
  if (!total) return null;

  const confColor = dq.confidencePct >= 70 ? '#15803d'
    : dq.confidencePct >= 40 ? '#b45309' : '#b91c1c';
  const confLabel = dq.confidencePct >= 70 ? 'Alta' : dq.confidencePct >= 40 ? 'Media' : 'Baja';

  return (
    <div className="card">
      <h3 className="section-title">Calidad de datos</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          <div className="dq-stat-label">Total registros analizados</div>
          <div className="dq-stat-value">{total.toLocaleString()}</div>
        </div>
        <div>
          <div className="dq-stat-label">Confianza del análisis</div>
          <div className="dq-stat-value" style={{ color: confColor }}>
            {confLabel} — {dq.confidencePct ?? 0}% identificadas
          </div>
        </div>
      </div>

      <div className="dq-grid">
        <div className="dq-section">
          <div className="dq-section-title">Calidad de entidades</div>
          <Row label="Entidades identificadas" value={dq.identified  ?? 0} total={total} />
          <Row label="Entidades genéricas"     value={dq.generic     ?? 0} total={total} warn />
          <Row label="Entidades sin identificar" value={dq.unknown   ?? 0} total={total} warn />
        </div>

        <div className="dq-section">
          <div className="dq-section-title">Completitud de campos</div>
          <Row label="Sin duración registrada"   value={dq.noDuration   ?? 0} total={total} warn />
          <Row label="Severidad 'No aplica'"     value={dq.noneSeverity ?? 0} total={total} />
          <Row label="Inicio fuera del rango"    value={dq.outOfRange   ?? 0} total={total} warn />
        </div>
      </div>

      <div className="dq-note">
        <strong>Nota:</strong> Las entidades genéricas (node, pod, container, etc.) son nombres de
        tipo, no de instancia. Las entidades sin identificar tienen valores nulos o &quot;Unknown&quot;.
        Ambas se excluyen del conteo de hosts detectados y del top entidades por defecto.
      </div>
    </div>
  );
}
