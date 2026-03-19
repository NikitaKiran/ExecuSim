import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import TimeWheelPicker from "@/components/TimeWheelPicker";
import { apiFetch } from "@/lib/api";
import OperationExplainPanel from "@/components/OperationExplainPanel";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  Cell,
} from "recharts";

const Simulation = () => {
  const [form, setForm] = useState({
    ticker: "",
    side: "Buy",
    quantity: "10000",
    startTime: "09:30",
    endTime: "16:00",
    startDate: "",
    endDate: "",
    interval: "5m",
    strategy: "VWAP",
  });

  const [result, setResult] = useState<any>(null);
  const [hoveredLog, setHoveredLog] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, val: string | null) => {
    setForm((f) => ({ ...f, [key]: val ?? f[key as keyof typeof f] }));
  };

  const runSimulation = async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    if (!form.startDate || !form.endDate || !form.quantity || parseInt(form.quantity) <= 0) {
      setError("Please fill all required fields with valid values.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ticker: form.ticker,
        side: form.side.toUpperCase(),
        quantity: parseInt(form.quantity),
        start_time: form.startTime,
        end_time: form.endTime,
        data_start: form.startDate,
        data_end: form.endDate,
        interval: form.interval,
        strategy: form.strategy.toUpperCase(),
      };

      console.log("Sending payload:", payload);

      const response = await apiFetch("/api/execution/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setResult(data);
    } catch (err: any) {
      console.error("Simulation failed:", err);
      setError(err.message || "Failed to run simulation. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = result?.execution_logs?.map((log: any, i: number) => {
    const utcDate = new Date(log.timestamp);

    const etTime = utcDate.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const istTime = utcDate.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const etDateTime = utcDate.toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    });

    return {
      time: etTime,
      istTime: istTime + " IST",
      etDateTime,
      price: log.execution_price,
      volume: log.market_volume,
      index: i,
      requested_qty: log.requested_qty,
      filled_qty: log.filled_qty,
      execution_price: log.execution_price,
      market_volume: log.market_volume,
      participation_rate: log.participation_rate,
    };
  }) || [];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-card border border-border p-3 font-mono text-xs shadow-xl rounded-md min-w-[260px]">
        <p className="text-muted-foreground mb-2 font-medium">
          {d.etDateTime} <span className="text-[10px] opacity-80">(ET)</span>
          <br />
          <span className="text-[10px] opacity-80">IST: {d.istTime}</span>
        </p>
        <hr className="border-border/50 my-2" />
        <p className="font-medium">Price: ${d.price?.toFixed(4) ?? "N/A"}</p>
        <p>Volume: {d.volume?.toLocaleString() ?? "N/A"}</p>
        {d.participation_rate != null && (
          <p>Participation Rate: {(d.participation_rate * 100).toFixed(4)}%</p>
        )}
        <p className="text-muted-foreground mt-2 text-[10px]">
          Requested Qty: {d.requested_qty?.toLocaleString() ?? "—"}  
          <br />
          Filled Qty: {d.filled_qty?.toLocaleString() ?? "—"}
        </p>
      </div>
    );
  };

  return (
    <PageLayout title="RUN STRATEGY SIMULATION">
      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
          INPUT PARAMETERS
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="TICKER" value={form.ticker} placeholder="e.g. AAPL, RELIANCE.NS, BTC-USD" onChange={(v) => update("ticker", v)} />
          <SelectField label="SIDE" value={form.side} onChange={(v) => update("side", v)} options={["Buy", "Sell"]} />
          <Field label="QUANTITY" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <SelectField
            label="STRATEGY"
            value={form.strategy}
            onChange={(v) => update("strategy", v)}
            options={["TWAP", "VWAP"]}
          />
          <Field label="START DATE" value={form.startDate} onChange={(v) => update("startDate", v)} type="date" />
          <Field label="END DATE" value={form.endDate} onChange={(v) => update("endDate", v)} type="date" />

          <TimeWheelPicker label="START TIME" value={form.startTime} onChange={(v) => update("startTime", v)} />
          <TimeWheelPicker label="END TIME" value={form.endTime} onChange={(v) => update("endTime", v)}/>

          {/* Extended interval dropdown */}
          <SelectField
            label="INTERVAL"
            value={form.interval}
            onChange={(v) => update("interval", v)}
            options={["1m", "5m", "15m", "30m", "1h"]}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground font-mono">
          All times are in <strong>ET (US Eastern Time)</strong> — New York market hours.
        </p>
      </section>

      <button
        onClick={runSimulation}
        disabled={loading}
        className={`w-full font-mono text-sm tracking-widest py-4 transition-colors border border-border mt-4 rounded-md ${
          loading ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/80 text-primary-foreground"
        }`}
      >
        {loading ? "SIMULATING..." : "RUN SIMULATION"}
      </button>

      {error && (
        <section className="border border-red-500/40 bg-red-950/20 p-6 mt-6 rounded-md text-center">
          <p className="text-red-400 font-mono text-sm tracking-wide font-medium break-words">
            ERROR: {error}
          </p>
        </section>
      )}

      {result && !error && (
        <>
          <section className="border border-border bg-card p-6 mt-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
              EXECUTION SUMMARY
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Metric label="ARRIVAL PRICE" value={`$${result.metrics.arrival_price}`} />
              <Metric label="AVG EXEC PRICE" value={`$${result.metrics.average_execution_price}`} />
              <Metric
                label="SLIPPAGE (BPS)"
                value={result.metrics.slippage ?? "N/A"}
                color={result.metrics.slippage > 5 ? "text-signal-red" : "text-signal-green"}
              />
              <Metric label="SHORTFALL" value={`$${result.metrics.implementation_shortfall}`} />
              <Metric label="TOTAL FILLED" value={result.metrics.total_filled_qty} />
            </div>
          </section>

          <section className="border border-border bg-card p-6 mt-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
                EXECUTION CHART
              </h2>
              <span className="text-xs text-muted-foreground/80 font-mono">
                All times shown in ET (US Eastern) • Hover for IST
              </span>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="time"
                  tick={{ fill: "hsl(216,15%,60%)", fontSize: 10, fontFamily: "Roboto Mono" }}
                  stroke="hsl(216,20%,28%)"
                />
                <YAxis
                  yAxisId="price"
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                  tick={{ fill: "hsl(216,15%,60%)", fontSize: 10, fontFamily: "Roboto Mono" }}
                  stroke="hsl(216,20%,28%)"
                />
                <YAxis
                  yAxisId="vol"
                  orientation="right"
                  tickFormatter={(v) => v.toLocaleString()}
                  tick={{ fill: "hsl(216,15%,60%)", fontSize: 10, fontFamily: "Roboto Mono" }}
                  stroke="hsl(216,20%,28%)"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#888", strokeWidth: 1 }} />

                <Line yAxisId="price" type="monotone" dataKey="price" stroke="hsl(216,25%,48%)" strokeWidth={2} dot={false} />
                <Scatter yAxisId="price" dataKey="price" fill="hsl(152,100%,39%)" shape={(props: any) => {
                  const isActive = hoveredLog === props.payload?.index;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={isActive ? 8 : 4}
                      fill={isActive ? "hsl(152,100%,60%)" : "hsl(152,100%,39%)"}
                      stroke={isActive ? "white" : "none"}
                      strokeWidth={isActive ? 2.5 : 0}
                      className={isActive ? "animate-pulse" : ""}
                    />
                  );
                }} />
                <Bar yAxisId="vol" dataKey="volume" opacity={0.3}>
                  {chartData.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill={hoveredLog === i ? "hsl(152,100%,60%)" : "hsl(216,25%,48%)"}
                      opacity={hoveredLog === i ? 0.85 : 0.3}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="border border-border bg-card p-6 mt-0">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
                EXECUTION LOGS
              </h2>
              <span className="text-xs text-muted-foreground/80 font-mono">
                Hover row to highlight execution point on chart
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: "Time (ET)", tooltip: "Time when this slice was executed (US Eastern Time)" },
                      { label: "Requested Qty", tooltip: "How many shares the strategy tried to trade in this 5-min window" },
                      { label: "Filled Qty", tooltip: "How many shares were actually executed" },
                      { label: "Exec Price", tooltip: "Average price per share for the filled quantity" },
                      { label: "Market Volume", tooltip: "Total shares traded by everyone in the market during this time slice" },
                      { label: "Participation Rate"},
                    ].map((col) => (
                      <th
                        key={col.label}
                        className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2.5 pr-6 relative group"
                      >
                        {col.label}
                        <div className="absolute hidden group-hover:block bg-gray-800 text-white text-[10px] rounded p-2 -top-16 left-0 whitespace-pre-wrap z-20 w-64 shadow-lg">
                          {col.tooltip}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result?.execution_logs?.map((log: any, i: number) => {
                    const etTime = new Date(log.timestamp).toLocaleTimeString("en-US", {
                      timeZone: "America/New_York",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });

                    const isHovered = hoveredLog === i;

                    const partRate = log.participation_rate != null ? log.participation_rate * 100 : null;
                    const partRateDisplay = partRate != null ? (
                      partRate < 0.001 ? "<0.001%" :
                      partRate < 0.01  ? partRate.toFixed(4) + "%" :
                      partRate < 0.1   ? partRate.toFixed(3) + "%" :
                                         partRate.toFixed(2) + "%"
                    ) : "—";

                    return (
                      <tr
                        key={i}
                        className={`border-b border-border/40 cursor-pointer transition-all duration-150 ${
                          isHovered ? "bg-primary/20 border-primary/50 shadow-sm" : "hover:bg-muted/50"
                        }`}
                        onMouseEnter={() => setHoveredLog(i)}
                        onMouseLeave={() => setHoveredLog(null)}
                      >
                        <td className="py-2.5 pr-6 font-mono text-xs">{etTime}</td>
                        <td className="py-2.5 pr-6">{log.requested_qty?.toLocaleString() ?? "—"}</td>
                        <td className="py-2.5 pr-6">{log.filled_qty?.toLocaleString() ?? "—"}</td>
                        <td className="py-2.5 pr-6 font-mono">
                          ${log.execution_price?.toFixed(4) ?? "—"}
                        </td>
                        <td className="py-2.5 pr-6">{log.market_volume?.toLocaleString() ?? "—"}</td>
                        <td className="py-2.5 pr-6 font-mono">{log.participation_rate.toFixed(8)}</td>
                      </tr>
                    );
                  }) ?? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No execution logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* <p className="mt-4 text-xs text-muted-foreground/80 font-mono">
              Participation Rate = your filled qty ÷ market volume in that 5-min slice.<br />
              Low values (e.g. 0.036%) are normal for small orders in high-volume stocks like AAPL.
            </p> */}
          </section>

          {result.operation_id && (
            <OperationExplainPanel operationIds={[result.operation_id]} />
          )}
        </>
      )}

      {!result && !loading && !error && (
        <section className="border border-border bg-muted p-12 mt-6 text-center rounded-md">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            AWAITING SIMULATION
          </p>
        </section>
      )}
    </PageLayout>
  );
};

// Reusable components (unchanged)
const Field = ({ label, value, onChange, placeholder, type = "text" }: any) => (
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

const Metric = ({ label, value, color }: any) => (
  <div className="text-center">
    <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">{label}</p>
    <p className={`font-mono text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
  </div>
);

export default Simulation;