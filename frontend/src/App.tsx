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
import OperationsJournal from "./pages/OperationsJournal.tsx";

import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <div className="min-h-screen bg-[#07141c] text-white">

          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/market-data" element={<MarketData />} />
            <Route
              path="/simulation"
              element={
                <ProtectedRoute>
                  <Simulation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compare"
              element={
                <ProtectedRoute>
                  <Compare />
                </ProtectedRoute>
              }
            />
            <Route
              path="/optimize"
              element={
                <ProtectedRoute>
                  <Optimize />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluate"
              element={
                <ProtectedRoute>
                  <Evaluate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-journal"
              element={
                <ProtectedRoute>
                  <OperationsJournal />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;