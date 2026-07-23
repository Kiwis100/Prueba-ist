import { useState, useMemo } from 'react';
import QueryForm    from './components/QueryForm.jsx';
import KPICards     from './components/KPICards.jsx';
import Charts       from './components/Charts.jsx';
import EventsTable  from './components/EventsTable.jsx';
import LecturaRapida from './components/LecturaRapida.jsx';
import DataQuality  from './components/DataQuality.jsx';
import { exportToExcel }       from './utils/exportExcel.js';
import { queryInstanaEvents }  from './utils/instanaClient.js';
import './App.css';

/* ── Definición de tabs ─────────────────────────────────────── */
const ALL_TABS = [
  { id: 'resumen',   label: 'Resumen',               always: true },
  { id: 'abiertos',  label: 'Abiertos',              always: false,
    show: (s) => (s.byState?.OPEN ?? 0) > 0 },
  { id: 'entidades', label: 'Entidades',              always: true },
  { id: 'problemas', label: 'Problemas recurrentes',  always: false,
    show: (s) => (s.topProblems?.length ?? 0) > 0 },
  { id: 'cambios',   label: 'Cambios',               always: false,
    show: (s) => (s.byType?.CHANGE ?? 0) > 0 },
  { id: 'calidad',   label: 'Calidad de datos',       always: true },
  { id: 'detalle',   label: 'Detalle completo',       always: true },
];

export default function App() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [activeTab, setTab]   = useState('resumen');

  async function handleQuery(formData) {
    setLoading(true);
    setError(null);
    setResult(null);
    setTab('resumen');

    try {
      const data = await queryInstanaEvents(formData);
      setResult(data);
    } catch (err) {
      setError(err?.message ?? 'Error consultando la API de Instana.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() { setResult(null); setError(null); setTab('resumen'); }

  /* ── Tabs visibles ────────────────────────────────────────── */
  const visibleTabs = useMemo(() => {
    if (!result) return [];
    return ALL_TABS.filter(t => t.always || t.show?.(result.summary));
  }, [result]);

  /* ── Subconjuntos de eventos ──────────────────────────────── */
  const openEvents   = useMemo(() => result?.events.filter(e => e.state === 'OPEN')   ?? [], [result]);
  const changeEvents = useMemo(() => result?.events.filter(e => e.type  === 'CHANGE') ?? [], [result]);

  const hasBlockErrors = result?.summary?.blocksWithErrors > 0;

  return (
    <>
      <header className="app-header">
        <div className="app-header-logo">⬡</div>
        <div>
          <h1>Instana Events Exporter</h1>
          <p>Vista operativa de eventos IBM Instana</p>
        </div>
      </header>

      <main className="app-main">
        <div className="banner banner-fe-only" role="note">
          <span>⚠</span>
          <span>
            <strong>Modo frontend-only:</strong> el token no se almacena en ningún lado, pero la
            consulta se ejecuta directamente desde el navegador hacia la API de Instana.
            Para uso productivo se recomienda un <strong>backend proxy seguro</strong>.
          </span>
        </div>

        <QueryForm
          onSubmit={handleQuery}
          loading={loading}
          onReset={result ? handleReset : null}
        />

        {error && (
          <div className="banner banner-error" role="alert">
            <span>⚠</span>
            <span><strong>Error:</strong> {error}</span>
          </div>
        )}

        {loading && (
          <div className="banner banner-loading" aria-live="polite">
            <div className="spinner" aria-hidden="true"/>
            <span>Consultando por bloques diarios… puede tardar según el rango.</span>
          </div>
        )}

        {result && (
          <>
            {hasBlockErrors && (
              <div className="banner banner-warning">
                <span>⚠</span>
                <span>
                  <strong>Advertencia:</strong> {result.summary.blocksWithErrors} bloque(s) con
                  error (rate limit o fallo de Instana). Datos pueden estar incompletos.
                </span>
              </div>
            )}

            {/* ── Cabecera de resultados ─────────────────────── */}
            <div className="results-header">
              <h2>
                {result.summary.total.toLocaleString()} evento(s)
                <span style={{ fontSize:'0.8rem', fontWeight:400, color:'#64748b', marginLeft:8 }}>
                  {result.summary.queryTypes?.join(' + ')}
                </span>
              </h2>
              <button className="btn btn-success"
                onClick={() => exportToExcel(result)}
                disabled={result.events.length === 0}>
                ↓ Exportar Excel ({result.events.length.toLocaleString()})
              </button>
            </div>

            {/* ── Tabs ──────────────────────────────────────── */}
            <div className="tab-bar">
              {visibleTabs.map(t => (
                <button key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'tab-active' : ''}`}
                  onClick={() => setTab(t.id)}>
                  {t.label}
                  {t.id === 'abiertos' && result.summary.byState?.OPEN > 0 && (
                    <span className="tab-badge">{result.summary.byState.OPEN.toLocaleString()}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ══ Tab: Resumen ══════════════════════════════ */}
            {activeTab === 'resumen' && (
              <>
                <LecturaRapida summary={result.summary} />
                <KPICards summary={result.summary} />
                <Charts summary={result.summary} events={result.events} />
              </>
            )}

            {/* ══ Tab: Abiertos ════════════════════════════ */}
            {activeTab === 'abiertos' && (
              <>
                <div className="tab-intro">
                  {openEvents.length.toLocaleString()} evento(s) con estado <strong>ABIERTO</strong>.
                  Requieren atención o verificación.
                </div>
                <EventsTable events={openEvents} title="Eventos abiertos" />
              </>
            )}

            {/* ══ Tab: Entidades ═══════════════════════════ */}
            {activeTab === 'entidades' && (
              <>
                <div className="tab-intro">
                  <strong>{result.summary.dataQuality?.identified ?? 0}</strong> entidades identificadas,{' '}
                  <strong>{result.summary.dataQuality?.generic ?? 0}</strong> genéricas,{' '}
                  <strong>{result.summary.dataQuality?.unknown ?? 0}</strong> sin identificar.{' '}
                  Hosts/nodos detectados: <strong>{result.summary.hostsDetectedCount ?? 0}</strong>.
                </div>
                <Charts
                  summary={result.summary}
                  events={result.events}
                />
              </>
            )}

            {/* ══ Tab: Problemas recurrentes ════════════════ */}
            {activeTab === 'problemas' && (
              <>
                <div className="tab-intro">
                  Top {Math.min(20, result.summary.topProblems?.length ?? 0)} problemas más frecuentes
                  del período consultado.
                </div>
                <div className="chart-card full-width" style={{ marginBottom:16 }}>
                  <h3>Distribución de problemas</h3>
                  <Charts
                    summary={{ ...result.summary, topEntities: [] }}
                    events={result.events}
                  />
                </div>
                <div className="table-section">
                  <div className="table-top">
                    <h3>Problemas recurrentes</h3>
                    <span className="table-count">{result.summary.topProblems?.length ?? 0} tipos</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Problema</th>
                          <th>Tipos</th>
                          <th style={{textAlign:'right'}}>Total</th>
                          <th style={{textAlign:'right'}}>Abiertos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(result.summary.topProblems ?? []).map((p, i) => (
                          <tr key={i}>
                            <td style={{ color:'#94a3b8', fontWeight:600 }}>{i+1}</td>
                            <td className="td-truncate" title={p.problem}>{p.problem}</td>
                            <td>{(p.types ?? []).join(', ')}</td>
                            <td className="td-num" style={{ fontWeight:700 }}>{p.count.toLocaleString()}</td>
                            <td className="td-num" style={{ color: p.open>0?'#f59e0b':'#94a3b8', fontWeight:700 }}>
                              {p.open.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ══ Tab: Cambios ═════════════════════════════ */}
            {activeTab === 'cambios' && (
              <>
                <div className="tab-intro">
                  <strong>{changeEvents.length.toLocaleString()}</strong> cambio(s) detectados.
                  La severidad NONE es esperada para cambios — se muestra como "No aplica".
                </div>
                <EventsTable events={changeEvents} title="Cambios detectados" />
              </>
            )}

            {/* ══ Tab: Calidad de datos ══════════════════════ */}
            {activeTab === 'calidad' && (
              <DataQuality summary={result.summary} />
            )}

            {/* ══ Tab: Detalle completo ════════════════════ */}
            {activeTab === 'detalle' && (
              <EventsTable events={result.events} title="Detalle completo" />
            )}
          </>
        )}
      </main>
    </>
  );
}
