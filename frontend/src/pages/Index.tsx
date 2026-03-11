import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

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
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <p className="font-mono text-xs tracking-[0.3em] text-primary mb-4">ALGORITHMIC EXECUTION SIMULATOR</p>
        <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tight leading-tight mb-6">
          Simulate. Analyze.<br />
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
      </section>

      <div className="h-px bg-border max-w-5xl mx-auto" />

      {/* What is Algorithmic Trading */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-mono text-xs tracking-[0.3em] text-primary mb-6">UNDERSTANDING ALGORITHMIC EXECUTION</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-mono text-xl font-semibold mb-4">What is Algorithmic Trading?</h3>
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              Algorithmic trading uses computer programs to execute orders at speeds and frequencies 
              impossible for human traders. For large institutional orders — often tens of thousands 
              of shares — execution algorithms break the parent order into smaller child orders 
              to minimize market impact.
            </p>
            <p className="text-muted-foreground font-body leading-relaxed">
              The two most common execution strategies are <span className="text-foreground font-medium">TWAP</span> (Time-Weighted 
              Average Price) and <span className="text-foreground font-medium">VWAP</span> (Volume-Weighted Average Price). 
              Each has trade-offs in slippage, market impact, and execution cost.
            </p>
          </div>
          <div>
            <h3 className="font-mono text-xl font-semibold mb-4">Why Simulate Before Executing?</h3>
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              Every basis point of slippage on a large order translates to real dollars lost. 
              Simulation lets you test execution strategies against historical market data, 
              measuring implementation shortfall and market impact before you trade.
            </p>
            <p className="text-muted-foreground font-body leading-relaxed">
              Execusim provides the tools to backtest, compare, and optimize your execution 
              parameters — giving you confidence that your strategy will perform under real 
              market conditions.
            </p>
          </div>
        </div>
      </section>

      <div className="h-px bg-border max-w-5xl mx-auto" />

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
