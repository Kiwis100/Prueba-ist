import { useState } from 'react';

function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function defaultTo() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function QueryForm({ onSubmit, loading, onReset }) {
  const [tenantUrl, setTenantUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [from, setFrom] = useState(toDatetimeLocal(defaultFrom()));
  const [to, setTo] = useState(toDatetimeLocal(defaultTo()));
  const [eventTypes, setEventTypes] = useState({ INCIDENT: true, ISSUE: true, CHANGE: true });
  const [excludeTriggeredBefore, setExcludeTriggeredBefore] = useState(true);
  const [filterEventUpdates, setFilterEventUpdates] = useState(false);

  function toggleType(type) {
    setEventTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const eventTypeFilters = Object.entries(eventTypes)
      .filter(([, v]) => v)
      .map(([k]) => k);

    onSubmit({
      tenantUrl: tenantUrl.trim().replace(/\/$/, ''),
      apiToken,
      from: new Date(from).getTime(),
      to: new Date(to).getTime(),
      eventTypeFilters,
      excludeTriggeredBefore,
      filterEventUpdates,
    });
  }

  const TYPE_LABELS = {
    INCIDENT: 'Incidentes',
    ISSUE: 'Problemas',
    CHANGE: 'Cambios',
  };

  return (
    <div className="card query-form">
      <h2>⚙ Configuración de Consulta</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="tenantUrl">Tenant URL</label>
            <input
              id="tenantUrl"
              type="url"
              value={tenantUrl}
              onChange={(e) => setTenantUrl(e.target.value)}
              placeholder="https://empresa.instana.io"
              required
              disabled={loading}
              pattern="https://.*"
              title="Debe comenzar con https://"
            />
            <small>Solo se aceptan URLs HTTPS.</small>
          </div>

          <div className="form-group">
            <label htmlFor="apiToken">API Token</label>
            <input
              id="apiToken"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Token de API de Instana"
              required
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
            <small>Viaja cifrado en HTTPS. No se almacena en ningún lado.</small>
          </div>

          <div className="form-group">
            <label htmlFor="from">Fecha y hora inicio</label>
            <input
              id="from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="to">Fecha y hora fin</label>
            <input
              id="to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-section">
          <span className="form-section-label">Tipos de evento</span>
          <div className="checkbox-group">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <label key={type} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={eventTypes[type]}
                  onChange={() => toggleType(type)}
                  disabled={loading}
                />
                {label} ({type})
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <span className="form-section-label">Opciones avanzadas</span>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={excludeTriggeredBefore}
                onChange={(e) => setExcludeTriggeredBefore(e.target.checked)}
                disabled={loading}
              />
              Excluir eventos disparados antes del rango
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filterEventUpdates}
                onChange={(e) => setFilterEventUpdates(e.target.checked)}
                disabled={loading}
              />
              Filtrar actualizaciones de eventos
            </label>
          </div>
        </div>

        <div className="form-divider" />

        <div className="form-actions">
          {onReset && (
            <button type="button" className="btn btn-ghost" onClick={onReset} disabled={loading}>
              Nueva consulta
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Consultando…
              </>
            ) : (
              '▶ Consultar Eventos'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
