import Navbar from "@/components/Navbar";
import CandlestickTitle from '@/components/CandlestickTitle';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

const PageLayout = ({ title, children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background relative"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(0,200,255,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8 relative">
          {/* Corner brackets on the title */}
          <div className="absolute -top-2 -left-3 w-4 h-4 border-t border-l border-cyan-500/30" />
          <div className="absolute -top-2 -right-3 w-4 h-4 border-t border-r border-cyan-500/30" />
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <CandlestickTitle />
            <h1 className="text-2xl font-mono font-bold tracking-tight">{title}</h1>
          </div>
          <div className="h-px bg-border mt-4" />
        </header>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;