import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { generateComparisonResult } from "@/lib/mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const Compare = () => {
  const [form, setForm] = useState({
    ticker: "AAPL", side: "Buy", quantity: "10000",
    startTime: "09:30", endTime: "16:00",
    startDate: "2024-01-15", endDate: "2024-01-15",
    interval: "5m",
  });
  const [result, setResult] = useState<any>(null);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const run = () => {
    setResult(generateComparisonResult(form.side, parseInt(form.quantity)));
  };

  const slippageData = result ? [
    { name: "TWAP", value: result.twap.slippage_bps },
    { name: "VWAP", value: result.vwap.slippage_bps },
  ] : [];

  const shortfallData = result ? [
    { name: "TWAP", value: result.twap.implementation_shortfall },
    { name: "VWAP", value: result.vwap.implementation_shortfall },
  ] : [];

  return (
    <PageLayout title="COMPARE STRATEGIES">
      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">INPUT PARAMETERS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="TICKER" value={form.ticker} onChange={(v) => update("ticker", v)} />
          <SelectField label="SIDE" value={form.side} onChange={(v) => update("side", v)} options={["Buy", "Sell"]} />
          <Field label="QUANTITY" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <Field label="START DATE" value={form.startDate} onChange={(v) => update("startDate", v)} type="date" />
          <Field label="END DATE" value={form.endDate} onChange={(v) => update("endDate", v)} type="date" />
          <Field label="START TIME" value={form.startTime} onChange={(v) => update("startTime", v)} type="time" />
          <Field label="END TIME" value={form.endTime} onChange={(v) => update("endTime", v)} type="time" />
          <SelectField label="INTERVAL" value={form.interval} onChange={(v) => update("interval", v)} options={["1m", "5m", "15m", "1h"]} />
        </div>
      </section>

      <button onClick={run} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-sm tracking-widest py-4 transition-colors border border-border">
        COMPARE TWAP vs VWAP
      </button>

      {result ? (
        <>
          <section className="border border-border bg-card p-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">COMPARISON TABLE</h2>
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["METRIC", "TWAP", "VWAP"].map((h) => (
                      <th key={h} className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "ARRIVAL PRICE", twap: result.twap.arrival_price, vwap: result.vwap.arrival_price },
                    { label: "AVG EXEC PRICE", twap: result.twap.avg_execution_price, vwap: result.vwap.avg_execution_price },
                    { label: "SLIPPAGE (BPS)", twap: result.twap.slippage_bps, vwap: result.vwap.slippage_bps },
                    { label: "SHORTFALL ($)", twap: result.twap.implementation_shortfall, vwap: result.vwap.implementation_shortfall },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{row.label}</td>
                      <td className="py-2 pr-4 font-mono">{row.twap}</td>
                      <td className="py-2 pr-4 font-mono">{row.vwap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-border bg-accent/5 p-4" style={{ marginTop: -1 }}>
            <p className="font-mono text-sm text-signal-green">{result.recommendation}</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0" style={{ marginTop: -1 }}>
            <section className="border border-border bg-card p-6">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">SLIPPAGE (BPS)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={slippageData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                  <YAxis tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                  <Tooltip content={<ChartTooltip unit="bps" />} />
                  <Bar dataKey="value">
                    {slippageData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(4,90%,61%)" : "hsl(152,100%,39%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="border border-border bg-card p-6" style={{ marginLeft: -1 }}>
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">SHORTFALL ($)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shortfallData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                  <YAxis tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                  <Tooltip content={<ChartTooltip unit="$" />} />
                  <Bar dataKey="value">
                    {shortfallData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(4,90%,61%)" : "hsl(152,100%,39%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      ) : (
        <section className="border border-border bg-muted p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING COMPARISON</p>
        </section>
      )}
    </PageLayout>
  );
};

const ChartTooltip = ({ active, payload, unit }: any) => {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-xs">
      {payload[0].payload.name}: {payload[0].value} {unit}
    </div>
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

export default Compare;
