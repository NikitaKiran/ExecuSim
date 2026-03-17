import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LoginButton from "./LoginButton";

const NAV_ITEMS = [
  { label: "MARKET DATA", path: "/market-data" },
  { label: "SIMULATION", path: "/simulation" },
  { label: "COMPARE", path: "/compare" },
  { label: "OPTIMIZE", path: "/optimize" },
  { label: "EVALUATE", path: "/evaluate" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 flex items-center h-14 gap-1">
        
        {/* LEFT SIDE */}
        <button
          onClick={() => navigate("/")}
          className="font-mono text-sm font-bold tracking-tight text-primary mr-6 hover:text-primary/80 transition-colors"
        >
          EXECUSIM
        </button>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "font-mono text-xs tracking-wider px-3 py-2 rounded transition-colors",
              location.pathname === item.path
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {item.label}
          </button>
        ))}

        {/* RIGHT SIDE (FIX HERE) */}
        <div className="ml-auto">
          <LoginButton />
        </div>

      </div>
    </nav>
  );
};

export default Navbar;