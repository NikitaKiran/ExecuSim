import { useEffect, useRef, useState } from "react";
import PageLayout from "@/components/PageLayout";
import TimeWheelPicker from "@/components/TimeWheelPicker";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { apiFetch } from "@/lib/api";
import OperationExplainPanel from "@/components/OperationExplainPanel";
import { asString, normalizeSide, type ReplayOperation } from "@/lib/replayOperation";
import { useLocation } from "react-router-dom";

const Compare = () => {
  const location = useLocation();
  const replayRunRef = useRef<string | null>(null);
  const [form, setForm] = useState({
    ticker: "", side: "BUY", quantity: "10000",
    startTime: "09:30", endTime: "16:00",
    startDate: "", endDate: "",
    interval: "5m",
    sliceFrequency: "5",
    participationCap: "0.1",
    aggressiveness: "1.0",
  });
  const [result, setResult] = useState<any>(null);
  const [usedVwapParams, setUsedVwapParams] = useState<{
    slice_frequency: number;
    participation_cap: number;
    aggressiveness: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showParamsInfo, setShowParamsInfo] = useState(false);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const run = async (formOverride?: typeof form) => {
    const activeForm = formOverride ?? form;
    if (!activeForm.ticker || !activeForm.side || !activeForm.quantity || !activeForm.startDate || !activeForm.endDate || !activeForm.startTime || !activeForm.endTime || !activeForm.interval) {
      setError("Please fill in all fields.");
      return;
    }

    const startDT = new Date(`${activeForm.startDate}T${activeForm.startTime}`);
    const endDT = new Date(`${activeForm.endDate}T${activeForm.endTime}`);
    if (startDT >= endDT) {
      setError("Start date/time must be before end date/time.");
      return;
    }

    const sliceFrequency = parseInt(activeForm.sliceFrequency);
    const participationCap = parseFloat(activeForm.participationCap);
    const aggressiveness = parseFloat(activeForm.aggressiveness);

    if (isNaN(sliceFrequency) || sliceFrequency < 1) {
      setError("Slice frequency must be 1 or greater.");
      return;
    }

    if (isNaN(participationCap) || participationCap <= 0 || participationCap > 1) {
      setError("Participation cap must be between 0 and 1.");
      return;
    }

    if (isNaN(aggressiveness) || aggressiveness <= 0 || aggressiveness > 2) {
      setError("Aggressiveness must be greater than 0 and at most 2.");
      return;
    }

    setError(null);
    setResult(null);
    setUsedVwapParams(null);
    setLoading(true);

    try {
      const response = await apiFetch("/api/execution/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: activeForm.ticker,
          side: activeForm.side,
          quantity: parseInt(activeForm.quantity),
          start_time: activeForm.startTime,
          end_time: activeForm.endTime,
          data_start: activeForm.startDate,
          data_end: activeForm.endDate,
          interval: activeForm.interval,
          slice_frequency: sliceFrequency,
          participation_cap: participationCap,
          aggressiveness,
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
      setUsedVwapParams(data?.vwap_parameters ?? {
        slice_frequency: sliceFrequency,
        participation_cap: participationCap,
        aggressiveness,
      });
    } catch (err: any) {
      console.error("Compare fetch failed:", err);
      setError(err.message || "Failed to run comparison. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const replayOperation = (location.state as { replayOperation?: ReplayOperation } | null)
      ?.replayOperation;
    if (!replayOperation) return;
    if (replayOperation.operationType.toLowerCase() !== "compare") return;
    if (replayRunRef.current === replayOperation.operationId) return;

    replayRunRef.current = replayOperation.operationId;
    const payload = replayOperation.requestPayload ?? {};
    const replayForm = {
      ticker: asString(payload.ticker),
      side: normalizeSide(payload.side, "upper"),
      quantity: asString(payload.quantity),
      startTime: asString(payload.start_time, "09:30"),
      endTime: asString(payload.end_time, "16:00"),
      startDate: asString(payload.data_start),
      endDate: asString(payload.data_end),
      interval: asString(payload.interval, "5m"),
      sliceFrequency: asString(payload.slice_frequency, "5"),
      participationCap: asString(payload.participation_cap, "0.1"),
      aggressiveness: asString(payload.aggressiveness, "1.0"),
    };

    setForm(replayForm);
    run(replayForm);
  }, [location.state]);

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
            <input
              type="text"
              value={form.ticker}
              onChange={(e) => update("ticker", e.target.value.toUpperCase())}
              placeholder="e.g. AAPL, RELIANCE.NS, BTC-USD"
              className="w-full h-[38px] bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary rounded-md"
            />
          </div>
          <SelectField label="SIDE" value={form.side} onChange={(v) => update("side", v)} options={["BUY", "SELL"]} />
          <Field label="QUANTITY" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <Field label="START DATE" value={form.startDate} onChange={(v) => update("startDate", v)} type="date" />
          <Field label="END DATE" value={form.endDate} onChange={(v) => update("endDate", v)} type="date" />
          <TimeWheelPicker label="START TIME" value={form.startTime} onChange={(v) => update("startTime", v)}/>
          <TimeWheelPicker label="END TIME" value={form.endTime} onChange={(v) => update("endTime", v)}/>
          <SelectField label="INTERVAL" value={form.interval} onChange={(v) => update("interval", v)} options={["1m", "5m", "15m", "1h"]} />
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-xs tracking-widest text-muted-foreground">
              STRATEGY TUNING PARAMETERS
            </h3>
            <button
              type="button"
              onClick={() => setShowParamsInfo(!showParamsInfo)}
              className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              {showParamsInfo ? "Hide explanation" : "What do these mean?"}
              <span className="text-sm">{showParamsInfo ? "▲" : "▼"}</span>
            </button>
          </div>

          {showParamsInfo && (
            <div className="mb-6 text-xs text-muted-foreground font-mono space-y-3 bg-muted/50 p-4 rounded-md border border-border/50">
              <p>
                <strong>Slice Frequency</strong> — Number of time slices per trading day.<br />
                Higher values = more granular schedule (e.g. 5 = new slice every ~78 minutes on a 6.5h day).
              </p>
              <p>
                <strong>Participation Capital</strong> — Maximum % of market volume the strategy will take in any slice (0.01–1.0).<br />
                0.10 means the strategy will never buy/sell more than 10% of the volume in that slice.
              </p>
              <p>
                <strong>Aggressiveness</strong> — How far the strategy deviates from pure VWAP to finish the order (0.1 = very conservative, 1.0 = neutral, &gt;1 = aggressive).
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field
              label="SLICE FREQUENCY"
              value={form.sliceFrequency}
              onChange={(v) => update("sliceFrequency", v)}
              type="number"
            />
            <Field
              label="PARTICIPATION CAPITAL"
              value={form.participationCap}
              onChange={(v) => update("participationCap", v)}
              type="number"
            />
            <Field
              label="AGGRESSIVENESS"
              value={form.aggressiveness}
              onChange={(v) => update("aggressiveness", v)}
              type="number"
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground/80 mt-3">
            These parameters are applied only to VWAP during comparison.
          </p>
        </div>
      </section>

      <button
        onClick={() => run()}
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
            {usedVwapParams && (
              <div className="mb-4 border border-border/60 bg-muted/40 rounded-md p-3">
                <p className="font-mono text-xs tracking-widest text-muted-foreground mb-2">VWAP PARAMETERS USED</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="font-mono text-xs text-foreground">
                    Slice Frequency: <span className="text-signal-green">{usedVwapParams.slice_frequency}</span>
                  </div>
                  <div className="font-mono text-xs text-foreground">
                    Participation Cap: <span className="text-signal-green">{usedVwapParams.participation_cap}</span>
                  </div>
                  <div className="font-mono text-xs text-foreground">
                    Aggressiveness: <span className="text-signal-green">{usedVwapParams.aggressiveness}</span>
                  </div>
                </div>
              </div>
            )}
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
             <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-2">SLIPPAGE (BPS)</h2>
<div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 p-2 bg-muted/40 rounded-md border border-border/50">
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(4,90%,61%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-red-400 font-semibold">TWAP</span> — slippage cost using time-based equal slices
    </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(152,100%,39%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-green-400 font-semibold">VWAP</span> — slippage cost using volume-weighted slices
    </span>
  </div>
  <p className="w-full font-mono text-xs text-muted-foreground/70">
    Lower is better — slippage measures how far your average execution price was from the price when the order was placed (in basis points, 1 bps = 0.01%)
  </p>
</div>
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
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-2">SHORTFALL ($)</h2>
<div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 p-2 bg-muted/40 rounded-md border border-border/50">
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(4,90%,61%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-red-400 font-semibold">TWAP</span> — total dollar cost lost vs ideal execution
    </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(152,100%,39%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-green-400 font-semibold">VWAP</span> — total dollar cost lost vs ideal execution
    </span>
  </div>
  <p className="w-full font-mono text-xs text-muted-foreground/70">
    Lower is better — implementation shortfall is the total extra cost ($) paid compared to if the entire order had filled instantly at the arrival price
  </p>
</div>
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

          {result.operation_id && (
            <OperationExplainPanel operationIds={[result.operation_id]} />
          )}
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
