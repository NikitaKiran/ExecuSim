import { useEffect, useMemo, useRef, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { apiFetch } from "@/lib/api";
import OperationExplainPanel from "@/components/OperationExplainPanel";
import { asString, type ReplayOperation } from "@/lib/replayOperation";
import { useLocation } from "react-router-dom";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Brush,
} from "recharts";

const MarketData = () => {
  const location = useLocation();
  const replayRunRef = useRef<string | null>(null);
  const [ticker, setTicker] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [interval, setInterval] = useState("1d");

  const [data, setData] = useState<any[] | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatTime = (value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }) + " IST";
  };

  const fetchData = async (formOverride?: {
    ticker: string;
    startDate: string;
    endDate: string;
    interval: string;
  }) => {
    const activeValues =
      formOverride ??
      ({ ticker, startDate, endDate, interval } as {
        ticker: string;
        startDate: string;
        endDate: string;
        interval: string;
      });

    if (!activeValues.ticker || !activeValues.startDate || !activeValues.endDate || !activeValues.interval) {
      setError("Please fill in all fields: ticker, start date, end date, and interval.");
      return;
    }

    setError(null);
    setData(null);
    setOperationId(null);
    setLoading(true);

    try {
      const response = await apiFetch("/api/data/market", {
        method: "POST",
        body: JSON.stringify({
          ticker: activeValues.ticker,
          start: activeValues.startDate,
          end: activeValues.endDate,
          interval: activeValues.interval,
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

      const result = await response.json();
      setData(result.candles || []);
      setOperationId(result.operation_id ?? null);
    } catch (err: any) {
      console.error("Market data fetch failed:", err);
      setError(err.message || "Failed to fetch market data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const replayOperation = (location.state as { replayOperation?: ReplayOperation } | null)
      ?.replayOperation;
    if (!replayOperation) return;
    if (replayOperation.operationType.toLowerCase() !== "market_data") return;
    if (replayRunRef.current === replayOperation.operationId) return;

    replayRunRef.current = replayOperation.operationId;
    const payload = replayOperation.requestPayload ?? {};

    const replayValues = {
      ticker: asString(payload.ticker),
      startDate: asString(payload.start),
      endDate: asString(payload.end),
      interval: asString(payload.interval, "1d"),
    };

    setTicker(replayValues.ticker);
    setStartDate(replayValues.startDate);
    setEndDate(replayValues.endDate);
    setInterval(replayValues.interval);
    fetchData(replayValues);
  }, [location.state]);

  const { priceMin, priceMax, domainMin, domainMax } = useMemo(() => {
    if (!data || data.length === 0) {
      return { priceMin: 0, priceMax: 0, domainMin: 0, domainMax: 0 };
    }
    const lows = data.map((d: any) => d.low);
    const highs = data.map((d: any) => d.high);
    const priceMinVal = Math.min(...lows);
    const priceMaxVal = Math.max(...highs);

    const range = priceMaxVal - priceMinVal;
    const padding = range * 0.02 || 1;

    return {
      priceMin: priceMinVal,
      priceMax: priceMaxVal,
      domainMin: priceMinVal - padding,
      domainMax: priceMaxVal + padding,
    };
  }, [data]);

  // Format Y-axis ticks nicely (e.g., $150.25)
  const formatPrice = (value: number) => `$${value.toFixed(2)}`;

  return (
    <PageLayout title="MARKET DATA">
      <section className="border border-border bg-card p-6 mb-0">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
          INPUT PARAMETERS
        </h2>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Ticker – changed to text input */}
          <div className="flex flex-col">
            <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
              TICKER
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())} // auto-uppercase
              placeholder="e.g. AAPL, RELIANCE.NS, BTC-USD"
              className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          {/* Start Date */}
          <div className="flex flex-col">
            <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
              START DATE
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col">
            <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
              END DATE
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          {/* Interval */}
          <div className="flex flex-col">
            <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
              INTERVAL
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="1d">Daily</option>
              <option value="5d">Last 5 Days (daily candles)</option>
              <option value="1wk">Last 1 Week (daily candles)</option>
              <option value="1mo">Last 1 Month (daily candles)</option>
            </select>

            {["5d", "1wk", "1mo"].includes(interval) && (
              <p className="text-xs text-yellow-400/80 mt-1 font-mono">
                Showing most recent daily candles
              </p>
            )}
          </div>
        </div>
      </section>

      <button
        onClick={() => fetchData()}
        disabled={loading}
        className={`w-full font-mono text-sm tracking-widest py-4 transition-colors border border-border mt-4 rounded-md ${
          loading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary hover:bg-primary/80 text-primary-foreground"
        }`}
      >
        {loading ? "FETCHING..." : "FETCH MARKET DATA"}
      </button>

      {error && (
        <section className="border border-red-500/40 bg-red-950/20 p-6 mt-6 rounded-md text-center">
          <p className="text-red-400 font-mono text-sm tracking-wide font-medium">
            ERROR: {error}
          </p>
          <p className="text-xs text-red-300/80 mt-3">
            Tip: For intraday intervals (1m, 5m, 15m, etc.), data is usually only available for the last 60 days.
          </p>
        </section>
      )}

      {loading && !error && (
        <section className="border border-border bg-muted p-12 mt-6 text-center rounded-md">
          <p className="font-mono text-xs text-muted-foreground tracking-widest animate-pulse">
            LOADING MARKET DATA...
          </p>
        </section>
      )}

      {!loading && !error && data && data.length > 0 && (
        <>
          <section className="border border-border bg-card p-6 mt-6">
            <div className="flex justify-between items-center mb-2">
  <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
    OHLC CANDLESTICK CHART
  </h2>
  <span className="text-xs text-muted-foreground/80 font-mono">
    Times shown in your local time (IST)
  </span>
</div>
<div className="flex flex-wrap gap-x-6 gap-y-2 mb-3 p-3 bg-muted/40 rounded-md border border-border/50">
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(152,100%,39%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-green-400 font-semibold">Green candle</span> — price rose (closed higher than it opened)
    </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(4,90%,61%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-red-400 font-semibold">Red candle</span> — price fell (closed lower than it opened)
    </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="flex flex-col items-center justify-center w-3 gap-0">
      <div className="w-px h-1.5 bg-muted-foreground/70" />
      <div className="w-3 h-2 rounded-sm bg-muted-foreground/50" />
      <div className="w-px h-1.5 bg-muted-foreground/70" />
    </div>
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-foreground font-semibold">Thin wick lines</span> — the highest and lowest price reached during that period
    </span>
  </div>
</div>

            <div style={{ overflowX: "auto" }}>
              <div style={{ width: Math.max(data.length * 14, 800) }}>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart
                    data={data}
                    syncId="market"
                    margin={{ top: 10, right: 40, bottom: 0, left: 10 }} // more right margin for $ labels
                  >
                    <XAxis
                      dataKey="datetime"
                      tickFormatter={formatTime}
                      minTickGap={30}
                      tick={{
                        fill: "hsl(216,15%,60%)",
                        fontSize: 10,
                        fontFamily: "Roboto Mono",
                      }}
                      stroke="hsl(216,20%,28%)"
                    />

                    <YAxis
                      domain={[domainMin, domainMax]}
                      tickFormatter={formatPrice}
                      tick={{
                        fill: "hsl(216,15%,60%)",
                        fontSize: 11,
                        fontFamily: "Roboto Mono",
                      }}
                      stroke="hsl(216,20%,28%)"
                      width={50} // give more space for $xxx.xx
                      tickCount={8}
                    />

                    <Tooltip content={<CandlestickTooltip />} />

                    <Bar
                      dataKey="close"
                      shape={(props: any) => (
                        <CandleShape
                          {...props}
                          domainMin={domainMin}
                          domainMax={domainMax}
                        />
                      )}
                    />

                    <Brush
                      dataKey="datetime"
                      height={30}
                      travellerWidth={10}
                      stroke="#ffffff"
                      fill="#22a8c3"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/70 mt-2 font-mono text-center">
              Brush selector shows raw UTC timestamps
            </p>
          </section>

          <section
            className="border border-border bg-card p-6"
            style={{ marginTop: -1 }}
          >
          <div className="flex justify-between items-center mb-2">
  <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
    VOLUME
  </h2>
  <span className="text-xs text-muted-foreground/80 font-mono">
    Times shown in your local time (IST)
  </span>
</div>
<div className="flex flex-wrap gap-x-6 gap-y-2 mb-3 p-3 bg-muted/40 rounded-md border border-border/50">
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(152,100%,39%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-green-400 font-semibold">Green bar</span> — more buying activity (price closed higher than open)
    </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: "hsl(4,90%,61%)" }} />
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-red-400 font-semibold">Red bar</span> — more selling activity (price closed lower than open)
    </span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-4 bg-muted-foreground/30 rounded-sm flex items-end justify-center pb-0.5">
      <div className="w-2 h-2 rounded-sm bg-muted-foreground/60" />
    </div>
    <span className="font-mono text-xs text-muted-foreground">
      <span className="text-foreground font-semibold">Bar height</span> — total number of shares / contracts traded in that period
    </span>
  </div>
</div>

            <div style={{ overflowX: "auto" }}>
              <div style={{ width: Math.max(data.length * 14, 800) }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={data}
                    syncId="market"
                    margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
                  >
                    <XAxis
                      dataKey="datetime"
                      tickFormatter={formatTime}
                      minTickGap={30}
                      tick={{
                        fill: "hsl(216,15%,60%)",
                        fontSize: 10,
                        fontFamily: "Roboto Mono",
                      }}
                      stroke="hsl(216,20%,28%)"
                    />

                    <YAxis
                      tickFormatter={(value) => value.toLocaleString()}
                      tick={{
                        fill: "hsl(216,15%,60%)",
                        fontSize: 10,
                        fontFamily: "Roboto Mono",
                      }}
                      stroke="hsl(216,20%,28%)"
                      width={50}
                    />

                    <Tooltip content={<VolumeTooltip />} />

                    <Bar dataKey="volume">
                      {data.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.close >= entry.open
                              ? "hsl(152,100%,39%)"
                              : "hsl(4,90%,61%)"
                          }
                          opacity={0.75}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/70 mt-2 font-mono text-center">
              Brush selector shows raw UTC timestamps
            </p>
          </section>

          {operationId && (
            <OperationExplainPanel operationIds={[operationId]} />
          )}
        </>
      )}

      {!loading && !error && (!data || data.length === 0) && (
        <section className="border border-border bg-muted p-12 mt-6 text-center rounded-md">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            AWAITING DATA
          </p>
        </section>
      )}
    </PageLayout>
  );
};

// ────────────────────────────────────────────────
// The rest remains unchanged
// ────────────────────────────────────────────────

const CandleShape = (props: any) => {
  const {
    x,
    width,
    payload,
    y: closeY,
    height: barHeight,
    domainMin,
  } = props;

  if (!payload || !domainMin || barHeight <= 0) return null;

  const { open, close, high, low } = payload;

  const isUp = close >= open;
  const color = isUp ? "hsl(152,100%,39%)" : "hsl(4,90%,61%)";

  const priceRange = close - domainMin;
  const pixelsPerPrice = barHeight / priceRange;

  const yHigh = closeY + (close - high) * pixelsPerPrice;
  const yLow = closeY + (close - low) * pixelsPerPrice;
  const yOpen = closeY + (close - open) * pixelsPerPrice;
  const yClose = closeY;

  const wickX = x + width / 2;

  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

  return (
    <g>
      <line
        x1={wickX}
        y1={yHigh}
        x2={wickX}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={x + width * 0.18}
        y={bodyTop}
        width={width * 0.64}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
};

const CandlestickTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  const localTime = new Date(d.datetime).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";

  return (
    <div className="bg-card border border-border p-3 font-mono text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">
        {localTime}
      </p>
      <p className="font-medium">
        O: ${d.open.toFixed(2)} &nbsp; H: ${d.high.toFixed(2)} &nbsp; L: $
        {d.low.toFixed(2)} &nbsp; C: ${d.close.toFixed(2)}
      </p>
      {d.candle_vwap && <p>VWAP: ${d.candle_vwap.toFixed(2)}</p>}
    </div>
  );
};

const VolumeTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  const localTime = new Date(d.datetime).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";

  return (
    <div className="bg-card border border-border p-3 font-mono text-xs shadow-xl">
      <p className="text-muted-foreground">
        {localTime}
      </p>
      <p className="font-medium">Volume: {d.volume.toLocaleString()}</p>
    </div>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <div className="flex flex-col">
    <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
    />
  </div>
);

export default MarketData;