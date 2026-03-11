import Navbar from "@/components/Navbar";

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

const PageLayout = ({ title, children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-mono font-bold tracking-tight">{title}</h1>
          <div className="h-px bg-border mt-4" />
        </header>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
