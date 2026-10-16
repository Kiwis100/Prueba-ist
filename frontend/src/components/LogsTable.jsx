import { useMemo, useState } from 'react';

const PAGE = 100;
const fmt = (ts) => new Date(ts).toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });
const color = { ERROR: '#b91c1c', WARN: '#b45309' };

export default function LogsTable({ logs, title }) {
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(0);
  const levels = useMemo(() => [...new Set(logs.map((l) => l.level))], [logs]);
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return logs.filter((l) => (!level || l.level === level) &&
      (!s || `${l.message} ${l.service} ${l.perspective}`.toLowerCase().includes(s)));
  }, [logs, q, level]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);

  return (
    <div className="table-section">
      <div className="table-top">
        <h3>{title}</h3><span className="table-count">{rows.length.toLocaleString()} logs</span>
      </div>
      <div className="table-filters">
        <input className="filter-input" placeholder="Buscar en mensaje, servicio o perspectiva…" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select className="filter-select" value={level} onChange={(e) => { setLevel(e.target.value); setPage(0); }}>
          <option value="">Todos los niveles</option>
          {levels.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="table-wrapper">
        <table className="events-table">
          <thead><tr><th>Fecha (Lima)</th><th>Nivel</th><th>Perspectiva</th><th>Mensaje</th><th>Servicio</th></tr></thead>
          <tbody>
            {rows.slice(cur * PAGE, (cur + 1) * PAGE).map((l, i) => (
              <tr key={i}>
                <td className="td-mono">{fmt(l.timestamp)}</td>
                <td style={{ fontWeight: 700, color: color[l.level] ?? '#475569' }}>{l.level}</td>
                <td>{l.perspective}</td>
                <td className="td-truncate" title={l.message}>{l.message}</td>
                <td>{l.service}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button className="btn btn-ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹</button>
        <span>Página {cur + 1} / {pages}</span>
        <button className="btn btn-ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>›</button>
      </div>
    </div>
  );
}
