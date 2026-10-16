import * as XLSX from 'xlsx';

const fmt = (ts) => (ts == null ? '' : new Date(ts).toLocaleString('es-PE', { timeZone: 'America/Lima', hour12: false }));

export function exportLogsToExcel({ summary, logs }) {
  const wb = XLSX.utils.book_new();

  const res = [
    ['Total de logs', summary.total],
    ['Desde (Lima)', fmt(summary.queryRange.from)],
    ['Hasta (Lima)', fmt(summary.queryRange.to)],
    [],
    ['Nivel', 'Cantidad'],
    ...Object.entries(summary.byLevel),
    [],
    ['Servicio', 'Cantidad'],
    ...summary.topServices.map((s) => [s.name, s.count]),
    [],
    ['Perspectiva', 'Cantidad'],
    ...summary.topPerspectives.map((s) => [s.name, s.count]),
  ];
  const wsR = XLSX.utils.aoa_to_sheet(res);
  wsR['!cols'] = [{ wch: 44 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  const wsM = XLSX.utils.json_to_sheet(summary.topMessages.map((m) => ({
    Mensaje: m.message, Ocurrencias: m.count, Errores: m.errors,
    Servicios: m.services.join(', '), 'Último (Lima)': fmt(m.last),
  })));
  wsM['!cols'] = [{ wch: 90 }, { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsM, 'Mensajes recurrentes');

  const wsD = XLSX.utils.json_to_sheet(logs.map((l) => ({
    'Fecha (Lima)': fmt(l.timestamp), Nivel: l.level, Perspectiva: l.perspective, Mensaje: l.message,
    Servicio: l.service, Endpoint: l.endpoint, Tipo: l.endpointType, 'Application IDs': l.applicationIds,
  })));
  wsD['!cols'] = [{ wch: 20 }, { wch: 9 }, { wch: 28 }, { wch: 100 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsD, 'Detalle');

  XLSX.writeFile(wb, `instana-logs-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.xlsx`);
}
