import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { generateMockMarketData } from "@/lib/mockData";
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  BarChart,
} from "recharts";

const MarketData = () => {
  const [ticker, setTicker] = useState("AAPL");
  const [startDate, setStartDate] = useState("2024-01-15");
  const [endDate, setEndDate] = useState("2024-01-15");
  const [interval, setInterval] = useState("5m");
  const [data, setData] = useState<any[] | null>(null);

  const fetchData = () => {
    const result = generateMockMarketData(ticker, startDate, endDate, interval);
    setData(result);
  };

  return (
    <PageLayout title="MARKET DATA">
      <section className="border border-border bg-card p-6 mb-0">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">INPUT PARAMETERS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="TICKER" value={ticker} onChange={setTicker} />
          <InputField label="START DATE" value={startDate} onChange={setStartDate} type="date" />
          <InputField label="END DATE" value={endDate} onChange={setEndDate} type="date" />
          <SelectField label="INTERVAL" value={interval} onChange={setInterval} options={["1m","5m","15m","1h"]} />
        </div>
      </section>

      <button
        onClick={fetchData}
        className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-sm tracking-widest py-4 transition-colors border border-border"
      >
        FETCH MARKET DATA
      </button>

      {data && (
        <>
          <section className="border border-border bg-card p-6 mt-0">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">OHLC CANDLESTICK CHART</h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="datetime" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <Tooltip content={<CandlestickTooltip />} />
                <Bar dataKey="high" fill="transparent" />
                {data.map((entry, i) => {
                  // We render candles via custom shape
                })}
                <Bar dataKey="close" shape={(props: any) => <CandleShape {...props} data={data} />} />
              </ComposedChart>
            </ResponsiveContainer>
          </section>

          <section className="border border-border bg-card p-6" style={{ marginTop: -1 }}>
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">VOLUME</h2>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={data} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="datetime" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <YAxis tick={{ fill: 'hsl(216,15%,60%)', fontSize: 10, fontFamily: 'Roboto Mono' }} stroke="hsl(216,20%,28%)" />
                <Tooltip content={<VolumeTooltip />} />
                <Bar dataKey="volume">
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.close >= entry.open ? "hsl(152,100%,39%)" : "hsl(4,90%,61%)"} opacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}

      {data === null && (
        <section className="border border-border bg-muted p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING DATA</p>
        </section>
      )}
    </PageLayout>
  );
};

// Custom candle shape
const CandleShape = (props: any) => {
  const { x, y, width, index, data } = props;
  if (!data || !data[index]) return null;
  const d = data[index];
  const yScale = props.yAxis?.scale || ((v: number) => v);
  // Simple bar representation for OHLC
  const isUp = d.close >= d.open;
  const color = isUp ? "hsl(152,100%,39%)" : "hsl(4,90%,61%)";
  const bodyTop = Math.min(yScale(d.open), yScale(d.close));
  const bodyBottom = Math.max(yScale(d.open), yScale(d.close));
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
  const wickX = x + width / 2;

  return (
    <g>
      <line x1={wickX} y1={yScale(d.high)} x2={wickX} y2={yScale(d.low)} stroke={color} strokeWidth={1} />
      <rect x={x + 1} y={bodyTop} width={Math.max(width - 2, 2)} height={bodyHeight} fill={color} />
    </g>
  );
};

const CandlestickTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border p-3 font-mono text-xs">
      <p className="text-muted-foreground">{new Date(d.datetime).toLocaleString()}</p>
      <p>O: {d.open} H: {d.high} L: {d.low} C: {d.close}</p>
      <p>VWAP: {d.candle_vwap}</p>
    </div>
  );
};

const VolumeTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border p-3 font-mono text-xs">
      <p className="text-muted-foreground">{new Date(d.datetime).toLocaleString()}</p>
      <p>Volume: {d.volume.toLocaleString()}</p>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default MarketData;
