import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { generateOptimizationResult } from "@/lib/mockData";

const Optimize = () => {
  const [form, setForm] = useState({
    ticker: "AAPL", side: "Buy", quantity: "10000",
    startTime: "09:30", endTime: "16:00",
    startDate: "2024-01-15", endDate: "2024-01-15",
    interval: "5m",
  });
  const [advanced, setAdvanced] = useState(false);
  const [gaSettings, setGaSettings] = useState({
    populationSize: "50", generations: "100", seed: "",
  });
  const [result, setResult] = useState<any>(null);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const updateGa = (key: string, val: string) => setGaSettings((f) => ({ ...f, [key]: val }));

  const run = () => {
    setResult(generateOptimizationResult(advanced));
  };

  return (
    <PageLayout title="OPTIMIZE VWAP">
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

      <section className="border border-border bg-card p-6" style={{ marginTop: -1 }}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => setAdvanced(e.target.checked)}
            className="w-4 h-4 accent-primary bg-muted border-border"
          />
          <span className="font-mono text-xs tracking-widest text-muted-foreground">ADVANCED OPTIMIZATION (GA SETTINGS)</span>
        </label>

        {advanced && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Field label="POPULATION SIZE" value={gaSettings.populationSize} onChange={(v) => updateGa("populationSize", v)} type="number" />
            <Field label="GENERATIONS" value={gaSettings.generations} onChange={(v) => updateGa("generations", v)} type="number" />
            <Field label="SEED (OPTIONAL)" value={gaSettings.seed} onChange={(v) => updateGa("seed", v)} />
          </div>
        )}
      </section>

      <button onClick={run} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-sm tracking-widest py-4 transition-colors border border-border">
        RUN OPTIMIZATION
      </button>

      {result ? (
        <>
          <section className="border border-border bg-card p-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">BEST PARAMETERS</h2>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="SLICE FREQUENCY" value={result.best_params.slice_frequency} />
              <Metric label="PARTICIPATION CAPITAL" value={result.best_params.participation_capital} />
              <Metric label="AGGRESSIVENESS" value={result.best_params.aggressiveness} />
            </div>
          </section>

          <section className="border border-border bg-card p-6" style={{ marginTop: -1 }}>
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">OPTIMIZATION METRICS</h2>
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ARRIVAL PRICE", "AVG EXEC PRICE", "SLIPPAGE (BPS)", "SHORTFALL ($)", "TOTAL FILLED"].map((h) => (
                      <th key={h} className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono">{result.metrics.arrival_price}</td>
                    <td className="py-2 pr-4 font-mono">{result.metrics.avg_execution_price}</td>
                    <td className="py-2 pr-4 font-mono text-signal-green">{result.metrics.slippage_bps}</td>
                    <td className="py-2 pr-4 font-mono">${result.metrics.shortfall}</td>
                    <td className="py-2 pr-4 font-mono">{result.metrics.total_filled.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="border border-border bg-muted p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING OPTIMIZATION</p>
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

const Metric = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">{label}</p>
    <p className="font-mono text-lg font-bold text-foreground">{value}</p>
  </div>
);

export default Optimize;
