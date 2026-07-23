import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

/* ── Paleta (Instana-inspired) ───────────────────────────────── */
const TYPE_C  = { INCIDENT: '#DC2626', ISSUE: '#EA580C', CHANGE: '#7C3AED' };
const SEV_C   = { CRITICAL: '#DC2626', WARNING: '#D97706', INFO: '#2F80ED', NONE: '#CBD5E1' };
const STATE_C = { OPEN: '#D97706', CLOSED: '#16A34A' };
const PALETTE = ['#2F80ED','#DC2626','#EA580C','#7C3AED','#16A34A','#D97706','#0891B2','#DB2777','#65A30D','#E11D48'];

const TYPE_ES  = { INCIDENT:'Incidentes', ISSUE:'Issues', CHANGE:'Cambios' };
const SEV_ES   = { CRITICAL:'Críticos', WARNING:'Advertencias', INFO:'Info', NONE:'No aplica' };
const STATE_ES = { OPEN:'Abiertos', CLOSED:'Cerrados' };

function colorFor(maps, name, idx) {
  for (const m of maps) if (m[name]) return m[name];
  return PALETTE[idx % PALETTE.length];
}
function objToArr(obj, labelMap) {
  if (!obj) return [];
  return Object.entries(obj).map(([name, value]) => ({ name, label: labelMap?.[name] ?? name, value }));
}

/* ── Agrupación por día ─────────────────────────────────────── */
function groupByDayType(events) {
  const map = {};
  const types = new Set();
  for (const e of events) {
    if (e.start == null) continue;
    const key = new Date(e.start).toISOString().slice(0, 10);
    if (!map[key]) map[key] = {};
    if (e.type) { map[key][e.type] = (map[key][e.type] ?? 0) + 1; types.add(e.type); }
  }
  const data = Object.entries(map).sort(([a],[b])=>a.localeCompare(b))
    .map(([key, vals]) => ({ date: key.slice(5).replace('-','/'), ...vals }));
  return { data, types: [...types] };
}

/* ── Tooltip ────────────────────────────────────────────────── */
function TTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b', color:'#f1f5f9', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
      {label && <p style={{ marginBottom:4, color:'#94a3b8' }}>{label}</p>}
      {payload.map(p=>(
        <p key={p.name} style={{ color: p.fill??p.color }}>
          {TYPE_ES[p.name]??SEV_ES[p.name]??STATE_ES[p.name]??p.name}: <strong>{(p.value??0).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
}

const RADIAN = Math.PI/180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>;
}

/* ── Texto conclusivo (reemplaza pie cuando hay pocos datos) ── */
function TextSummary({ data, colorMap, labelMap }) {
  if (!data.length) return <div className="chart-empty">Sin datos</div>;
  const total = data.reduce((s,d)=>s+d.value,0);
  return (
    <div style={{ padding:'8px 0', display:'flex', flexDirection:'column', gap:10 }}>
      {data.map((d,i)=>{
        const pct = total>0 ? Math.round((d.value/total)*100) : 0;
        const color = colorFor([colorMap??{}], d.name, i);
        return (
          <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10,height:10,borderRadius:'50%',background:color,flexShrink:0 }}/>
            <span style={{ fontSize:13,color:'#1e293b' }}>{labelMap?.[d.name]??d.name}</span>
            <span style={{ marginLeft:'auto',fontWeight:700,color,fontSize:15,minWidth:40,textAlign:'right' }}>
              {d.value.toLocaleString()}
            </span>
            <span style={{ color:'#94a3b8',fontSize:12,width:38,textAlign:'right' }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function PieOrText({ data, colorMap, labelMap, totalEvents }) {
  if (!data.length) return <div className="chart-empty">Sin datos</div>;
  const distinct = data.filter(d=>d.value>0).length;
  if (totalEvents < 3 || distinct < 2) return <TextSummary data={data} colorMap={colorMap} labelMap={labelMap}/>;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={PieLabel}>
          {data.map((e,i)=><Cell key={e.name} fill={colorFor([colorMap??{}],e.name,i)}/>)}
        </Pie>
        <Tooltip content={<TTip/>}/>
        <Legend formatter={v=><span style={{fontSize:12}}>{labelMap?.[v]??v}</span>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════════ */
export default function Charts({ summary, events, showChanges = false }) {
  const [includeGeneric, setIncludeGeneric] = useState(false);

  const { data: byDayType, types } = groupByDayType(events);
  const byType     = objToArr(summary.byType,     TYPE_ES);
  const bySeverity = objToArr(summary.bySeverity, SEV_ES).filter(d => showChanges || d.name !== 'NONE');
  const byState    = objToArr(summary.byState,    STATE_ES);

  // Top entidades — excluir genéricas/unknown por defecto
  const filteredEntities = includeGeneric
    ? (summary.topEntities ?? [])
    : (summary.topEntities ?? []).filter(e => {
        const lo = e.name.toLowerCase();
        return !['unknown','null','null/null','node','process','kubernetes pod',
          'cri-o container','criocontainer','pod','container','infrastructure'].includes(lo);
      });

  // Dominio técnico (excluir "Sin categoría" / "Infraestructura" genérico cuando tiene sentido)
  const domainData = Object.entries(summary.byDomain ?? {})
    .map(([name,value])=>({ name, value }))
    .sort((a,b)=>b.value-a.value);

  // Top problemas recurrentes
  const topProblems = (summary.topProblems ?? []).slice(0, 10);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Timeline */}
      <div className="chart-card full-width">
        <h3>Eventos por día</h3>
        {byDayType.length === 0 ? <div className="chart-empty">Sin datos</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDayType} margin={{top:4,right:12,left:0,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="date" tick={{fontSize:11,fill:'#64748b'}}/>
              <YAxis allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
              <Tooltip content={<TTip/>}/>
              <Legend formatter={v=><span style={{fontSize:12}}>{TYPE_ES[v]??v}</span>}/>
              {types.map((t,i)=><Bar key={t} dataKey={t} stackId="a" fill={colorFor([TYPE_C],t,i)} name={t}/>)}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Fila: tipo + severidad + estado */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Por tipo</h3>
          <PieOrText data={byType} colorMap={TYPE_C} labelMap={TYPE_ES} totalEvents={events.length}/>
        </div>

        <div className="chart-card">
          <h3>Por severidad</h3>
          <PieOrText data={bySeverity} colorMap={SEV_C} labelMap={SEV_ES} totalEvents={events.length}/>
        </div>

        <div className="chart-card">
          <h3>Por estado</h3>
          {byState.length === 0 ? <div className="chart-empty">Sin datos</div> : (
            <ResponsiveContainer width="100%" height={Math.max(100,byState.length*52+40)}>
              <BarChart data={byState} layout="vertical" margin={{left:8,right:52}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <YAxis type="category" dataKey="name" tickFormatter={v=>STATE_ES[v]??v} tick={{fontSize:12}} width={76}/>
                <Tooltip content={<TTip/>}/>
                <Bar dataKey="value" name="Eventos" radius={[0,4,4,0]}>
                  {byState.map((e,i)=><Cell key={e.name} fill={colorFor([STATE_C],e.name,i)}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Dominio técnico */}
        {domainData.length > 0 && (
          <div className="chart-card">
            <h3>Por dominio técnico</h3>
            <ResponsiveContainer width="100%" height={Math.max(120,domainData.length*32+40)}>
              <BarChart data={domainData} layout="vertical" margin={{left:8,right:52}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#334155'}} width={120}/>
                <Tooltip content={<TTip/>}/>
                <Bar dataKey="value" name="Eventos" fill="#0ea5e9" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top entidades identificadas */}
      {filteredEntities.length > 0 && (
        <div className="chart-card full-width">
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <h3 style={{margin:0}}>Top entidades afectadas</h3>
            <label style={{ display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',color:'#64748b',cursor:'pointer' }}>
              <input type="checkbox" checked={includeGeneric} onChange={e=>setIncludeGeneric(e.target.checked)}
                style={{accentColor:'#3b82f6'}}/>
              Incluir genéricas / Unknown
            </label>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(180,filteredEntities.length*30+40)}>
            <BarChart data={filteredEntities} layout="vertical" margin={{left:8,right:52}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
              <XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#334155'}} width={175}/>
              <Tooltip content={<TTip/>}/>
              <Bar dataKey="count" name="Eventos" fill="#8b5cf6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top problemas recurrentes */}
      {topProblems.length > 0 && (
        <div className="chart-card full-width">
          <h3>Problemas más recurrentes</h3>
          <ResponsiveContainer width="100%" height={Math.max(180,topProblems.length*30+40)}>
            <BarChart data={topProblems} layout="vertical" margin={{left:8,right:52}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
              <XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:'#64748b'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
              <YAxis type="category" dataKey="problem" tick={{fontSize:10,fill:'#334155'}} width={200}/>
              <Tooltip content={({ active, payload }) => {
                if (!active||!payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{background:'#1e293b',color:'#f1f5f9',padding:'10px 14px',borderRadius:8,fontSize:12,maxWidth:300}}>
                    <p style={{fontWeight:700,marginBottom:4}}>{d?.problem}</p>
                    <p>Total: <strong>{d?.count?.toLocaleString()}</strong></p>
                    <p>Abiertos: <strong style={{color:'#f59e0b'}}>{d?.open?.toLocaleString()}</strong></p>
                    {d?.types?.length > 0 && <p>Tipos: {d.types.join(', ')}</p>}
                  </div>
                );
              }}/>
              <Bar dataKey="count" name="Total" fill="#3b82f6" radius={[0,4,4,0]}/>
              <Bar dataKey="open" name="Abiertos" fill="#f59e0b" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
