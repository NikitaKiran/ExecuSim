import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import MarketData from "./pages/MarketData.tsx";
import Simulation from "./pages/Simulation.tsx";
import Compare from "./pages/Compare.tsx";
import Optimize from "./pages/Optimize.tsx";
import Evaluate from "./pages/Evaluate.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/market-data" element={<MarketData />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/optimize" element={<Optimize />} />
          <Route path="/evaluate" element={<Evaluate />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
