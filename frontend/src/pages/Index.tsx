import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { ContainerTextFlip } from "@/components/ui/container-text-flip";

const TerminalGraphic = () => {
  const [phase, setPhase] = useState<"running" | "calculating" | "done">("running");
  const [visibleLines, setVisibleLines] = useState(0);
  const [barHeights, setBarHeights] = useState(Array(20).fill(5));
  const [metrics, setMetrics] = useState({
    arrival: "...", avg: "...", slippage: "...", shortfall: "...", filled: "..."
  });

  const finalBars = [30, 45, 38, 60, 42, 55, 48, 70, 52, 65, 44, 58, 50, 72, 46, 62, 54, 68, 40, 56];

  useEffect(() => {
    let lineCount = 0;
    const lineTimer = setInterval(() => {
      lineCount++;
      setVisibleLines(lineCount);
      if (lineCount >= 3) {
        clearInterval(lineTimer);
        setPhase("calculating");
      }
    }, 500);
    return () => clearInterval(lineTimer);
  }, []);

  useEffect(() => {
    if (phase !== "calculating") return;

    let elapsed = 0;
    const barInterval = setInterval(() => {
      elapsed += 120;
      setBarHeights(Array(20).fill(0).map(() => Math.floor(Math.random() * 80) + 10));

      if (elapsed >= 3000) {
        clearInterval(barInterval);
        setBarHeights(finalBars);
        setTimeout(() => setMetrics(m => ({ ...m, arrival: "$182.34" })), 200);
        setTimeout(() => setMetrics(m => ({ ...m, avg: "$182.41" })), 500);
        setTimeout(() => setMetrics(m => ({ ...m, slippage: "3.8 bps" })), 800);
        setTimeout(() => setMetrics(m => ({ ...m, shortfall: "$127.40" })), 1100);
        setTimeout(() => {
          setMetrics(m => ({ ...m, filled: "10,000 shares" }));
          setPhase("done");
        }, 1400);
      }
    }, 120);

    return () => clearInterval(barInterval);
  }, [phase]);

  return (
    <div className="border border-cyan-500/20 bg-[#0a1929] rounded-xl p-4 shadow-[0_0_40px_rgba(0,200,255,0.06)] font-mono text-xs">
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyan-500/10">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-cyan-400/50 tracking-widest text-[10px]">execusim ~ strategy simulation</span>
      </div>

      <div className="space-y-2 text-[11px] leading-relaxed">
        <div className="text-cyan-400/40">$ execusim run --ticker AAPL --strategy VWAP</div>
        {visibleLines >= 1 && (
          <div className="text-muted-foreground animate-in fade-in duration-300">
            → Fetching market data <span className="text-green-400">✓</span>
          </div>
        )}
        {visibleLines >= 2 && (
          <div className="text-muted-foreground animate-in fade-in duration-300">
            → Building VWAP schedule <span className="text-green-400">✓</span>
          </div>
        )}
        {visibleLines >= 3 && (
          <div className="text-muted-foreground animate-in fade-in duration-300">
            → Running execution engine <span className="text-green-400">✓</span>
          </div>
        )}

        {phase !== "running" && (
          <>
            <div className="mt-4 border-t border-cyan-500/10 pt-3">
              <div className="text-cyan-400/60 tracking-widest text-[10px] mb-2">
                {phase === "calculating" ? (
                  <span className="animate-pulse">SIMULATING EXECUTION...</span>
                ) : (
                  "EXECUTION PROFILE"
                )}
              </div>
              <div className="flex items-end gap-0.5 h-12">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${h}%`,
                      transitionDuration: phase === "calculating" ? "100ms" : "600ms",
                      transitionTimingFunction: phase === "done" ? "cubic-bezier(0.34,1.56,0.64,1)" : "ease",
                      backgroundColor: i % 3 === 0 ? "hsl(152,100%,39%)" : "hsl(205,89%,46%)",
                      opacity: phase === "calculating" ? 0.5 + Math.random() * 0.5 : 0.6 + (i / 20) * 0.4,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 border-t border-cyan-500/10 pt-3 text-cyan-400/60 tracking-widest text-[10px]">RESULTS</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
              <span className="text-muted-foreground">Arrival Price</span>
              <span className={`transition-all duration-300 ${metrics.arrival === "..." ? "text-cyan-400/30 animate-pulse" : "text-foreground"}`}>
                {metrics.arrival}
              </span>
              <span className="text-muted-foreground">Avg Exec Price</span>
              <span className={`transition-all duration-300 ${metrics.avg === "..." ? "text-cyan-400/30 animate-pulse" : "text-foreground"}`}>
                {metrics.avg}
              </span>
              <span className="text-muted-foreground">Slippage</span>
              <span className={`transition-all duration-300 ${metrics.slippage === "..." ? "text-cyan-400/30 animate-pulse" : "text-green-400"}`}>
                {metrics.slippage}
              </span>
              <span className="text-muted-foreground">Impl. Shortfall</span>
              <span className={`transition-all duration-300 ${metrics.shortfall === "..." ? "text-cyan-400/30 animate-pulse" : "text-green-400"}`}>
                {metrics.shortfall}
              </span>
              <span className="text-muted-foreground">Total Filled</span>
              <span className={`transition-all duration-300 ${metrics.filled === "..." ? "text-cyan-400/30 animate-pulse" : "text-foreground"}`}>
                {metrics.filled}
              </span>
            </div>
          </>
        )}

        <div className="flex items-center gap-2 mt-3 text-[10px] text-cyan-400/40">
          {phase !== "done" ? (
            <><span className="animate-pulse">▋</span><span>processing...</span></>
          ) : (
            <><span>▋</span><span>simulation complete in 1.2s</span></>
          )}
        </div>
      </div>
    </div>
  );
};

const FEATURES = [
  {
    title: "Market Data Visualization",
    description: "Fetch and visualize real-time OHLCV data with interactive candlestick charts and volume analysis.",
    path: "/market-data",
    cta: "View Market Data →",
  },
  {
    title: "Strategy Simulation",
    description: "Execute TWAP or VWAP strategies against historical data. Analyze slippage, implementation shortfall, and execution quality in detail.",
    path: "/simulation",
    cta: "Run Simulation →",
  },
  {
    title: "Strategy Comparison",
    description: "Run TWAP and VWAP side by side. Compare execution cost, slippage, and shortfall to find the optimal strategy for your order.",
    path: "/compare",
    cta: "Compare Strategies →",
  },
  {
    title: "VWAP Optimization",
    description: "Use genetic algorithm optimization to find the best VWAP parameters — slice frequency, participation capital, and aggressiveness.",
    path: "/optimize",
    cta: "Optimize VWAP →",
  },
  {
    title: "Parameter Evaluation",
    description: "Debug and stress-test specific parameter sets against cost, slippage, and shortfall metrics before going live.",
    path: "/evaluate",
    cta: "Evaluate Parameters →",
  },
  {
    title: "Operations Journal",
    description: "Browse past runs, filter by operation type, and generate summary or Q&A explanations from one or more stored operations.",
    path: "/operations-journal",
    cta: "Open Operations Journal →",
  },
];

const MARKET_POINTS = [
  { lat: 40.7128, lng: -74.006, label: "New York" },
  { lat: 51.5074, lng: -0.1278, label: "London" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  { lat: 22.3193, lng: 114.1694, label: "Hong Kong" },
  { lat: 31.2304, lng: 121.4737, label: "Shanghai" },
  { lat: 1.3521, lng: 103.8198, label: "Singapore" },
  { lat: -33.8688, lng: 151.2093, label: "Sydney" },
  { lat: 50.1109, lng: 8.6821, label: "Frankfurt" },
  { lat: 48.8566, lng: 2.3522, label: "Paris" },
  { lat: 25.2048, lng: 55.2708, label: "Dubai" },
  { lat: 19.076, lng: 72.8777, label: "Mumbai" },
  { lat: 28.6139, lng: 77.209, label: "New Delhi" },
  { lat: 37.5665, lng: 126.978, label: "Seoul" },
  { lat: 55.7558, lng: 37.6173, label: "Moscow" },
  { lat: -23.5505, lng: -46.6333, label: "Sao Paulo" },
  { lat: 43.6532, lng: -79.3832, label: "Toronto" },
  { lat: 41.3851, lng: 2.1734, label: "Barcelona" },
  { lat: 47.3769, lng: 8.5417, label: "Zurich" },
  { lat: 35.6892, lng: 51.389, label: "Tehran" },
  { lat: -26.2041, lng: 28.0473, label: "Johannesburg" },
];

const GlobeSection = () => {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initGlobe = async () => {
      const GlobeGL = (await import("react-globe.gl")).default;
      if (!containerRef.current) return;

      const { createRoot } = await import("react-dom/client");
      const React = await import("react");

      const root = createRoot(containerRef.current);
      root.render(
        React.createElement(GlobeGL, {
          ref: globeRef,
          width: containerRef.current.offsetWidth || 500,
          height: 420,
          backgroundColor: "rgba(0,0,0,0)",
          globeImageUrl: "//unpkg.com/three-globe/example/img/earth-night.jpg",
          atmosphereColor: "#00bfff",
          atmosphereAltitude: 0.15,
          pointsData: MARKET_POINTS,
          pointLat: "lat",
          pointLng: "lng",
          pointColor: () => "#00e5ff",
          pointAltitude: 0.02,
          pointRadius: 0.4,
          pointsMerge: false,
          labelsData: MARKET_POINTS,
          labelLat: "lat",
          labelLng: "lng",
          labelText: "label",
          labelSize: 1.2,
          labelColor: () => "rgba(0,229,255,0.85)",
          labelDotRadius: 0.3,
          labelAltitude: 0.025,
        })
      );

      const interval = setInterval(() => {
        if (globeRef.current) {
          const controls = globeRef.current.controls();
          if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
          }
        }
      }, 500);

      return () => {
        clearInterval(interval);
        root.unmount();
      };
    };

    const cleanup = initGlobe();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, []);

  return <div ref={containerRef} className="w-full h-[420px]" />;
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary mb-4">ALGORITHMIC EXECUTION SIMULATOR</p>
            <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tight leading-tight mb-6">
              <ContainerTextFlip
                words={["Simulate.", "Analyze.", "Optimize.", "Execute."]}
                interval={2000}
                className="text-4xl md:text-5xl font-mono dark:shadow-[inset_0_-1px_#164e63,inset_0_0_0_1px_hsla(205,89%,46%,.3),_0_4px_8px_#00000052]"
                textClassName="text-cyan-300"
              />
              <br />
              <span className="text-primary">Execute with precision.</span>
            </h1>
            <p className="text-muted-foreground font-body text-lg leading-relaxed max-w-2xl mb-8">
              Execusim helps institutional traders and quant teams simulate large parent orders
              across execution strategies. Understand market impact, minimize slippage, and optimize
              execution quality — all before committing real capital.
            </p>
            <button
              onClick={() => navigate("/simulation")}
              className="bg-primary hover:bg-primary/85 text-primary-foreground font-mono text-sm tracking-widest px-8 py-3 rounded transition-colors"
            >
              START SIMULATION
            </button>
          </div>

          {/* Animated terminal graphic */}
          <div className="hidden md:block">
            <TerminalGraphic />
          </div>
        </div>
      </section>

      <div className="h-px bg-border max-w-5xl mx-auto" />

      {/* Globe Section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="font-mono text-xs tracking-[0.3em] text-primary mb-6">GLOBAL MARKETS, ONE SIMULATOR</p>
        <div className="grid md:grid-cols-2 gap-8 items-center">

          {/* Left: Story */}
          <div>
            <h2 className="font-mono text-2xl font-bold mb-6 leading-snug">
              Markets move in milliseconds.<br />
              <span className="text-primary">Every basis point counts.</span>
            </h2>

            <div className="space-y-6">
              <div className="border-l-2 border-cyan-500/40 pl-4">
                <p className="font-mono text-xs text-primary tracking-widest mb-1">THE PROBLEM</p>
                <p className="text-muted-foreground text-sm font-body leading-relaxed">
                  A fund manager in New York needs to buy 50,000 shares of AAPL.
                  Dumping it all at once? That's market impact — the price moves against you
                  the moment you start. Each basis point of slippage on a $5M order is{" "}
                  <span className="text-foreground font-medium">$500 lost</span>.
                </p>
              </div>

              <div className="border-l-2 border-cyan-500/40 pl-4">
                <p className="font-mono text-xs text-primary tracking-widest mb-1">THE SOLUTION</p>
                <p className="text-muted-foreground text-sm font-body leading-relaxed">
                  Smart execution algorithms — TWAP, VWAP — slice the order across time
                  and volume to blend in with market flow. But which parameters minimize cost
                  for <span className="text-foreground font-medium">this ticker, this day, this market condition</span>?
                  That's what Execusim answers.
                </p>
              </div>

              <div className="border-l-2 border-cyan-500/40 pl-4">
                <p className="font-mono text-xs text-primary tracking-widest mb-1">WHY SIMULATE</p>
                <p className="text-muted-foreground text-sm font-body leading-relaxed">
                  Whether you're in London, Mumbai, or Tokyo — trading the same stock means
                  competing against algorithms running in sub-millisecond loops.
                  Simulate first.{" "}
                  <span className="text-foreground font-medium">Trade confident.</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { value: "20", label: "MARKETS" },
                { value: "2", label: "STRATEGIES" },
                { value: "GA", label: "OPTIMIZER" },
              ].map((stat) => (
                <div key={stat.label} className="border border-cyan-500/20 bg-cyan-500/5 rounded-lg p-3 text-center">
                  <p className="font-mono text-xl font-bold text-cyan-400">{stat.value}</p>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Globe */}
          <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-[#020d18] shadow-[0_0_40px_rgba(0,200,255,0.08)]">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
              <p className="font-mono text-xs text-cyan-400 tracking-widest">MARKETS TRADING NOW</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">20 major financial centers</p>
            </div>
            <GlobeSection />
          </div>
        </div>
      </section>

      <div className="h-px bg-border max-w-5xl mx-auto" />

{/* What is Algorithmic Trading */}
<section className="max-w-5xl mx-auto px-6 py-16 overflow-hidden">
  <h2 className="font-mono text-xs tracking-[0.3em] text-primary mb-12">UNDERSTANDING ALGORITHMIC EXECUTION</h2>
  
  <div className="grid md:grid-cols-2 gap-8">
    {/* Card 1 */}
    <div className="group relative border border-cyan-500/10 bg-[#0a1929] rounded-xl p-8 hover:border-cyan-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,200,255,0.08)] overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: "linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      {/* Glow orb */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
</div>
          <h3 className="font-mono text-lg font-semibold text-foreground">What is Algorithmic Trading?</h3>
        </div>
        <p className="text-muted-foreground font-body leading-relaxed mb-4 text-sm">
          Algorithmic trading uses computer programs to execute orders at speeds and frequencies
          impossible for human traders. For large institutional orders — often tens of thousands
          of shares — execution algorithms break the parent order into smaller child orders
          to minimize market impact.
        </p>
        <p className="text-muted-foreground font-body leading-relaxed text-sm">
          The two most common execution strategies are{" "}
          <span className="text-cyan-300 font-mono font-medium px-1.5 py-0.5 bg-cyan-500/10 rounded text-xs">TWAP</span>
          {" "}(Time-Weighted Average Price) and{" "}
          <span className="text-cyan-300 font-mono font-medium px-1.5 py-0.5 bg-cyan-500/10 rounded text-xs">VWAP</span>
          {" "}(Volume-Weighted Average Price).
          Each has trade-offs in slippage, market impact, and execution cost.
        </p>

        {/* Animated ticker strip */}
        <div className="mt-6 pt-4 border-t border-cyan-500/10 overflow-hidden">
          <div className="flex gap-4 font-mono text-[10px] text-cyan-400/50 animate-[ticker_8s_linear_infinite] whitespace-nowrap">
            {["AAPL +0.4%", "MSFT -0.2%", "GOOGL +1.1%", "TSLA +2.3%", "AMZN -0.5%", "NVDA +3.2%", "AAPL +0.4%", "MSFT -0.2%", "GOOGL +1.1%", "TSLA +2.3%"].map((t, i) => (
              <span key={i} className={t.includes("+") ? "text-green-400/60" : "text-red-400/60"}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Card 2 */}
    <div className="group relative border border-cyan-500/10 bg-[#0a1929] rounded-xl p-8 hover:border-cyan-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,200,255,0.08)] overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: "linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
</div>
          <h3 className="font-mono text-lg font-semibold text-foreground">Why Simulate Before Executing?</h3>
        </div>
        <p className="text-muted-foreground font-body leading-relaxed mb-4 text-sm">
          Every basis point of slippage on a large order translates to real dollars lost.
          Simulation lets you test execution strategies against historical market data,
          measuring implementation shortfall and market impact before you trade.
        </p>
        <p className="text-muted-foreground font-body leading-relaxed text-sm">
          Execusim provides the tools to backtest, compare, and optimize your execution
          parameters — giving you confidence that your strategy will perform under real
          market conditions.
        </p>

        {/* Stat pills */}
        <div className="mt-6 pt-4 border-t border-cyan-500/10 flex flex-wrap gap-2">
          {[
            { label: "Avg slippage saved", value: "4.2 bps" },
            { label: "Simulation speed", value: "< 2s" },
            { label: "Strategies", value: "TWAP · VWAP" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-3 py-1.5 group-hover:border-cyan-500/25 transition-colors">
              <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
              <span className="font-mono text-[10px] text-cyan-400 font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-mono text-xs tracking-[0.3em] text-primary mb-8">PLATFORM CAPABILITIES</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <button
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className="text-left border border-border bg-card hover:border-primary/40 transition-all p-6 rounded group"
            >
              <h3 className="font-mono text-sm font-semibold tracking-wide text-foreground mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm font-body leading-relaxed mb-4">
                {feature.description}
              </p>
              <span className="font-mono text-xs text-primary tracking-wider">
                {feature.cta}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-muted-foreground text-xs font-mono">
            EXECUSIM v1.0 — Algorithmic Execution Simulator
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;