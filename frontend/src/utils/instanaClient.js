/**
 * instanaClient.js — Frontend-only Instana API client.
 *
 * Ports the normalization / aggregation / classification logic from
 * backend/server.js so the app can run without a backend proxy.
 *
 * Security model:
 *  - apiToken is held in-memory only during the async call.
 *  - It is NEVER written to localStorage, sessionStorage, cookies, or console.
 *  - It travels in the Authorization header over HTTPS to the Instana tenant.
 */

/* ── Constants ──────────────────────────────────────────────── */
const VALID_TYPES    = new Set(['INCIDENT', 'ISSUE', 'CHANGE']);
const MAX_RANGE_DAYS = 90;
const DAY_MS         = 86_400_000;

const TYPE_MAP  = { incident: 'INCIDENT', issue: 'ISSUE', change: 'CHANGE' };
const STATE_MAP = { open: 'OPEN', closed: 'CLOSED' };
const SEV_NUM   = { '-1': 'NONE', '5': 'WARNING', '10': 'CRITICAL' };
const SEV_STR   = { warning: 'WARNING', critical: 'CRITICAL', info: 'INFO', none: 'NONE' };

const UNKNOWN_NAMES = new Set([
  'unknown', 'null', 'null/null', 'n/a', '-', '', 'undefined',
  'sin entidad identificada',
]);

const GENERIC_NAMES = new Set([
  'node', 'process', 'kubernetes pod', 'kubernetespod',
  'cri-o container', 'criocontainer', 'container', 'infrastructure',
  'pod', 'infra', 'infrastructure host',
]);

const ET_DISPLAY = {
  host: 'Host', node: 'Nodo', process: 'Proceso', docker: 'Docker Container',
  pod: 'Pod', deployment: 'Deployment', namespace: 'Namespace',
  kubernetescluster: 'Clúster K8s', kubernetesnode: 'Nodo K8s',
  kubernetespod: 'Pod K8s', cricontainer: 'Container CRI', crio: 'Container CRI',
  service: 'Servicio', application: 'Aplicación', endpoint: 'Endpoint',
  httpendpoint: 'HTTP Endpoint', jvmruntimeplatform: 'JVM',
  mysqldatabase: 'MySQL', postgresqldatabase: 'PostgreSQL',
  mongodatabase: 'MongoDB', redisdatabase: 'Redis',
  awslambdafunction: 'Lambda', awss3bucket: 'S3',
};

const TYPE_TO_DOMAIN = {
  'Host': 'Infraestructura', 'Nodo': 'Infraestructura',
  'Proceso': 'Infraestructura', 'Docker Container': 'Infraestructura',
  'Nodo K8s': 'Kubernetes', 'Pod K8s': 'Kubernetes',
  'Pod': 'Kubernetes', 'Deployment': 'Kubernetes',
  'Namespace': 'Kubernetes', 'Container CRI': 'Kubernetes',
  'Clúster K8s': 'Kubernetes',
  'Servicio': 'Aplicación', 'Aplicación': 'Aplicación',
  'Endpoint': 'Aplicación', 'HTTP Endpoint': 'Aplicación', 'JVM': 'Aplicación',
  'MySQL': 'Base de datos', 'PostgreSQL': 'Base de datos',
  'MongoDB': 'Base de datos', 'Redis': 'Cache',
  'Lambda': 'Cloud', 'S3': 'Cloud',
};

const NAME_RULES = [
  { test: (n) => /worker[-_]?\d+|master[-_]?\d+|control[-_.]plane/i.test(n), type: 'Nodo K8s', domain: 'Kubernetes' },
  { test: (n) => /\bsqlserver\b|sql[-_ ]?server/i.test(n),                    type: 'SQL Server', domain: 'Base de datos' },
  { test: (n) => /\bdb2sysc\b|\bdb2\b/i.test(n),                              type: 'DB2', domain: 'Base de datos' },
  { test: (n) => /\bredis\b/i.test(n),                                         type: 'Redis', domain: 'Cache' },
  { test: (n) => /\bqmgr\b|\bibm[\s._-]?mq\b/i.test(n),                      type: 'Queue Manager', domain: 'Mensajería' },
  { test: (n) => /ibm.app.connect|app.connect.enterprise|\bace\b/i.test(n),   type: 'ACE Middleware', domain: 'Integración' },
  { test: (n) => /^[a-z0-9][a-z0-9-]+-[a-z0-9]{5,}-[a-z0-9]{4,5}$/i.test(n), type: 'Pod K8s', domain: 'Kubernetes' },
  { test: (n) => /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*){2,}$/i.test(n),  type: 'Host', domain: 'Infraestructura' },
  { test: (n) => /^[a-z]{3,}[a-z0-9]{3,}$/i.test(n) && n.length >= 7 && n.length <= 32 && !/\s/.test(n), type: 'Host', domain: 'Infraestructura' },
];

/* ── Normalization ───────────────────────────────────────────── */
function normType(raw)     { if (!raw) return null; return TYPE_MAP[raw.toLowerCase()]  ?? raw.toUpperCase(); }
function normState(raw)    { if (!raw) return null; return STATE_MAP[raw.toLowerCase()] ?? raw.toUpperCase(); }
function normSeverity(raw) {
  if (raw == null) return null;
  const s = String(raw);
  return SEV_NUM[s] ?? SEV_STR[s.toLowerCase()] ?? s.toUpperCase();
}

function simplifyEntityType(raw) {
  if (!raw) return null;
  const last = raw.split('.').pop().toLowerCase();
  return ET_DISPLAY[last] ?? (last.charAt(0).toUpperCase() + last.slice(1));
}

function classifyEntity(affectedEntity, rawEntityTypeName) {
  const name   = (affectedEntity ?? '').trim();
  const nameLo = name.toLowerCase();

  let quality;
  if (!name || UNKNOWN_NAMES.has(nameLo)) quality = 'UNKNOWN';
  else if (GENERIC_NAMES.has(nameLo))     quality = 'GENERIC';
  else                                     quality = 'IDENTIFIED';

  const baseType = simplifyEntityType(rawEntityTypeName) ?? 'Desconocido';

  if (quality === 'IDENTIFIED') {
    for (const rule of NAME_RULES) {
      if (rule.test(name)) {
        return { entityType: rule.type, technicalDomain: rule.domain, entityQuality: 'IDENTIFIED' };
      }
    }
  }

  const domain = TYPE_TO_DOMAIN[baseType] ?? 'Infraestructura';
  return { entityType: baseType, technicalDomain: domain, entityQuality: quality };
}

function isRealHost(entityType, affectedEntity, quality) {
  if (quality === 'UNKNOWN' || quality === 'GENERIC') return false;
  if (['Host', 'Nodo K8s', 'SQL Server', 'DB2', 'Nodo'].includes(entityType)) return true;
  if (!affectedEntity) return false;
  return (
    /worker[-_]?\d+|master[-_]?\d+/i.test(affectedEntity) ||
    /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*){2,}$/i.test(affectedEntity) ||
    (/^[a-z]{3,}[a-z0-9]{3,}$/i.test(affectedEntity) && affectedEntity.length >= 7)
  );
}

function normalizeEvent(raw) {
  const type     = normType(raw.type);
  const state    = normState(raw.state);
  const severity = normSeverity(raw.severity);
  const start    = raw.start ?? raw.triggeredAt ?? null;
  const end      = raw.end ?? null;

  const affectedEntity =
    raw.entityLabel ?? raw.entityName ??
    raw.entity?.label ?? raw.entity?.name ??
    (raw.snapshotId ? `snap:${raw.snapshotId}` : null) ??
    null;

  const rawET = raw.entityType ?? raw.entity?.entityType?.types?.[0] ?? raw.entity?.type ?? null;
  const { entityType, technicalDomain, entityQuality } = classifyEntity(affectedEntity, rawET);

  return {
    eventId: raw.id ?? raw.eventId ?? null,
    type, state, severity,
    start, end,
    durationMinutes: start != null && end != null ? Math.round((end - start) / 60_000) : null,
    problem:         raw.problem ?? raw.title ?? null,
    detail:          raw.detail  ?? raw.text  ?? null,
    affectedEntity:  affectedEntity ?? 'Sin identificar',
    entityType, technicalDomain, entityQuality,
    snapshotId:        raw.snapshotId        ?? null,
    applicationId:     raw.applicationId     ?? null,
    endpointId:        raw.endpointId        ?? null,
    endpointServiceId: raw.endpointServiceId ?? null,
  };
}

/* ── Network helpers ─────────────────────────────────────────── */
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchBlock(url, apiToken, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `apiToken ${apiToken}` },
      });
      if ((res.status === 429 || res.status >= 500) && i < retries) {
        await sleep(Math.min(1000 * 2 ** i, 30_000));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(Math.min(1000 * 2 ** i, 30_000));
    }
  }
  throw lastErr ?? new Error('Max retries exceeded');
}

/* ── Validation ──────────────────────────────────────────────── */
function isHttpsUrl(raw) {
  try { return new URL(raw).protocol === 'https:'; }
  catch { return false; }
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════ */
export async function queryInstanaEvents({
  tenantUrl,
  apiToken,
  from,
  to,
  eventTypeFilters    = ['INCIDENT', 'ISSUE', 'CHANGE'],
  excludeTriggeredBefore = true,
  filterEventUpdates     = false,
}) {
  /* ── Validate ────────────────────────────────────────────── */
  if (!tenantUrl || !isHttpsUrl(tenantUrl))
    throw new Error('La Tenant URL debe comenzar con https:// (ej: https://empresa.instana.io).');

  if (!apiToken?.trim())
    throw new Error('El API Token es requerido.');

  if (typeof from !== 'number' || typeof to !== 'number' || !isFinite(from) || !isFinite(to))
    throw new Error('El rango de fechas no es válido.');

  if (from >= to)
    throw new Error('La fecha de inicio debe ser anterior a la fecha de fin.');

  if (to - from > MAX_RANGE_DAYS * DAY_MS)
    throw new Error(`El rango no puede superar ${MAX_RANGE_DAYS} días.`);

  const validFilters = (Array.isArray(eventTypeFilters) ? eventTypeFilters : [])
    .filter((t) => VALID_TYPES.has(t));

  if (!validFilters.length)
    throw new Error('Selecciona al menos un tipo de evento (INCIDENT, ISSUE, CHANGE).');

  const base = tenantUrl.replace(/\/$/, '');

  /* ── Build daily blocks ──────────────────────────────────── */
  const blocks = [];
  for (let c = from; c < to; ) {
    const e = Math.min(c + DAY_MS, to);
    blocks.push({ from: c, to: e });
    c = e;
  }

  const allEvents  = new Map();
  const blockErrors = [];

  for (const block of blocks) {
    const p = new URLSearchParams();
    p.set('from', String(block.from));
    p.set('to',   String(block.to));
    validFilters.forEach((t) => p.append('eventTypeFilters', t));
    if (excludeTriggeredBefore) p.set('excludeTriggeredBefore', 'true');
    if (filterEventUpdates)     p.set('filterEventUpdates', 'true');

    let response;
    try {
      response = await fetchBlock(`${base}/api/events?${p}`, apiToken);
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('Failed to fetch') || msg.includes('fetch failed') || msg.toLowerCase().includes('cors')) {
        throw new Error(
          'No se pudo conectar con la API de Instana. Posible causa: restricción CORS.\n\n' +
          'La API de Instana puede no permitir solicitudes directas desde el navegador ' +
          '(error CORS). Opciones:\n' +
          '• Usa la versión con backend proxy para uso en producción.\n' +
          '• Si tu tenant lo permite, configura CORS en Instana Settings.\n' +
          '• Usa una extensión de navegador que permita CORS (solo para uso personal).'
        );
      }
      blockErrors.push({ from: block.from, to: block.to, error: 'Error de conexión.' });
      continue;
    }

    if (response.status === 401)
      throw new Error('Autenticación fallida. Verifica que el API Token sea correcto y esté activo.');
    if (response.status === 403)
      throw new Error('Acceso denegado. El token no tiene permisos de lectura de eventos.');
    if (response.status === 429) { blockErrors.push({ from: block.from, to: block.to, error: 'Rate limit.' }); continue; }
    if (response.status >= 500)  { blockErrors.push({ from: block.from, to: block.to, error: `HTTP ${response.status}` }); continue; }
    if (!response.ok)            { blockErrors.push({ from: block.from, to: block.to, error: `HTTP ${response.status}` }); continue; }

    let data;
    try { data = await response.json(); }
    catch { blockErrors.push({ from: block.from, to: block.to, error: 'Respuesta JSON inválida.' }); continue; }

    const rawEvents = Array.isArray(data) ? data : (data.events ?? []);
    for (const raw of rawEvents) {
      const evt = normalizeEvent(raw);
      if (evt.eventId != null) {
        if (!allEvents.has(evt.eventId)) allEvents.set(evt.eventId, evt);
      } else {
        const key = `${evt.type}|${evt.start}|${evt.affectedEntity}`;
        if (!allEvents.has(key)) allEvents.set(key, evt);
      }
    }
  }

  const events = Array.from(allEvents.values());

  /* ── Aggregate summary ───────────────────────────────────── */
  const byType = {}, bySeverity = {}, byState = {};
  const byTypeAndSeverity = {}, byTypeAndState = {};
  const entityCounts = {}, problemCounts = {}, domainCounts = {}, entityTypeCounts = {};
  let identified = 0, generic = 0, unknown = 0;
  let noDuration = 0, noneSeverity = 0, outOfRange = 0;
  const hostSet = new Set(), entitySet = new Set();
  let durSum = 0, durCount = 0;

  for (const e of events) {
    if (e.type) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      byTypeAndSeverity[e.type] = byTypeAndSeverity[e.type] ?? {};
      byTypeAndState[e.type]    = byTypeAndState[e.type]    ?? {};
      if (e.severity) byTypeAndSeverity[e.type][e.severity] = (byTypeAndSeverity[e.type][e.severity] ?? 0) + 1;
      if (e.state)    byTypeAndState[e.type][e.state]       = (byTypeAndState[e.type][e.state]       ?? 0) + 1;
    }
    if (e.severity) bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    if (e.state)    byState[e.state]        = (byState[e.state]       ?? 0) + 1;

    if      (e.entityQuality === 'IDENTIFIED') identified++;
    else if (e.entityQuality === 'GENERIC')    generic++;
    else                                        unknown++;

    const ent = e.affectedEntity;
    if (e.entityQuality === 'IDENTIFIED') {
      entitySet.add(ent);
      entityCounts[ent] = (entityCounts[ent] ?? 0) + 1;
      if (isRealHost(e.entityType, ent, e.entityQuality)) hostSet.add(ent);
    }

    if (e.problem) {
      const pk = e.problem.trim().toLowerCase();
      if (!problemCounts[pk]) problemCounts[pk] = { problem: e.problem, count: 0, open: 0, types: new Set() };
      problemCounts[pk].count++;
      if (e.state === 'OPEN') problemCounts[pk].open++;
      if (e.type) problemCounts[pk].types.add(e.type);
    }

    if (e.technicalDomain) domainCounts[e.technicalDomain] = (domainCounts[e.technicalDomain] ?? 0) + 1;
    if (e.entityType)      entityTypeCounts[e.entityType]  = (entityTypeCounts[e.entityType]  ?? 0) + 1;

    if (e.durationMinutes == null) noDuration++;
    if (e.severity === 'NONE')     noneSeverity++;
    if (e.start != null && (e.start < from || e.start > to)) outOfRange++;
    if (e.durationMinutes != null && e.durationMinutes >= 0) {
      durSum += e.durationMinutes; durCount++;
    }
  }

  const topEntities = Object.entries(entityCounts)
    .sort(([, a], [, b]) => b - a).slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topProblems = Object.values(problemCounts)
    .sort((a, b) => b.count - a.count).slice(0, 20)
    .map(({ types, ...r }) => ({ ...r, types: [...types] }));

  const confidencePct = events.length > 0 ? Math.round((identified / events.length) * 100) : 0;

  const summary = {
    total:              events.length,
    queryTypes:         validFilters,
    queryRange:         { from, to },
    byType, bySeverity, byState, byTypeAndSeverity, byTypeAndState,
    topEntities, topProblems,
    byDomain:           domainCounts,
    byEntityType:       entityTypeCounts,
    affectedEntitiesCount: entitySet.size,
    hostsDetectedCount:    hostSet.size,
    avgDurationMinutes:    durCount > 0 ? Math.round(durSum / durCount) : null,
    dataQuality: {
      total: events.length, identified, generic, unknown,
      confidencePct, noDuration, noneSeverity, outOfRange,
    },
    blocksQueried:    blocks.length,
    blocksWithErrors: blockErrors.length,
    ...(blockErrors.length > 0 && { blockErrors }),
  };

  return { summary, events };
}
