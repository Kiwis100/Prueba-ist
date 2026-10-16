/**
 * logsClient.js — Cliente frontend para POST /api/logging/logs/getLogs/v1 (Instana).
 * El token solo vive en memoria durante la consulta; nunca se guarda.
 */
const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 30;
const PAGE = 200;
const BASE_TAGS = ['log.level', 'log.message', 'log.custom', 'log.timestamp'];
const PERSP_TAG = 'log.perspectiveIds';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isHttps = (u) => { try { return new URL(u).protocol === 'https:'; } catch { return false; } };

/** Filtro por perspectiva. ALL = todas (equivale a "is present" en la UI). */
function buildFilter({ mode, perspectiveId, operator }) {
  const f = { type: 'TAG_FILTER', name: PERSP_TAG, entity: 'NOT_APPLICABLE' };
  if (mode === 'ONE')      return { ...f, operator: 'EQUALS',   value: perspectiveId };
  if (mode === 'CONTAINS') return { ...f, operator: 'CONTAINS', value: perspectiveId };
  return { ...f, operator: operator || 'NOT_EMPTY' };
}

async function post(url, token, body, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `apiToken ${token}` },
        body: JSON.stringify(body),
      });
      if ((res.status === 429 || res.status >= 500) && i < retries) { await sleep(Math.min(1000 * 2 ** i, 20_000)); continue; }
      return res;
    } catch (e) {
      lastErr = e;
      if (i < retries) await sleep(1000 * 2 ** i);
    }
  }
  throw lastErr ?? new Error('Reintentos agotados');
}

function normalize(raw) {
  const c = {};
  for (const kv of raw['log.custom'] ?? []) c[kv.key] = kv.value;
  const p = raw[PERSP_TAG];
  return {
    timestamp: raw['log.timestamp'],
    level: (raw['log.level'] ?? 'UNKNOWN').toUpperCase(),
    message: raw['log.message'] ?? '',
    perspective: Array.isArray(p) ? p.join(', ') : (p ?? ''),
    service: c.service_name ?? '(sin servicio)',
    endpoint: c.endpoint_name ?? '',
    endpointType: c.endpoint_type ?? '',
    applicationIds: c.application_ids ?? '',
    serviceId: c.service_id ?? '',
  };
}

const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

export async function queryInstanaLogs({ tenantUrl, apiToken, from, to, mode, perspectiveId, operator, onProgress }) {
  if (!isHttps(tenantUrl)) throw new Error('La Tenant URL debe comenzar con https://');
  if (!apiToken?.trim()) throw new Error('El API Token es requerido.');
  if (!isFinite(from) || !isFinite(to) || from >= to) throw new Error('Rango de fechas inválido.');
  if (to - from > MAX_RANGE_DAYS * DAY_MS) throw new Error(`El rango no puede superar ${MAX_RANGE_DAYS} días.`);
  if (mode !== 'ALL' && !perspectiveId?.trim()) throw new Error('Indica el ID de la perspectiva.');

  const url = `${tenantUrl.replace(/\/$/, '')}/api/logging/logs/getLogs/v1`;
  const filter = buildFilter({ mode, perspectiveId: perspectiveId?.trim(), operator: operator?.trim() });

  const blocks = [];
  for (let c = from; c < to; ) { const e = Math.min(c + DAY_MS, to); blocks.push({ from: c, to: e }); c = e; }

  let includePersp = true;
  const logs = [];
  const blockErrors = [];

  for (let b = 0; b < blocks.length; b++) {
    const blk = blocks[b];
    let offset = 0;
    for (;;) {
      const body = {
        tagFilterExpression: filter,
        timeConfig: { to: blk.to, focusedMoment: blk.to, autoRefresh: false, windowSize: blk.to - blk.from },
        retrievalSize: PAGE, offset, orderDirection: 'DESC',
        requestedTags: includePersp ? [...BASE_TAGS, PERSP_TAG] : BASE_TAGS,
      };
      let res;
      try { res = await post(url, apiToken, body); }
      catch (e) {
        if (/fetch|network|cors/i.test(e?.message ?? ''))
          throw new Error('No se pudo conectar con Instana (posible bloqueo CORS desde el navegador). Prueba con un proxy o con el script local de PowerShell.');
        blockErrors.push({ ...blk, error: 'Error de conexión' }); break;
      }
      if (res.status === 401) throw new Error('Autenticación fallida: revisa el API Token.');
      if (res.status === 403) throw new Error('Acceso denegado: el token no tiene permisos de logs.');
      if (res.status === 400 && includePersp) { includePersp = false; continue; } // reintenta sin pedir log.perspectiveIds
      if (!res.ok) {
        let det = ''; try { det = (await res.json()).message ?? ''; } catch { /* noop */ }
        blockErrors.push({ ...blk, error: `HTTP ${res.status} ${det}`.trim() }); break;
      }
      const data = await res.json();
      const items = data.items ?? [];
      for (const it of items) logs.push(normalize(it));
      onProgress?.({ block: b + 1, blocks: blocks.length, logs: logs.length });
      if (!data.canLoadMore || items.length === 0) break;
      offset += items.length;
    }
  }

  return { summary: summarize(logs, from, to, blocks.length, blockErrors, includePersp), logs };
}

function summarize(logs, from, to, blocks, blockErrors, hasPerspCol) {
  const byLevel = {}, byService = {}, byPerspective = {}, byEndpointType = {}, hourly = {}, msgs = {};
  for (const l of logs) {
    inc(byLevel, l.level); inc(byService, l.service);
    if (l.perspective) inc(byPerspective, l.perspective);
    if (l.endpointType) inc(byEndpointType, l.endpointType);
    const h = new Date(l.timestamp); h.setMinutes(0, 0, 0);
    const hk = h.getTime();
    hourly[hk] = hourly[hk] ?? { t: hk, ERROR: 0, WARN: 0, OTHER: 0 };
    hourly[hk][l.level === 'ERROR' || l.level === 'WARN' ? l.level : 'OTHER']++;
    const key = l.message.trim().slice(0, 300);
    msgs[key] = msgs[key] ?? { message: key, count: 0, errors: 0, services: new Set(), last: 0 };
    msgs[key].count++; if (l.level === 'ERROR') msgs[key].errors++;
    msgs[key].services.add(l.service); msgs[key].last = Math.max(msgs[key].last, l.timestamp);
  }
  const top = (o, n = 15) => Object.entries(o).sort(([, a], [, b]) => b - a).slice(0, n).map(([name, count]) => ({ name, count }));
  return {
    total: logs.length, queryRange: { from, to }, byLevel, byEndpointType,
    topServices: top(byService), topPerspectives: top(byPerspective),
    timeline: Object.values(hourly).sort((a, b) => a.t - b.t),
    topMessages: Object.values(msgs).sort((a, b) => b.count - a.count).slice(0, 30)
      .map((m) => ({ ...m, services: [...m.services] })),
    blocksQueried: blocks, blocksWithErrors: blockErrors.length, blockErrors, hasPerspCol,
  };
}
