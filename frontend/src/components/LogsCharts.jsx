import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const hh = (t) => new Date(t).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export default function LogsCharts({ summary }) {
  const tl = summary.timeline.map((x) => ({ ...x, label: hh(x.t) }));
  return (
    <>
      <div className="chart-card full-width" style={{ marginBottom: 16 }}>
        <h3>Logs por hora</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={tl}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip /><Legend />
            <Bar dataKey="ERROR" stackId="a" fill="#ef4444" />
            <Bar dataKey="WARN" stackId="a" fill="#f59e0b" />
            <Bar dataKey="OTHER" name="Otros" stackId="a" fill="#94a3b8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card full-width">
        <h3>Top servicios</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, summary.topServices.length * 28)}>
          <BarChart data={summary.topServices} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} fontSize={11} />
            <YAxis type="category" dataKey="name" width={180} fontSize={11} />
            <Tooltip />
            <Bar dataKey="count" name="Logs" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
