import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { generateEvaluationResult } from "@/lib/mockData";

const Evaluate = () => {
  const [form, setForm] = useState({
    sliceFrequency: "10",
    participationCapital: "0.05",
    aggressiveness: "0.5",
  });
  const [result, setResult] = useState<any>(null);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const run = () => {
    setResult(generateEvaluationResult());
  };

  return (
    <PageLayout title="EVALUATE PARAMETERS">
      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">INPUT PARAMETERS</h2>
        <p className="text-muted-foreground text-sm font-body mb-4">
          Evaluate specific parameter sets to debug GA optimization results.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="SLICE FREQUENCY" value={form.sliceFrequency} onChange={(v) => update("sliceFrequency", v)} type="number" />
          <Field label="PARTICIPATION CAPITAL" value={form.participationCapital} onChange={(v) => update("participationCapital", v)} />
          <Field label="AGGRESSIVENESS" value={form.aggressiveness} onChange={(v) => update("aggressiveness", v)} />
        </div>
      </section>

      <button onClick={run} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-sm tracking-widest py-4 transition-colors border border-border">
        EVALUATE
      </button>

      {result ? (
        <section className="border border-border bg-card p-6">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground mb-4">EVALUATION RESULTS</h2>
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["COST ($)", "IMPL. SHORTFALL ($)", "SLIPPAGE (BPS)", "AVG EXEC PRICE"].map((h) => (
                    <th key={h} className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">${result.cost}</td>
                  <td className="py-2 pr-4 font-mono">${result.implementation_shortfall}</td>
                  <td className="py-2 pr-4 font-mono text-signal-green">{result.slippage_bps}</td>
                  <td className="py-2 pr-4 font-mono">{result.avg_execution_price}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="border border-border bg-muted p-12 text-center">
          <p className="font-mono text-xs text-muted-foreground tracking-widest">AWAITING EVALUATION</p>
        </section>
      )}
    </PageLayout>
  );
};

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <label className="font-mono text-xs text-muted-foreground tracking-widest block mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 focus:outline-none focus:border-primary" />
  </div>
);

export default Evaluate;
