function Chip({ children, color, bg, borderColor }) {
  return (
    <span className="lr-chip" style={{
      color:       color       ?? '#334155',
      background:  bg          ?? '#F1F5F9',
      borderColor: borderColor ?? '#CBD5E1',
    }}>
      {children}
    </span>
  );
}

export default function LecturaRapida({ summary }) {
  const {
    total, queryTypes = [], byType = {}, byTypeAndSeverity = {},
    byTypeAndState = {}, topEntities = [], avgDurationMinutes,
    hostsDetectedCount, dataQuality,
  } = summary;

  if (total === 0) return null;

  const chips = [];
  let accentColor = '#2F80ED';
  let hasCriticalOpen = false;

  /* ── Incidentes ────────────────────────────────────────────── */
  if ((queryTypes.includes('INCIDENT') || byType.INCIDENT > 0) && byType.INCIDENT > 0) {
    const sev   = byTypeAndSeverity.INCIDENT ?? {};
    const state = byTypeAndState.INCIDENT    ?? {};
    const crit  = sev.CRITICAL  ?? 0;
    const warn  = sev.WARNING   ?? 0;
    const open  = state.OPEN    ?? 0;
    if (crit > 0 && open > 0) { accentColor = '#DC2626'; hasCriticalOpen = true; }
    else if (crit > 0)         { accentColor = '#EA580C'; }
    else if (open > 0)         { accentColor = '#D97706'; }

    const sevStr = crit > 0 && warn > 0
      ? `${crit.toLocaleString()} críticos · ${warn.toLocaleString()} advertencias`
      : crit > 0 ? `${crit.toLocaleString()} críticos`
      : warn > 0 ? `${warn.toLocaleString()} advertencias`
      : '';

    chips.push(
      <Chip key="inc"
        color={hasCriticalOpen ? '#991B1B' : crit > 0 ? '#9A3412' : '#1D4ED8'}
        bg={hasCriticalOpen ? '#FEF2F2' : crit > 0 ? '#FFF7ED' : '#EFF6FF'}
        borderColor={hasCriticalOpen ? '#FECACA' : crit > 0 ? '#FED7AA' : '#BFDBFE'}>
        🚨 {byType.INCIDENT.toLocaleString()} incidente{byType.INCIDENT !== 1 ? 's' : ''}
        {sevStr ? ` · ${sevStr}` : ''}
        {open > 0 ? ` · ${open.toLocaleString()} abierto${open !== 1 ? 's' : ''}` : ''}
      </Chip>
    );
  }

  /* ── Issues ────────────────────────────────────────────────── */
  if ((queryTypes.includes('ISSUE') || byType.ISSUE > 0) && byType.ISSUE > 0) {
    const sev   = byTypeAndSeverity.ISSUE ?? {};
    const state = byTypeAndState.ISSUE    ?? {};
    const crit  = sev.CRITICAL  ?? 0;
    const warn  = sev.WARNING   ?? 0;
    const open  = state.OPEN    ?? 0;
    const label = crit > 0 && warn > 0
      ? `${crit.toLocaleString()} críticos · ${warn.toLocaleString()} advert.`
      : crit > 0 ? `${crit.toLocaleString()} críticos`
      : warn > 0 ? `${warn.toLocaleString()} advertencias` : '';

    chips.push(
      <Chip key="iss" color="#92400E" bg="#FFFBEB" borderColor="#FDE68A">
        ⚠ {byType.ISSUE.toLocaleString()} issue{byType.ISSUE !== 1 ? 's' : ''}
        {label ? ` · ${label}` : ''}
        {open > 0 ? ` · ${open.toLocaleString()} abierto${open !== 1 ? 's' : ''}` : ''}
      </Chip>
    );
  }

  /* ── Cambios ───────────────────────────────────────────────── */
  if ((queryTypes.includes('CHANGE') || byType.CHANGE > 0) && byType.CHANGE > 0) {
    const state = byTypeAndState.CHANGE ?? {};
    const open  = state.OPEN ?? 0;
    chips.push(
      <Chip key="chg" color="#5B21B6" bg="#F5F3FF" borderColor="#DDD6FE">
        🔄 {byType.CHANGE.toLocaleString()} cambio{byType.CHANGE !== 1 ? 's' : ''}
        {open > 0 ? ` · ${open.toLocaleString()} vigente${open !== 1 ? 's' : ''}` : ''}
      </Chip>
    );
  }

  /* ── Entidad top ───────────────────────────────────────────── */
  if (topEntities[0]) {
    chips.push(
      <Chip key="ent" color="#1E3A6B" bg="#D6E8FF" borderColor="#93C5FD">
        🏢 {topEntities[0].name} · {topEntities[0].count.toLocaleString()} ev.
      </Chip>
    );
  }

  /* ── Hosts ─────────────────────────────────────────────────── */
  if (hostsDetectedCount) {
    chips.push(
      <Chip key="host" color="#065F46" bg="#D1FAE5" borderColor="#6EE7B7">
        🖥 {hostsDetectedCount} host{hostsDetectedCount !== 1 ? 's' : ''}
      </Chip>
    );
  }

  /* ── Duración ──────────────────────────────────────────────── */
  if (avgDurationMinutes != null) {
    chips.push(
      <Chip key="dur" color="#334155" bg="#F1F5F9" borderColor="#CBD5E1">
        ⏱ {avgDurationMinutes} min prom.
      </Chip>
    );
  }

  /* ── Confianza baja ────────────────────────────────────────── */
  const conf = dataQuality?.confidencePct ?? 0;
  if (conf < 40) {
    chips.push(
      <Chip key="conf" color="#92400E" bg="#FEF3C7" borderColor="#FCD34D">
        ⚡ Confianza baja: {conf}%
      </Chip>
    );
  }

  return (
    <div className="lr-wrap" style={{ borderLeftColor: accentColor }}>
      <div className="lr-label">Lectura rápida</div>
      <div className="lr-chips">{chips}</div>
    </div>
  );
}
