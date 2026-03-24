import { useEffect, useRef } from "react";

const CANDLES = [
  { bull: false, wickTop: 4,  wickBot: 40, bodyY: 14, bodyH: 18 },
  { bull: true,  wickTop: 2,  wickBot: 42, bodyY: 8,  bodyH: 26 },
  { bull: null,  wickTop: 5,  wickBot: 39, bodyY: 20, bodyH: 4  }, // doji
  { bull: false, wickTop: 6,  wickBot: 38, bodyY: 12, bodyH: 20 },
  { bull: true,  wickTop: 4,  wickBot: 40, bodyY: 10, bodyH: 22 },
];

const COLOR = {
  bull: { stroke: "rgba(34,197,94,0.65)",  fill: "rgba(34,197,94,0.5)"  },
  bear: { stroke: "rgba(239,68,68,0.65)",  fill: "rgba(239,68,68,0.5)"  },
  doji: { stroke: "rgba(56,189,248,0.65)", fill: "rgba(56,189,248,0.65)"},
};

export default function CandlestickTitle() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Re-trigger animation on mount by cloning (forces restart)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentNode!;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    parent.replaceChild(clone, svg);
  }, []);

  return (
    <svg
      ref={svgRef}
      width="68"
      height="44"
      viewBox="0 0 68 44"
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      <style>{`
        @keyframes wick-in { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes body-in { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
        .cs-wick { transform-origin: center; animation: wick-in 0.22s ease-out forwards; opacity: 0; }
        .cs-body { transform-box: fill-box; transform-origin: bottom; animation: body-in 0.18s ease-out forwards; opacity: 0; }
        .cs-c1 .cs-wick { animation-delay: 0.05s; }
        .cs-c1 .cs-body { animation-delay: 0.22s; }
        .cs-c2 .cs-wick { animation-delay: 0.38s; }
        .cs-c2 .cs-body { animation-delay: 0.55s; }
        .cs-c3 .cs-wick { animation-delay: 0.70s; }
        .cs-c3 .cs-body { animation-delay: 0.87s; }
        .cs-c4 .cs-wick { animation-delay: 1.00s; }
        .cs-c4 .cs-body { animation-delay: 1.17s; }
        .cs-c5 .cs-wick { animation-delay: 1.30s; }
        .cs-c5 .cs-body { animation-delay: 1.47s; }
      `}</style>

      {CANDLES.map((c, i) => {
        const x = 8 + i * 14;
        const col = c.bull === null ? COLOR.doji : c.bull ? COLOR.bull : COLOR.bear;
        return (
          <g key={i} className={`cs-c${i + 1}`}>
            <line
              className="cs-wick"
              x1={x} y1={c.wickTop} x2={x} y2={c.wickBot}
              stroke={col.stroke} strokeWidth="1"
            />
            <rect
              className="cs-body"
              x={x - 5} y={c.bodyY} width="10" height={c.bodyH}
              fill={col.fill} rx="1"
            />
          </g>
        );
      })}
    </svg>
  );
}