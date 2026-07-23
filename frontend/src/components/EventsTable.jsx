import { useState, useMemo } from 'react';

const PAGE_SIZE = 100;

function fmtTs(ts) {
  if (ts == null) return '—';
  return new Date(ts).toLocaleString('es-ES', {
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit',
  });
}

function unique(arr) { return [...new Set(arr.filter(Boolean))].sort(); }

const QUALITY_BADGE = {
  IDENTIFIED: { bg:'#f0fdf4', color:'#15803d', label:'Identificada' },
  GENERIC:    { bg:'#f8fafc', color:'#64748b', label:'Genérica' },
  UNKNOWN:    { bg:'#fef2f2', color:'#b91c1c', label:'Sin identificar' },
};

function Badge({ className, children, style }) {
  return <span className={`badge ${className??''}`} style={style}>{children}</span>;
}

function QBadge({ quality }) {
  const s = QUALITY_BADGE[quality] ?? QUALITY_BADGE.UNKNOWN;
  return <Badge style={{ background:s.bg, color:s.color }}>{s.label}</Badge>;
}

// Severidad: NONE para CHANGE → "No aplica"
function fmtSeverity(sev, type) {
  if (sev === 'NONE' || (sev == null && type === 'CHANGE')) return 'No aplica';
  return sev ?? '—';
}

export default function EventsTable({ events, title = 'Tabla operativa' }) {
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeF]      = useState('');
  const [sevFilter,  setSevF]       = useState('');
  const [stateFilter,setStateF]     = useState('');
  const [domainFilter,setDomainF]   = useState('');
  const [qualityFilter,setQualityF] = useState('');
  const [page, setPage]             = useState(1);

  const types    = useMemo(()=>unique(events.map(e=>e.type)),            [events]);
  const sevs     = useMemo(()=>unique(events.map(e=>e.severity)),        [events]);
  const states   = useMemo(()=>unique(events.map(e=>e.state)),           [events]);
  const domains  = useMemo(()=>unique(events.map(e=>e.technicalDomain)), [events]);
  const qualities= useMemo(()=>unique(events.map(e=>e.entityQuality)),   [events]);

  const filtered = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return events.filter(e=>{
      if (typeFilter    && e.type            !== typeFilter)    return false;
      if (sevFilter     && e.severity        !== sevFilter)     return false;
      if (stateFilter   && e.state           !== stateFilter)   return false;
      if (domainFilter  && e.technicalDomain !== domainFilter)  return false;
      if (qualityFilter && e.entityQuality   !== qualityFilter) return false;
      if (q) {
        const hay = [e.problem,e.affectedEntity,e.entityType,e.technicalDomain,e.detail]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, typeFilter, sevFilter, stateFilter, domainFilter, qualityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  function rp() { setPage(1); }

  return (
    <div className="table-section">
      <div className="table-top">
        <h3>{title}</h3>
        <span className="table-count">
          {filtered.length.toLocaleString()} de {events.length.toLocaleString()} registros
          {filtered.length !== events.length && ' (filtrado)'}
        </span>
      </div>

      <div className="table-filters">
        <input className="filter-input" type="text" placeholder="Buscar problema, entidad, detalle…"
          value={search} onChange={e=>{ setSearch(e.target.value); rp(); }}/>
        <select className="filter-select" value={typeFilter}
          onChange={e=>{ setTypeF(e.target.value); rp(); }}>
          <option value="">Todos los tipos</option>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={sevFilter}
          onChange={e=>{ setSevF(e.target.value); rp(); }}>
          <option value="">Todas las severidades</option>
          {sevs.map(s=><option key={s} value={s}>{s==='NONE'?'No aplica':s}</option>)}
        </select>
        <select className="filter-select" value={stateFilter}
          onChange={e=>{ setStateF(e.target.value); rp(); }}>
          <option value="">Todos los estados</option>
          {states.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={domainFilter}
          onChange={e=>{ setDomainF(e.target.value); rp(); }}>
          <option value="">Todos los dominios</option>
          {domains.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={qualityFilter}
          onChange={e=>{ setQualityF(e.target.value); rp(); }}>
          <option value="">Todas las calidades</option>
          <option value="IDENTIFIED">Identificadas</option>
          <option value="GENERIC">Genéricas</option>
          <option value="UNKNOWN">Sin identificar</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="events-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th>Problema</th>
              <th>Entidad afectada</th>
              <th>Tipo entidad</th>
              <th>Dominio técnico</th>
              <th>Calidad</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th style={{textAlign:'right'}}>Dur. (min)</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={12} style={{textAlign:'center',padding:'32px',color:'#94a3b8'}}>
                Sin resultados.
              </td></tr>
            ) : paginated.map((e,idx)=>(
              <tr key={e.eventId ?? `${idx}-${e.start}`}>
                <td><Badge className={`badge-${(e.type??'').toLowerCase()}`}>{e.type??'—'}</Badge></td>
                <td>
                  <Badge className={`badge-${(e.severity??'none').toLowerCase()}`}>
                    {fmtSeverity(e.severity, e.type)}
                  </Badge>
                </td>
                <td><Badge className={`badge-${(e.state??'').toLowerCase()}`}>{e.state??'—'}</Badge></td>
                <td className="td-truncate" title={e.problem??undefined}>{e.problem??'—'}</td>
                <td className="td-truncate" title={e.affectedEntity??undefined}>
                  <strong>{e.affectedEntity??'—'}</strong>
                </td>
                <td style={{whiteSpace:'nowrap',color:'#64748b',fontSize:'0.77rem'}}>{e.entityType??'—'}</td>
                <td style={{whiteSpace:'nowrap',fontSize:'0.77rem'}}>{e.technicalDomain??'—'}</td>
                <td><QBadge quality={e.entityQuality}/></td>
                <td className="td-mono">{fmtTs(e.start)}</td>
                <td className="td-mono">{fmtTs(e.end)}</td>
                <td className="td-num">{e.durationMinutes??'—'}</td>
                <td className="td-truncate" title={e.detail??undefined}>
                  {e.detail ? e.detail.slice(0,80)+(e.detail.length>80?'…':'') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Anterior</button>
          <span>Página {page} de {totalPages} ({filtered.length.toLocaleString()} registros)</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
