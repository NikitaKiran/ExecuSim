import { useState, useRef, useEffect, useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ── Scroll-wheel column ──────────────────────────────────
interface WheelColumnProps {
  items: string[];
  selected: string;
  onChange: (value: string) => void;
}

const WheelColumn = ({ items, selected, onChange }: WheelColumnProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isUserScroll = useRef(true);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to selected item on mount or when selected changes externally
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && ref.current) {
      isUserScroll.current = false;
      ref.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
      setTimeout(() => { isUserScroll.current = true; }, 200);
    }
  }, [selected, items]);

  const snapToNearest = useCallback(() => {
    if (!ref.current) return;
    const scrollTop = ref.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));

    ref.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });

    if (items[clamped] !== selected) {
      onChange(items[clamped]);
    }
  }, [items, selected, onChange]);

  const handleScroll = () => {
    if (!isUserScroll.current) return;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(snapToNearest, 80);
  };

  // Padding so the first / last item can reach the center
  const padTop = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
  const padBottom = padTop;

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="relative overflow-y-auto no-scrollbar"
      style={{ height: WHEEL_HEIGHT, scrollSnapType: "y mandatory" }}
    >
      <div style={{ height: padTop }} />
      {items.map((item) => {
        const isActive = item === selected;
        return (
          <div
            key={item}
            onClick={() => {
              onChange(item);
              const idx = items.indexOf(item);
              ref.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
            }}
            className={`flex items-center justify-center cursor-pointer transition-all select-none font-mono text-sm ${
              isActive
                ? "text-foreground font-semibold scale-110"
                : "text-muted-foreground/50 scale-90"
            }`}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
          >
            {item}
          </div>
        );
      })}
      <div style={{ height: padBottom }} />
    </div>
  );
};

interface TimeWheelPickerProps {
  label: string;
  value: string;                
  onChange: (value: string) => void;
  minTime?: string;           
  maxTime?: string;             
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

function to24(h12: string, min: string, period: string): string {
  let h = parseInt(h12, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function from24(time24: string): { h12: string; min: string; period: string } {
  const [hh, mm] = time24.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  const snapped = Math.round(mm / 5) * 5;
  return {
    h12: String(h12).padStart(2, "0"),
    min: String(snapped % 60).padStart(2, "0"),
    period,
  };
}

function formatDisplay(time24: string): string {
  const { h12, min, period } = from24(time24);
  return `${h12}:${min} ${period}`;
}

const TimeWheelPicker = ({
  label,
  value,
  onChange,
  minTime = "00:00",
  maxTime = "23:59",
}: TimeWheelPickerProps) => {
  const [open, setOpen] = useState(false);
  const { h12, min, period } = from24(value || "09:30");

  const [selH, setSelH] = useState(h12);
  const [selM, setSelM] = useState(min);
  const [selP, setSelP] = useState(period);

  useEffect(() => {
    const parts = from24(value || "09:30");
    setSelH(parts.h12);
    setSelM(parts.min);
    setSelP(parts.period);
  }, [value]);

  const commit = useCallback(
    (h: string, m: string, p: string) => {
      let time24 = to24(h, m, p);
      if (time24 < minTime) time24 = minTime;
      if (time24 > maxTime) time24 = maxTime;
      onChange(time24);

      const clamped = from24(time24);
      setSelH(clamped.h12);
      setSelM(clamped.min);
      setSelP(clamped.period);
    },
    [minTime, maxTime, onChange],
  );

  return (
    <div>
      <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full h-[38px] bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 text-left focus:outline-none focus:border-primary flex items-center justify-between"
          >
            <span>{value ? formatDisplay(value) : "Pick time"}</span>
            <span className="text-muted-foreground text-xs">ET</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[230px] p-0 overflow-hidden border border-border bg-card"
          align="start"
          sideOffset={6}
        >
          {/* Selection highlight band */}
          <div className="relative flex" style={{ height: WHEEL_HEIGHT }}>
            {/* Center highlight */}
            <div
              className="pointer-events-none absolute inset-x-0 border-y border-primary/40 bg-primary/5"
              style={{
                top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
                height: ITEM_HEIGHT,
              }}
            />

            {/* Hour */}
            <div className="flex-1">
              <WheelColumn
                items={HOURS_12}
                selected={selH}
                onChange={(v) => {
                  setSelH(v);
                  commit(v, selM, selP);
                }}
              />
            </div>

            {/* Separator */}
            <div
              className="flex items-center justify-center font-mono text-foreground font-bold select-none"
              style={{ width: 16 }}
            >
              :
            </div>

            {/* Minute */}
            <div className="flex-1">
              <WheelColumn
                items={MINUTES}
                selected={selM}
                onChange={(v) => {
                  setSelM(v);
                  commit(selH, v, selP);
                }}
              />
            </div>

            {/* AM / PM */}
            <div className="flex-1">
              <WheelColumn
                items={PERIODS}
                selected={selP}
                onChange={(v) => {
                  setSelP(v);
                  commit(selH, selM, v);
                }}
              />
            </div>
          </div>

          {/* Market hours hint */}
          <div className="border-t border-border px-3 py-2 text-center">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
              MARKET: 9:30 AM – 4:00 PM ET
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimeWheelPicker;
