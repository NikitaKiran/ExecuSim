import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import TimeWheelPicker from "@/components/TimeWheelPicker";

const Optimize = () => {
  const [form, setForm] = useState({
    ticker: "AAPL", side: "BUY", quantity: "10000",
    startTime: "09:30", endTime: "16:00",
    startDate: "", endDate: "",
    interval: "5m",
  });
  const [advanced, setAdvanced] = useState(false);
  const [gaSettings, setGaSettings] = useState({
    populationSize: "30", generations: "20", seed: "42",
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const updateGa = (key: string, val: string) => setGaSettings((f) => ({ ...f, [key]: val }));

  const validateMarketHours = (time: string): boolean => {
    const [h, m] = time.split(":").map(Number);
    const mins = h * 60 + m;
    return mins >= 9 * 60 + 30 && mins <= 16 * 60;
  };

  const run = async () => {
    if (!form.ticker || !form.side || !form.quantity || !form.startDate || !form.endDate || !form.startTime || !form.endTime || !form.interval) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateMarketHours(form.startTime) || !validateMarketHours(form.endTime)) {
      setError("Start and end times must be within US market hours (09:30 – 16:00 ET).");
      return;
    }

    const startDT = new Date(`${form.startDate}T${form.startTime}`);
    const endDT = new Date(`${form.endDate}T${form.endTime}`);
    if (startDT >= endDT) {
      setError("Start date/time must be before end date/time.");
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const body: any = {
        ticker: form.ticker,
        side: form.side,
        quantity: parseInt(form.quantity),
        start_time: form.startTime,
        end_time: form.endTime,
        data_start: form.startDate,
        data_end: form.endDate,
        interval: form.interval,
      };

      if (advanced) {
        body.population_size = parseInt(gaSettings.populationSize) || 30;
        body.generations = parseInt(gaSettings.generations) || 20;
        if (gaSettings.seed) body.seed = parseInt(gaSettings.seed);
      }

      const response = await fetch("http://localhost:8000/api/optimization/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error("Optimization failed:", err);
      setError(err.message || "Failed to run optimization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const metrics = result?.best_strategy_metrics;

  return (
    <PageLayout title="OPTIMIZE VWAP">
      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">INPUT PARAMETERS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">TICKER</label>
            <select value={form.ticker} onChange={(e) => update("ticker", e.target.value)}
              className="w-full h-[38px] bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary">
              <option value="AAPL">AAPL</option>
            </select>
          </div>
          <SelectField label="SIDE" value={form.side} onChange={(v) => update("side", v)} options={["BUY", "SELL"]} />
          <Field label="QUANTITY" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <Field label="START DATE" value={form.startDate} onChange={(v) => update("startDate", v)} type="date" />
          <Field label="END DATE" value={form.endDate} onChange={(v) => update("endDate", v)} type="date" />
          <TimeWheelPicker label="START TIME" value={form.startTime} onChange={(v) => update("startTime", v)} minTime="09:30" maxTime="16:00" />
          <TimeWheelPicker label="END TIME" value={form.endTime} onChange={(v) => update("endTime", v)} minTime="09:30" maxTime="16:00" />
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
            <Field label="SEED (OPTIONAL)" value={gaSettings.seed} onChange={(v) => updateGa("seed", v)} type="number" />
          </div>
        )}
      </section>

      <button
        onClick={run}
        disabled={loading}
        className={`w-full font-mono text-sm tracking-widest py-4 transition-colors border border-border mt-4 ${
          loading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary hover:bg-primary/80 text-primary-foreground"
        }`}
      >
        {loading ? "OPTIMIZING..." : "RUN OPTIMIZATION"}
      </button>

      {error && (
        <section className="border border-red-500/40 bg-red-950/20 p-6 mt-6 rounded-md text-center">
          <p className="text-red-400 font-mono text-sm tracking-wide font-medium">ERROR: {error}</p>
          <p className="text-xs text-red-300/80 mt-3">
            Tip: For intraday intervals, data is usually only available for the last 60 days.
          </p>
        </section>
      )}

      {loading && !error && (
        <section className="border border-border bg-muted p-12 mt-6 text-center rounded-md">
          <p className="font-mono text-xs text-muted-foreground tracking-widest animate-pulse">
            RUNNING GA OPTIMIZATION...
          </p>
        </section>
      )}

      {!loading && !error && result && metrics ? (
        <>
          <section className="border border-border bg-card p-6 mt-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">BEST PARAMETERS</h2>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="SLICE FREQUENCY" value={result.best_parameters.slice_frequency} />
              <Metric label="PARTICIPATION CAP" value={result.best_parameters.volume_participation_cap ?? result.best_parameters.participation_cap} />
              <Metric label="AGGRESSIVENESS" value={result.best_parameters.aggressiveness} />
            </div>
          </section>

          <section className="border border-border bg-accent/5 p-4" style={{ marginTop: -1 }}>
            <div className="flex items-center justify-between font-mono text-sm">
              <span className="text-muted-foreground">BEST COST (IMPL. SHORTFALL)</span>
              <span className="text-signal-green font-bold">${result.best_cost}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs mt-1">
              <span className="text-muted-foreground/70">GENERATIONS: {result.generations_run} | POPULATION: {result.population_size}</span>
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
                    <td className="py-2 pr-4 font-mono">{metrics.arrival_price}</td>
                    <td className="py-2 pr-4 font-mono">{metrics.average_execution_price}</td>
                    <td className="py-2 pr-4 font-mono text-signal-green">{metrics.slippage}</td>
                    <td className="py-2 pr-4 font-mono">${metrics.implementation_shortfall}</td>
                    <td className="py-2 pr-4 font-mono">{metrics.total_filled_qty?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : !loading && !error ? (
        <section className="border border-border bg-muted p-12 mt-6 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING OPTIMIZATION</p>
        </section>
      ) : null}
    </PageLayout>
  );
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-[38px] bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary" />
  </div>
);

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-[38px] bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary">
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
