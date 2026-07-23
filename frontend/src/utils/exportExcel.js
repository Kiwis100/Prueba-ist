import ExcelJS from 'exceljs';

/* ── Palette (ARGB: AA RR GG BB) ──────────────────────────────── */
const C = {
  DARK_BLUE:    'FF0F2744',
  MID_BLUE:     'FF1B3A6B',
  ACCENT:       'FF2F80ED',
  ACCENT_LIGHT: 'FFD6E8FF',
  WHITE:        'FFFFFFFF',
  BG_LIGHT:     'FFF5F7FA',
  TEXT_DARK:    'FF1E293B',
  TEXT_MID:     'FF334155',
  TEXT_LIGHT:   'FF94A3B8',
  RED:          'FFDC2626',
  RED_LIGHT:    'FFFFF1F2',
  AMBER:        'FFF59E0B',
  AMBER_LIGHT:  'FFFEF3C7',
  BLUE_OPEN:    'FFE0F2FE',
};

const CAL = { name: 'Calibri' };

function fill(argb)  { return { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }
function font(bold = false, size = 11, argb = C.TEXT_DARK) {
  return { ...CAL, bold, size, color: { argb } };
}
function al(h = 'left', v = 'middle') { return { horizontal: h, vertical: v }; }

function fmtDate(ts) {
  if (ts == null) return '';
  return new Date(ts).toLocaleString('es-ES');
}
function fmtSev(sev, type) {
  if (sev === 'NONE' || (sev == null && type === 'CHANGE')) return 'No aplica';
  return sev ?? '';
}

/* ══════════════════════════════════════════════════════════════
   SHEET 1 — RESUMEN EJECUTIVO
══════════════════════════════════════════════════════════════ */
function buildSummarySheet(wb, summary) {
  const ws = wb.addWorksheet('Resumen Ejecutivo');
  ws.views = [{ showGridLines: false }];
  ws.columns = [
    { width: 4 }, { width: 36 }, { width: 20 }, { width: 26 }, { width: 20 }, { width: 4 },
  ];

  const dq  = summary.dataQuality ?? {};
  const now = new Date().toLocaleString('es-ES');
  let r = 1;

  /* ── helpers (close over `ws` and `r`) ─────────────────────── */
  function fillRow(height, argb) {
    ws.getRow(r).height = height;
    ['A','B','C','D','E','F'].forEach(col => { ws.getCell(`${col}${r}`).fill = fill(argb); });
  }
  function section(label) {
    ws.getRow(r).height = 22;
    ws.mergeCells(`A${r}:F${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = label; c.font = font(true, 11, C.WHITE);
    c.fill = fill(C.MID_BLUE); c.alignment = al('left', 'middle');
    r++;
  }
  function kpiRow(l1, v1, l2, v2) {
    ws.getRow(r).height = 19;
    ws.getCell(`A${r}`).fill = fill(C.BG_LIGHT);
    ws.getCell(`F${r}`).fill = fill(C.WHITE);
    const lc1 = ws.getCell(`B${r}`); lc1.value = l1; lc1.font = font(false, 10, C.TEXT_MID); lc1.fill = fill(C.BG_LIGHT);
    const vc1 = ws.getCell(`C${r}`); vc1.value = v1; vc1.font = font(true, 13, C.ACCENT);   vc1.fill = fill(C.WHITE); vc1.alignment = al('right');
    if (l2 !== undefined) {
      const lc2 = ws.getCell(`D${r}`); lc2.value = l2; lc2.font = font(false, 10, C.TEXT_MID); lc2.fill = fill(C.BG_LIGHT);
      const vc2 = ws.getCell(`E${r}`); vc2.value = v2; vc2.font = font(true, 13, C.ACCENT);   vc2.fill = fill(C.WHITE); vc2.alignment = al('right');
    } else {
      ws.getCell(`D${r}`).fill = fill(C.WHITE);
      ws.getCell(`E${r}`).fill = fill(C.WHITE);
    }
    r++;
  }
  function tableHdr(h1, h2, h3) {
    ws.getRow(r).height = 16;
    ['A','E','F'].forEach(col => ws.getCell(`${col}${r}`).fill = fill(C.WHITE));
    const c1 = ws.getCell(`B${r}`); c1.value = h1; c1.font = font(true, 10, C.ACCENT); c1.fill = fill(C.ACCENT_LIGHT);
    const c2 = ws.getCell(`C${r}`); c2.value = h2; c2.font = font(true, 10, C.ACCENT); c2.fill = fill(C.ACCENT_LIGHT); c2.alignment = al('right');
    if (h3) {
      const c3 = ws.getCell(`D${r}`); c3.value = h3; c3.font = font(true, 10, C.ACCENT); c3.fill = fill(C.ACCENT_LIGHT); c3.alignment = al('right');
    } else {
      ws.getCell(`D${r}`).fill = fill(C.WHITE);
    }
    r++;
  }
  function tableRow(label, val, val2, val2Argb) {
    ws.getRow(r).height = 16;
    ['A','E','F'].forEach(col => ws.getCell(`${col}${r}`).fill = fill(C.WHITE));
    ws.getCell(`B${r}`).value = label; ws.getCell(`B${r}`).font = font(false, 10, C.TEXT_MID); ws.getCell(`B${r}`).fill = fill(C.WHITE);
    ws.getCell(`C${r}`).value = val;   ws.getCell(`C${r}`).font = font(true, 10, C.TEXT_DARK); ws.getCell(`C${r}`).fill = fill(C.WHITE); ws.getCell(`C${r}`).alignment = al('right');
    if (val2 !== undefined) {
      ws.getCell(`D${r}`).value = val2; ws.getCell(`D${r}`).font = font(true, 10, val2Argb ?? C.TEXT_DARK); ws.getCell(`D${r}`).fill = fill(C.WHITE); ws.getCell(`D${r}`).alignment = al('right');
    } else {
      ws.getCell(`D${r}`).fill = fill(C.WHITE);
    }
    r++;
  }

  /* ── Header ────────────────────────────────────────────────── */
  fillRow(8,  C.DARK_BLUE); r++;
  fillRow(34, C.DARK_BLUE);
  ws.mergeCells(`B${r}:E${r}`);
  const tc = ws.getCell(`B${r}`);
  tc.value = 'Instana Events Exporter  —  Resumen Ejecutivo';
  tc.font = font(true, 16, C.WHITE); tc.alignment = al('left', 'middle');
  tc.fill = fill(C.DARK_BLUE);
  ws.getCell(`A${r}`).fill = fill(C.DARK_BLUE);
  ws.getCell(`F${r}`).fill = fill(C.DARK_BLUE);
  r++;
  fillRow(8, C.DARK_BLUE); r++;
  fillRow(4, C.ACCENT);    r++;

  /* Meta row */
  ws.getRow(r).height = 18;
  ['A','F'].forEach(col => { ws.getCell(`${col}${r}`).fill = fill(C.BG_LIGHT); });
  ws.mergeCells(`B${r}:C${r}`);
  ws.getCell(`B${r}`).value = `Exportado: ${now}`; ws.getCell(`B${r}`).font = font(false, 10, C.TEXT_LIGHT); ws.getCell(`B${r}`).fill = fill(C.BG_LIGHT);
  ws.mergeCells(`D${r}:E${r}`);
  ws.getCell(`D${r}`).value = `Tipos consultados: ${(summary.queryTypes ?? []).join(', ')}`; ws.getCell(`D${r}`).font = font(false, 10, C.TEXT_LIGHT); ws.getCell(`D${r}`).fill = fill(C.BG_LIGHT);
  r++;
  r++;

  /* ── MÉTRICAS PRINCIPALES ───────────────────────────────────── */
  section('MÉTRICAS PRINCIPALES');
  kpiRow('Total de eventos',           summary.total,                           'Duración promedio (min)',  summary.avgDurationMinutes ?? '—');
  kpiRow('Incidentes (INCIDENT)',      summary.byType?.INCIDENT  ?? 0,          'Issues (ISSUE)',           summary.byType?.ISSUE    ?? 0);
  kpiRow('Cambios (CHANGE)',           summary.byType?.CHANGE    ?? 0,          'Hosts / nodos detectados', summary.hostsDetectedCount ?? 0);
  kpiRow('Críticos (CRITICAL)',        summary.bySeverity?.CRITICAL ?? 0,       'Advertencias (WARNING)',   summary.bySeverity?.WARNING ?? 0);
  kpiRow('Abiertos (OPEN)',            summary.byState?.OPEN     ?? 0,          'Cerrados (CLOSED)',        summary.byState?.CLOSED ?? 0);
  kpiRow('Confianza análisis (%)',     dq.confidencePct ?? 0,                   'Entidades identificadas',  dq.identified ?? 0);
  r++;

  /* ── DISTRIBUCIÓN ───────────────────────────────────────────── */
  section('DISTRIBUCIÓN');
  tableHdr('POR TIPO', 'Cantidad');
  tableRow('Incidentes (INCIDENT)', summary.byType?.INCIDENT ?? 0);
  tableRow('Issues (ISSUE)',        summary.byType?.ISSUE    ?? 0);
  tableRow('Cambios (CHANGE)',      summary.byType?.CHANGE   ?? 0);
  r++;
  tableHdr('POR SEVERIDAD', 'Cantidad');
  tableRow('Críticos (CRITICAL)',    summary.bySeverity?.CRITICAL ?? 0);
  tableRow('Advertencias (WARNING)', summary.bySeverity?.WARNING  ?? 0);
  tableRow('Info (INFO)',            summary.bySeverity?.INFO     ?? 0);
  tableRow('No aplica (NONE)',       summary.bySeverity?.NONE     ?? 0);
  r++;
  tableHdr('POR ESTADO', 'Cantidad');
  tableRow('Abiertos (OPEN)',   summary.byState?.OPEN   ?? 0);
  tableRow('Cerrados (CLOSED)', summary.byState?.CLOSED ?? 0);
  r++;

  /* ── CALIDAD DE DATOS ───────────────────────────────────────── */
  section('CALIDAD DE DATOS');
  tableHdr('Indicador', 'Valor');
  tableRow('Entidades identificadas', dq.identified    ?? 0);
  tableRow('Entidades genéricas',     dq.generic       ?? 0);
  tableRow('Sin identificar',         dq.unknown       ?? 0);
  tableRow('Confianza (%)',           dq.confidencePct ?? 0);
  tableRow('Sin duración',            dq.noDuration    ?? 0);
  tableRow('Inicio fuera de rango',   dq.outOfRange    ?? 0);
  r++;

  /* ── TOP ENTIDADES ──────────────────────────────────────────── */
  if ((summary.topEntities ?? []).length > 0) {
    section('TOP ENTIDADES AFECTADAS');
    tableHdr('Entidad', 'Eventos');
    for (const e of (summary.topEntities ?? [])) tableRow(e.name, e.count);
    r++;
  }

  /* ── TOP PROBLEMAS ──────────────────────────────────────────── */
  if ((summary.topProblems ?? []).length > 0) {
    section('TOP PROBLEMAS RECURRENTES');
    tableHdr('Problema', 'Total', 'Abiertos');
    for (const p of (summary.topProblems ?? [])) {
      tableRow(p.problem, p.count, p.open, p.open > 0 ? C.AMBER : C.TEXT_LIGHT);
    }
    r++;
  }

  /* ── Footer ─────────────────────────────────────────────────── */
  r++;
  ws.getCell(`B${r}`).value = `Bloques consultados: ${summary.blocksQueried ?? 0}   ·   Bloques con error: ${summary.blocksWithErrors ?? 0}`;
  ws.getCell(`B${r}`).font = { ...CAL, italic: true, size: 9, color: { argb: C.TEXT_LIGHT } };
}

/* ══════════════════════════════════════════════════════════════
   SHEET 2 — EVENTOS
══════════════════════════════════════════════════════════════ */
function buildEventsSheet(wb, events) {
  const ws = wb.addWorksheet('Eventos');

  ws.columns = [
    { header: 'ID Evento',        key: 'c01', width: 26 },
    { header: 'Tipo',             key: 'c02', width: 12 },
    { header: 'Severidad',        key: 'c03', width: 14 },
    { header: 'Estado',           key: 'c04', width: 11 },
    { header: 'Problema',         key: 'c05', width: 46 },
    { header: 'Entidad afectada', key: 'c06', width: 38 },
    { header: 'Tipo entidad',     key: 'c07', width: 20 },
    { header: 'Dominio técnico',  key: 'c08', width: 22 },
    { header: 'Calidad entidad',  key: 'c09', width: 17 },
    { header: 'Inicio',           key: 'c10', width: 22 },
    { header: 'Fin',              key: 'c11', width: 22 },
    { header: 'Duración (min)',   key: 'c12', width: 15 },
    { header: 'Detalle',          key: 'c13', width: 58 },
  ];

  /* Style header row */
  const hdrRow = ws.getRow(1);
  hdrRow.height = 24;
  hdrRow.eachCell(cell => {
    cell.fill      = fill(C.DARK_BLUE);
    cell.font      = font(true, 11, C.WHITE);
    cell.alignment = al('center', 'middle');
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];
  ws.autoFilter = { from: 'A1', to: 'M1' };

  /* Batch-add data rows for performance */
  ws.addRows(events.map(e => [
    e.eventId,
    e.type,
    fmtSev(e.severity, e.type),
    e.state,
    e.problem,
    e.affectedEntity,
    e.entityType,
    e.technicalDomain,
    e.entityQuality,
    fmtDate(e.start),
    fmtDate(e.end),
    e.durationMinutes,
    e.detail,
  ]));

  /* Conditional formatting — Excel evaluates client-side */
  const lastRow = Math.max(events.length + 1, 2);
  ws.addConditionalFormatting({
    ref: `A2:M${lastRow}`,
    rules: [
      {
        priority: 1,
        type: 'expression',
        formulae: ['$C2="CRITICAL"'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.RED_LIGHT } },
          font: { color: { argb: C.RED } },
        },
      },
      {
        priority: 2,
        type: 'expression',
        formulae: ['$C2="WARNING"'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.AMBER_LIGHT } },
          font: { color: { argb: 'FF92400E' } },
        },
      },
      {
        priority: 3,
        type: 'expression',
        formulae: ['$D2="OPEN"'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.BLUE_OPEN } },
        },
      },
    ],
  });
}

/* ══════════════════════════════════════════════════════════════
   SHEET 3 — ENTIDADES
══════════════════════════════════════════════════════════════ */
function buildEntitiesSheet(wb, events) {
  const ws = wb.addWorksheet('Entidades');

  /* Aggregate entity stats from raw events (richer than topEntities) */
  const map = {};
  for (const e of events) {
    const key = e.affectedEntity || 'Sin identificar';
    if (!map[key]) {
      map[key] = {
        name: key, domain: e.technicalDomain ?? '', type: e.entityType ?? '',
        quality: e.entityQuality ?? '', total: 0,
        incidents: 0, issues: 0, changes: 0, open: 0, closed: 0,
      };
    }
    const ent = map[key];
    ent.total++;
    if (e.type === 'INCIDENT') ent.incidents++;
    else if (e.type === 'ISSUE') ent.issues++;
    else if (e.type === 'CHANGE') ent.changes++;
    if (e.state === 'OPEN') ent.open++; else if (e.state === 'CLOSED') ent.closed++;
  }

  const rows = Object.values(map).sort((a, b) => b.total - a.total);

  ws.columns = [
    { header: 'Entidad',           key: 'c1', width: 42 },
    { header: 'Dominio técnico',   key: 'c2', width: 24 },
    { header: 'Tipo entidad',      key: 'c3', width: 20 },
    { header: 'Calidad',           key: 'c4', width: 16 },
    { header: 'Total eventos',     key: 'c5', width: 14 },
    { header: 'Incidentes',        key: 'c6', width: 13 },
    { header: 'Issues',            key: 'c7', width: 11 },
    { header: 'Cambios',           key: 'c8', width: 11 },
    { header: 'Abiertos',          key: 'c9', width: 11 },
    { header: 'Cerrados',          key: 'c10',width: 11 },
  ];

  const hdrRow = ws.getRow(1);
  hdrRow.height = 24;
  hdrRow.eachCell(cell => {
    cell.fill      = fill(C.DARK_BLUE);
    cell.font      = font(true, 11, C.WHITE);
    cell.alignment = al('center', 'middle');
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];
  ws.autoFilter = { from: 'A1', to: 'J1' };

  ws.addRows(rows.map(e => [
    e.name, e.domain, e.type, e.quality,
    e.total, e.incidents, e.issues, e.changes, e.open, e.closed,
  ]));

  if (rows.length > 0) {
    ws.addConditionalFormatting({
      ref: `A2:J${rows.length + 1}`,
      rules: [
        {
          priority: 1,
          type: 'expression',
          formulae: ['$I2>0'],
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.AMBER_LIGHT } },
            font: { color: { argb: C.AMBER } },
          },
        },
      ],
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC EXPORT
══════════════════════════════════════════════════════════════ */
export async function exportToExcel({ summary, events }) {
  const wb     = new ExcelJS.Workbook();
  wb.creator   = 'Instana Events Exporter';
  wb.created   = new Date();

  buildSummarySheet(wb, summary);
  buildEventsSheet(wb, events);
  buildEntitiesSheet(wb, events);

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = `instana-events-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
