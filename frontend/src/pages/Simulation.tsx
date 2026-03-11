import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { generateSimulationResult } from "@/lib/mockData";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Scatter,
  BarChart,
} from "recharts";

const Simulation = () => {
  const [form, setForm] = useState({
    ticker: "AAPL", side: "Buy", quantity: "10000",
    startTime: "09:30", endTime: "16:00",
    startDate: "2024-01-15", endDate: "2024-01-15",
    interval: "5m", strategy: "vwap",
  });
  const [result, setResult] = useState<any>(null);
  const [hoveredLog, setHoveredLog] = useState<number | null>(null);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const run = () => {
    setResult(generateSimulationResult(form.strategy, form.side, parseInt(form.quantity)));
  };

  const chartData = result?.execution_logs.map((log: any, i: number) => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    price: log.execution_price,
    volume: log.market_volume,
    index: i,
  })) || [];

  return (
    <PageLayout title="RUN STRATEGY SIMULATION">
      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">INPUT PARAMETERS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="TICKER" value={form.ticker} onChange={(v) => update("ticker", v)} />
          <SelectField label="SIDE" value={form.side} onChange={(v) => update("side", v)} options={["Buy", "Sell"]} />
          <Field label="QUANTITY" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <SelectField label="STRATEGY" value={form.strategy} onChange={(v) => update("strategy", v)} options={["twap", "vwap"]} />
          <Field label="START DATE" value={form.startDate} onChange={(v) => update("startDate", v)} type="date" />
          <Field label="END DATE" value={form.endDate} onChange={(v) => update("endDate", v)} type="date" />
          <Field label="START TIME" value={form.startTime} onChange={(v) => update("startTime", v)} type="time" />
          <Field label="END TIME" value={form.endTime} onChange={(v) => update("endTime", v)} type="time" />
          <SelectField label="INTERVAL" value={form.interval} onChange={(v) => update("interval", v)} options={["1m", "5m", "15m", "1h"]} />
        </div>
      </section>

      <button onClick={run} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-sm tracking-widest py-4 transition-colors border border-border">
        RUN SIMULATION
      </button>

      {result ? (
        <>
          <section className="border border-border bg-card p-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">EXECUTION SUMMARY</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Metric label="ARRIVAL PRICE" value={result.arrival_price} />
              <Metric label="AVG EXEC PRICE" value={result.avg_execution_price} />
              <Metric label="SLIPPAGE (BPS)" value={result.slippage_bps} color={result.slippage_bps > 5 ? "text-signal-red" : "text-signal-green"} />
              <Metric label="SHORTFALL" value={`$${result.implementation_shortfall}`} />
              <Metric label="TOTAL FILLED" value={result.total_filled.toLocaleString()} />
            </div>
          </section>

          <section className="border border-border bg-card p-6" style={{ marginTop: -1 }}>
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">EXECUTION CHART</h2>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="time" tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <YAxis yAxisId="price" tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <YAxis yAxisId="vol" orientation="right" tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <Line yAxisId="price" type="monotone" dataKey="price" stroke="hsl(216,25%,48%)" strokeWidth={2} dot={false} />
                <Scatter yAxisId="price" dataKey="price" fill="hsl(152,100%,39%)" shape={(props: any) => {
                  const isHovered = hoveredLog === props.index;
                  return (
                    <circle
                      cx={props.cx} cy={props.cy} r={isHovered ? 6 : 3}
                      fill={isHovered ? "hsl(152,100%,39%)" : "hsl(216,25%,48%)"}
                      className={isHovered ? "animate-pulse-dot" : ""}
                    />
                  );
                }} />
                <Bar yAxisId="vol" dataKey="volume" opacity={0.3}>
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill={hoveredLog === i ? "hsl(152,100%,60%)" : "hsl(216,25%,48%)"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="border border-border bg-card p-6" style={{ marginTop: -1 }}>
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">EXECUTION LOGS</h2>
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["TIMESTAMP", "REQ QTY", "FILLED", "EXEC PRICE", "MKT VOL", "PART RATE"].map((h) => (
                      <th key={h} className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.execution_logs.map((log: any, i: number) => (
                    <tr
                      key={i}
                      className={`border-b border-border/50 cursor-default transition-colors ${hoveredLog === i ? "bg-primary/10" : "hover:bg-muted/50"}`}
                      onMouseEnter={() => setHoveredLog(i)}
                      onMouseLeave={() => setHoveredLog(null)}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 pr-4">{log.requested_qty}</td>
                      <td className="py-2 pr-4">{log.filled_qty}</td>
                      <td className="py-2 pr-4 font-mono">{log.execution_price}</td>
                      <td className="py-2 pr-4">{log.market_volume.toLocaleString()}</td>
                      <td className="py-2 pr-4 font-mono">{(log.participation_rate * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="border border-border bg-muted p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING SIMULATION</p>
        </section>
      )}
    </PageLayout>
  );
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary" />
  </div>
);

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary">
      {options.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
    </select>
  </div>
);

const Metric = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div>
    <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">{label}</p>
    <p className={`font-mono text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
  </div>
);

export default Simulation;
