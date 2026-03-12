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
  const [startDate, setStartDate] = useState("2024-01-15");
  const [endDate, setEndDate] = useState("2024-01-15");
  const [interval, setInterval] = useState("5m");
  const [data, setData] = useState<any[] | null>(null);

  const formatTime = (value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchData = async () => {
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

      const result = await response.json();
      setData(result.candles);
    } catch (err) {
      console.error("Market data fetch failed:", err);
    }
  };

  // Pre-compute price extremes for perfect scaling & padding (like professional platforms)
  const { priceMin, priceMax, domainMin, domainMax } = useMemo(() => {
    if (!data || data.length === 0) {
      return { priceMin: 0, priceMax: 0, domainMin: 0, domainMax: 0 };
    }
    const lows = data.map((d: any) => d.low);
    const highs = data.map((d: any) => d.high);
    const priceMinVal = Math.min(...lows);
    const priceMaxVal = Math.max(...highs);

    // Add 2% breathing room on both sides (standard in TradingView-style charts)
    const range = priceMaxVal - priceMinVal;
    const padding = range * 0.02 || 1;

    return {
      priceMin: priceMinVal,
      priceMax: priceMaxVal,
      domainMin: priceMinVal - padding,
      domainMax: priceMaxVal + padding,
    };
  }, [data]);

  return (
    <PageLayout title="MARKET DATA">
      <section className="border border-border bg-card p-6 mb-0">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
          INPUT PARAMETERS
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="TICKER" value={ticker} onChange={setTicker} />
          <InputField
            label="START DATE"
            value={startDate}
            onChange={setStartDate}
            type="date"
          />
          <InputField
            label="END DATE"
            value={endDate}
            onChange={setEndDate}
            type="date"
          />
          <SelectField
            label="INTERVAL"
            value={interval}
            onChange={setInterval}
            options={["1m", "5m", "15m", "1h"]}
          />
        </div>
      </section>

      <button
        onClick={fetchData}
        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-sm tracking-widest py-4 transition-colors border border-border"
      >
        FETCH MARKET DATA
      </button>

      {data && data.length > 0 && (
        <>
          {/* Candlestick Chart - FIXED with proper scaling, padding, and real trading system look */}
          <section className="border border-border bg-card p-6 mt-0">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
              OHLC CANDLESTICK CHART
            </h2>

            <div style={{ overflowX: "auto" }}>
              {/* Wider candle spacing for better readability (like TradingView) */}
              <div style={{ width: Math.max(data.length * 14, 800) }}>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart
                    data={data}
                    syncId="market"
                    margin={{ top: 10, right: 30, bottom: 0, left: 10 }}
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
                      tick={{
                        fill: "hsl(216,15%,60%)",
                        fontSize: 10,
                        fontFamily: "Roboto Mono",
                      }}
                      stroke="hsl(216,20%,28%)"
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
          </section>

          {/* Volume Chart - unchanged but synced and polished */}
          <section
            className="border border-border bg-card p-6"
            style={{ marginTop: -1 }}
          >
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
              VOLUME
            </h2>

            <div style={{ overflowX: "auto" }}>
              <div style={{ width: Math.max(data.length * 14, 800) }}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={data}
                    syncId="market"
                    margin={{ top: 0, right: 30, bottom: 0, left: 10 }}
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
                      tick={{
                        fill: "hsl(216,15%,60%)",
                        fontSize: 10,
                        fontFamily: "Roboto Mono",
                      }}
                      stroke="hsl(216,20%,28%)"
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
          </section>
        </>
      )}

      {(!data || data.length === 0) && (
        <section className="border border-border bg-muted p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">
            AWAITING DATA
          </p>
        </section>
      )}
    </PageLayout>
  );
};

/* FIXED CandleShape – now uses Recharts-provided y + height + exact domain scaling
   This is the exact method used in professional-grade Recharts candlestick implementations.
   No more broken yScale, perfect wick/body alignment, works with any number of candles. */
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

  // Exact pixel-per-price calculation using the real domain bottom
  const priceRange = close - domainMin;
  const pixelsPerPrice = barHeight / priceRange;

  // Convert every price to correct SVG y-coordinate (y increases downward)
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
      {/* Wick (thin line from high to low) */}
      <line
        x1={wickX}
        y1={yHigh}
        x2={wickX}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body (thicker rectangle) */}
      <rect
        x={x + width * 0.18}
        y={bodyTop}
        width={width * 0.64}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
        rx={1} // subtle rounding like modern platforms
      />
    </g>
  );
};

const CandlestickTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-card border border-border p-3 font-mono text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">
        {new Date(d.datetime).toLocaleString()}
      </p>
      <p className="font-medium">
        O: {d.open.toFixed(2)} &nbsp; H: {d.high.toFixed(2)} &nbsp; L:{" "}
        {d.low.toFixed(2)} &nbsp; C: {d.close.toFixed(2)}
      </p>
      {d.candle_vwap && <p>VWAP: {d.candle_vwap.toFixed(2)}</p>}
    </div>
  );
};

const VolumeTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-card border border-border p-3 font-mono text-xs shadow-xl">
      <p className="text-muted-foreground">
        {new Date(d.datetime).toLocaleString()}
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
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">
      {label}
    </label>

    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary"
    />
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">
      {label}
    </label>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

export default MarketData;