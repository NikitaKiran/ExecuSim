import { useState, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
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
  const [ticker, setTicker] = useState("AAPL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [interval, setInterval] = useState("1d");

  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatTime = (value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }) + " IST";
  };

  const fetchData = async () => {
    if (!ticker || !startDate || !endDate || !interval) {
      setError("Please fill in all fields: ticker, start date, end date, and interval.");
      return;
    }

    setError(null);
    setData(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/data/market", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker,
          start: startDate,
          end: endDate,
          interval,
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
    } catch (err: any) {
      console.error("Market data fetch failed:", err);
      setError(err.message || "Failed to fetch market data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          {/* Ticker */}
          <div className="flex flex-col">
            <label className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
              TICKER
            </label>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="h-10 bg-muted border border-border text-foreground font-mono text-sm px-3 rounded-md focus:outline-none focus:border-primary"
            >
              <option value="AAPL">AAPL</option>
            </select>
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
        onClick={fetchData}
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