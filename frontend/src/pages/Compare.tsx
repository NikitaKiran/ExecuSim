import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import TimeWheelPicker from "@/components/TimeWheelPicker";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const Compare = () => {
  const [form, setForm] = useState({
    ticker: "AAPL", side: "BUY", quantity: "10000",
    startTime: "09:30", endTime: "16:00",
    startDate: "", endDate: "",
    interval: "5m",
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const validateMarketHours = (time: string): boolean => {
    // US/Eastern market hours: 09:30 – 16:00
    const [h, m] = time.split(":").map(Number);
    const mins = h * 60 + m;
    return mins >= 9 * 60 + 30 && mins <= 16 * 60; // 09:30 – 16:00
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
      const response = await fetch("http://localhost:8000/api/execution/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker,
          side: form.side,
          quantity: parseInt(form.quantity),
          start_time: form.startTime,
          end_time: form.endTime,
          data_start: form.startDate,
          data_end: form.endDate,
          interval: form.interval,
        }),
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
      console.error("Compare fetch failed:", err);
      setError(err.message || "Failed to run comparison. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Extract metrics from API response shape
  const twapMetrics = result?.comparisons?.find((c: any) => c.strategy === "TWAP")?.metrics;
  const vwapMetrics = result?.comparisons?.find((c: any) => c.strategy === "VWAP")?.metrics;

  const slippageData = twapMetrics && vwapMetrics ? [
    { name: "TWAP", value: twapMetrics.slippage },
    { name: "VWAP", value: vwapMetrics.slippage },
  ] : [];

  const shortfallData = twapMetrics && vwapMetrics ? [
    { name: "TWAP", value: twapMetrics.implementation_shortfall },
    { name: "VWAP", value: vwapMetrics.implementation_shortfall },
  ] : [];

  return (
    <PageLayout title="COMPARE STRATEGIES">
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

      <button
        onClick={run}
        disabled={loading}
        className={`w-full font-mono text-sm tracking-widest py-4 transition-colors border border-border mt-4 ${
          loading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary hover:bg-primary/80 text-primary-foreground"
        }`}
      >
        {loading ? "COMPARING..." : "COMPARE TWAP vs VWAP"}
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
            RUNNING COMPARISON...
          </p>
        </section>
      )}

      {!loading && !error && twapMetrics && vwapMetrics ? (
        <>
          <section className="border border-border bg-card p-6 mt-6">
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
                    { label: "ARRIVAL PRICE", twap: twapMetrics.arrival_price, vwap: vwapMetrics.arrival_price },
                    { label: "AVG EXEC PRICE", twap: twapMetrics.average_execution_price, vwap: vwapMetrics.average_execution_price },
                    { label: "SLIPPAGE (BPS)", twap: twapMetrics.slippage, vwap: vwapMetrics.slippage },
                    { label: "SHORTFALL ($)", twap: twapMetrics.implementation_shortfall, vwap: vwapMetrics.implementation_shortfall },
                    { label: "TOTAL FILLED", twap: twapMetrics.total_filled_qty, vwap: vwapMetrics.total_filled_qty },
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
                  <Tooltip content={<ChartTooltip unit="$" />} />
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
      ) : !loading && !error ? (
        <section className="border border-border bg-muted p-12 mt-6 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING COMPARISON</p>
        </section>
      ) : null}
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

export default Compare;
