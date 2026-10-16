import { useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const toLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startDefault = () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; };
const endDefault = () => { const d = new Date(); d.setSeconds(0, 0); return d; };

export default function LogsForm({ onSubmit, loading, onReset }) {
  const [tenantUrl, setTenantUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [from, setFrom] = useState(toLocal(startDefault()));
  const [to, setTo] = useState(toLocal(endDefault()));
  const [mode, setMode] = useState('ALL');
  const [perspectiveId, setPerspectiveId] = useState('');
  const [operator, setOperator] = useState('NOT_EMPTY');

  function submit(e) {
    e.preventDefault();
    onSubmit({
      tenantUrl: tenantUrl.trim().replace(/\/$/, ''), apiToken,
      from: new Date(from).getTime(), to: new Date(to).getTime(),
      mode, perspectiveId, operator,
    });
  }

  return (
    <div className="card query-form">
      <h2>⚙ Configuración de Consulta</h2>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="t">Tenant URL</label>
            <input id="t" type="url" value={tenantUrl} onChange={(e) => setTenantUrl(e.target.value)}
              placeholder="https://empresa.instana.io" required disabled={loading} pattern="https://.*" />
            <small>Solo se aceptan URLs HTTPS.</small>
          </div>
          <div className="form-group">
            <label htmlFor="k">API Token</label>
            <input id="k" type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)}
              required disabled={loading} autoComplete="off" spellCheck={false} />
            <small>Viaja cifrado en HTTPS. No se almacena en ningún lado.</small>
          </div>
          <div className="form-group">
            <label htmlFor="f">Fecha y hora inicio</label>
            <input id="f" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} required disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="e">Fecha y hora fin</label>
            <input id="e" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} required disabled={loading} />
          </div>
        </div>

        <div className="form-section">
          <span className="form-section-label">Log Perspective</span>
          <div className="checkbox-group">
            {[['ALL', 'Todas las perspectivas (is present)'], ['ONE', 'Una específica (igual a)'], ['CONTAINS', 'Que contenga texto']].map(([v, l]) => (
              <label key={v} className="checkbox-label">
                <input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} disabled={loading} /> {l}
              </label>
            ))}
          </div>
          {mode !== 'ALL' && (
            <div className="form-group" style={{ marginTop: 10, maxWidth: 420 }}>
              <input value={perspectiveId} onChange={(e) => setPerspectiveId(e.target.value)}
                placeholder="A1_log_Oracle_ORA-02292" disabled={loading} />
            </div>
          )}
        </div>

        {mode === 'ALL' && (
          <div className="form-section">
            <span className="form-section-label">Opciones avanzadas</span>
            <div className="form-group" style={{ maxWidth: 420 }}>
              <label htmlFor="o">Operador del filtro "is present"</label>
              <input id="o" value={operator} onChange={(e) => setOperator(e.target.value)} disabled={loading} />
              <small>Por defecto NOT_EMPTY. Si Instana responde 400, copia el operador exacto desde "API query" en la UI.</small>
            </div>
          </div>
        )}

        <div className="form-divider" />
        <div className="form-actions">
          {onReset && <button type="button" className="btn btn-ghost" onClick={onReset} disabled={loading}>Nueva consulta</button>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Consultando…</> : '▶ Consultar Logs'}
          </button>
        </div>
      </form>
    </div>
  );
}
