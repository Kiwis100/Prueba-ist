import { useState } from 'react';
import LogsForm from './components/LogsForm.jsx';
import LogsCharts from './components/LogsCharts.jsx';
import LogsTable from './components/LogsTable.jsx';
import { queryInstanaLogs } from './utils/logsClient.js';
import { exportLogsToExcel } from './utils/exportLogsExcel.js';
import './App.css';

const TABS = [['resumen', 'Resumen'], ['mensajes', 'Mensajes recurrentes'], ['perspectivas', 'Perspectivas'], ['detalle', 'Detalle completo']];
const KPI_COLORS = { ERROR: '#ef4444', WARN: '#f59e0b', INFO: '#3b82f6' };
const fmt = (ts) => new Date(ts).toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false });

function Kpi({ label, value, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-value" style={{ color }}>{value.toLocaleString()}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [tab, setTab] = useState('resumen');

  async function handleQuery(form) {
    setLoading(true); setError(null); setResult(null); setTab('resumen'); setProgress(null);
    try { setResult(await queryInstanaLogs({ ...form, onProgress: setProgress })); }
    catch (e) { setError(e?.message ?? 'Error consultando la API de logs de Instana.'); }
    finally { setLoading(false); }
  }

  const s = result?.summary;
  return (
    <>
      <header className="app-header">
        <div className="app-header-logo">⬡</div>
        <div><h1>Instana Logs Exporter</h1><p>Vista operativa de logs IBM Instana (Log Perspectives)</p></div>
      </header>

      <main className="app-main">
        <div className="banner banner-fe-only" role="note">
          <span>⚠</span>
          <span><strong>Modo frontend-only:</strong> el token no se almacena, pero la consulta va directo del navegador a Instana. Para uso productivo se recomienda un <strong>backend proxy seguro</strong>.</span>
        </div>

        <LogsForm onSubmit={handleQuery} loading={loading} onReset={result ? () => { setResult(null); setError(null); } : null} />

        {error && <div className="banner banner-error" role="alert"><span>⚠</span><span><strong>Error:</strong> {error}</span></div>}
        {loading && (
          <div className="banner banner-loading" aria-live="polite">
            <div className="spinner" />
            <span>Consultando por bloques diarios{progress ? ` (${progress.block}/${progress.blocks}) · ${progress.logs.toLocaleString()} logs` : ''}…</span>
          </div>
        )}

        {result && (
          <>
            {s.blocksWithErrors > 0 && (
              <div className="banner banner-warning"><span>⚠</span>
                <span><strong>Advertencia:</strong> {s.blocksWithErrors} bloque(s) con error: {s.blockErrors.map((b) => b.error).join(' | ')}. Datos pueden estar incompletos.</span>
              </div>
            )}
            <div className="results-header">
              <h2>{s.total.toLocaleString()} log(s)
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>{fmt(s.queryRange.from)} → {fmt(s.queryRange.to)}</span>
              </h2>
              <button className="btn btn-success" onClick={() => exportLogsToExcel(result)} disabled={!s.total}>
                ↓ Exportar Excel ({s.total.toLocaleString()})
              </button>
            </div>

            <div className="tab-bar">
              {TABS.map(([id, label]) => (
                <button key={id} className={`tab-btn ${tab === id ? 'tab-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>

            {tab === 'resumen' && (
              <>
                <div className="kpi-grid">
                  <Kpi label="Total logs" value={s.total} color="#3b82f6" />
                  {Object.entries(s.byLevel).map(([l, n]) => <Kpi key={l} label={l} value={n} color={KPI_COLORS[l] ?? '#94a3b8'} />)}
                  <Kpi label="Servicios" value={s.topServices.length} color="#8b5cf6" />
                </div>
                <LogsCharts summary={s} />
              </>
            )}

            {tab === 'mensajes' && (
              <div className="table-section">
                <div className="table-top"><h3>Mensajes más frecuentes</h3><span className="table-count">{s.topMessages.length} tipos</span></div>
                <div className="table-wrapper">
                  <table className="events-table">
                    <thead><tr><th>#</th><th>Mensaje</th><th>Servicios</th><th>Último (Lima)</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Errores</th></tr></thead>
                    <tbody>
                      {s.topMessages.map((m, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td><td className="td-truncate" title={m.message}>{m.message}</td>
                          <td>{m.services.join(', ')}</td><td className="td-mono">{fmt(m.last)}</td>
                          <td className="td-num" style={{ fontWeight: 700 }}>{m.count.toLocaleString()}</td>
                          <td className="td-num" style={{ color: '#b91c1c', fontWeight: 700 }}>{m.errors.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'perspectivas' && (
              <div className="table-section">
                <div className="table-top"><h3>Logs por perspectiva</h3></div>
                {!s.hasPerspCol || s.topPerspectives.length === 0 ? (
                  <div className="tab-intro">Instana no devolvió el campo <code>log.perspectiveIds</code> en cada log, por lo que no se puede desglosar por perspectiva.</div>
                ) : (
                  <div className="table-wrapper">
                    <table className="events-table">
                      <thead><tr><th>Perspectiva</th><th style={{ textAlign: 'right' }}>Logs</th></tr></thead>
                      <tbody>{s.topPerspectives.map((p) => <tr key={p.name}><td>{p.name}</td><td className="td-num">{p.count.toLocaleString()}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'detalle' && <LogsTable logs={result.logs} title="Detalle completo" />}
          </>
        )}
      </main>
    </>
  );
}
