import { useEffect, useRef, useState } from "react";
import PageLayout from "@/components/PageLayout";
import TimeWheelPicker from "@/components/TimeWheelPicker";
import { apiFetch } from "@/lib/api";
import OperationExplainPanel from "@/components/OperationExplainPanel";
import { asString, normalizeSide, type ReplayOperation } from "@/lib/replayOperation";
import { useLocation } from "react-router-dom";

const Evaluate = () => {
  const location = useLocation();
  const replayRunRef = useRef<string | null>(null);
  const [form, setForm] = useState({
    ticker: "",
    side: "Buy",
    quantity: "100000",
    startDate: "",
    endDate: "",
    startTime: "09:30",
    endTime: "16:00",
    interval: "5m",
    sliceFrequency: "5",
    participationCapital: "0.10",
    aggressiveness: "1.0",
    seed: "42",
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParamsInfo, setShowParamsInfo] = useState(false);

  const update = (key: string, val: string | null) => {
    setForm((f) => ({ ...f, [key]: val ?? f[key as keyof typeof f] }));
  };

  const runEvaluation = async (formOverride?: typeof form) => {
    const activeForm = formOverride ?? form;
    setError(null);
    setResult(null);
    setLoading(true);

    if (
      !activeForm.startDate ||
      !activeForm.endDate ||
      !activeForm.quantity ||
      parseInt(activeForm.quantity) <= 0
    ) {
      setError("Please fill all required fields (ticker, side, quantity, dates) with valid values.");
      setLoading(false);
      return;
    }

    try {
      const sliceFreq = parseInt(activeForm.sliceFrequency);
      const partCap = parseFloat(activeForm.participationCapital);
      const agg = parseFloat(activeForm.aggressiveness);

      if (isNaN(sliceFreq) || sliceFreq < 1) throw new Error("Slice frequency must be ≥ 1");
      if (isNaN(partCap) || partCap < 0.01 || partCap > 1) throw new Error("Participation capital must be 0.01–1.0");
      if (isNaN(agg) || agg < 0.1) throw new Error("Aggressiveness must be ≥ 0.1");

      const payload = {
        ticker: activeForm.ticker,
        side: activeForm.side.toUpperCase(),
        quantity: parseInt(activeForm.quantity),
        start_time: activeForm.startTime,
        end_time: activeForm.endTime,
        data_start: activeForm.startDate,
        data_end: activeForm.endDate,
        interval: activeForm.interval,
        slice_frequency: sliceFreq,
        participation_cap: partCap,
        aggressiveness: agg,
      };

      console.log("Sending payload to /evaluate:", payload);

      const response = await apiFetch("/api/optimization/evaluate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (Array.isArray(errData.detail)) {
            errorMessage = errData.detail
              .map((e: any) => `${e.loc?.join(".") || "field"}: ${e.msg}`)
              .join("; ");
          } else {
            errorMessage = errData.detail || errData.message || errorMessage;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setResult({
        cost: data.cost,
        implementation_shortfall: data.metrics.implementation_shortfall,
        slippage_bps: data.metrics.slippage,
        avg_execution_price: data.metrics.average_execution_price,
        operation_id: data.operation_id,
      });

    } catch (err: any) {
      console.error("Evaluation failed:", err);
      setError(err.message || "Failed to evaluate parameters. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const replayOperation = (location.state as { replayOperation?: ReplayOperation } | null)
      ?.replayOperation;
    if (!replayOperation) return;
    if (replayOperation.operationType.toLowerCase() !== "evaluate") return;
    if (replayRunRef.current === replayOperation.operationId) return;

    replayRunRef.current = replayOperation.operationId;
    const payload = replayOperation.requestPayload ?? {};
    const replayForm = {
      ticker: asString(payload.ticker),
      side: normalizeSide(payload.side, "title"),
      quantity: asString(payload.quantity),
      startDate: asString(payload.data_start),
      endDate: asString(payload.data_end),
      startTime: asString(payload.start_time, "09:30"),
      endTime: asString(payload.end_time, "16:00"),
      interval: asString(payload.interval, "5m"),
      sliceFrequency: asString(payload.slice_frequency, "5"),
      participationCapital: asString(payload.participation_cap, "0.10"),
      aggressiveness: asString(payload.aggressiveness, "1.0"),
      seed: asString(payload.seed, "42"),
    };

    setForm(replayForm);
    runEvaluation(replayForm);
  }, [location.state]);

  return (
    <PageLayout title="EVALUATE PARAMETERS">
      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
          INPUT PARAMETERS
        </h2>
        <p className="text-muted-foreground text-sm font-body mb-6">
          Evaluate specific VWAP parameter sets against historical market data.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="TICKER" value={form.ticker} placeholder="e.g. AAPL, RELIANCE.NS, BTC-USD" onChange={(v) => update("ticker", v)} />
          <SelectField label="SIDE" value={form.side} onChange={(v) => update("side", v)} options={["Buy", "Sell"]} />
          <Field label="QUANTITY" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <SelectField
            label="INTERVAL"
            value={form.interval}
            onChange={(v) => update("interval", v)}
            options={["1m", "5m", "15m", "30m", "1h"]}
          />

          <Field label="START DATE" value={form.startDate} onChange={(v) => update("startDate", v)} type="date" />
          <Field label="END DATE" value={form.endDate} onChange={(v) => update("endDate", v)} type="date" />

          <TimeWheelPicker label="START TIME" value={form.startTime} onChange={(v) => update("startTime", v)}/>
          <TimeWheelPicker label="END TIME" value={form.endTime} onChange={(v) => update("endTime", v)} />
        </div>

<div className="mt-8 pt-6 border-t border-border">
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

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Field
      label="SLICE FREQUENCY"
      value={form.sliceFrequency}
      onChange={(v) => update("sliceFrequency", v)}
      type="number"
    />
    <Field
      label="PARTICIPATION CAPITAL"
      value={form.participationCapital}
      onChange={(v) => update("participationCapital", v)}
      type="number"
      step="0.01"
    />
    <Field
      label="AGGRESSIVENESS"
      value={form.aggressiveness}
      onChange={(v) => update("aggressiveness", v)}
      type="number"
      step="0.1"
    />
  </div>
</div>

        <p className="mt-4 text-xs text-muted-foreground font-mono">
          All times are in <strong>ET (US Eastern Time)</strong> — New York market hours.
        </p>
      </section>

      <button
        onClick={() => runEvaluation()}
        disabled={loading}
        className={`w-full font-mono text-sm tracking-widest py-4 transition-colors border border-border mt-6 rounded-md ${
          loading ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/80 text-primary-foreground"
        }`}
      >
        {loading ? "EVALUATING..." : "EVALUATE"}
      </button>

      {error && (
        <section className="border border-red-500/40 bg-red-950/20 p-6 mt-6 rounded-md text-center">
          <p className="text-red-400 font-mono text-sm tracking-wide font-medium break-words">
            ERROR: {error}
          </p>
        </section>
      )}

      {result ? (
        <>
          <section className="border border-border bg-card p-6 mt-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
              EVALUATION RESULTS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["COST ($)", "IMPL. SHORTFALL ($)", "SLIPPAGE (BPS)", "AVG EXEC PRICE"].map((h) => (
                      <th
                        key={h}
                        className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2 pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono">${result.cost?.toLocaleString() ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono">${result.implementation_shortfall?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono text-signal-green">{result.slippage_bps} bps</td>
                    <td className="py-2 pr-4 font-mono">${result.avg_execution_price}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {result.operation_id && (
            <OperationExplainPanel operationIds={[result.operation_id]} />
          )}
        </>
      ) : (
        !loading && (
          <section className="border border-border bg-muted p-12 text-center mt-6">
            <p className="font-mono text-xs text-muted-foreground tracking-widest">
              AWAITING EVALUATION
            </p>
          </section>
        )
      )}
    </PageLayout>
  );
};

/* Reusable components — copied exactly from Simulation.tsx for consistency */
const Field = ({ label, value, onChange, placeholder,type = "text" }: any) => (
  <div className="flex flex-col">
    <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options }: any) => (
  <div className="flex flex-col">
    <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
    >
      {options.map((o: string) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

export default Evaluate;