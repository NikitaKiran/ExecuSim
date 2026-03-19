import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ExplainResponse = {
  explanation_id: string;
  mode: "summary" | "question";
  question?: string | null;
  answer: string;
  operation_ids: string[];
  model: string;
};

type OperationExplainPanelProps = {
  operationIds: string[];
  title?: string;
};

const OperationExplainPanel = ({
  operationIds,
  title = "EXPLAIN THIS RESULT",
}: OperationExplainPanelProps) => {
  const [question, setQuestion] = useState("");
  const [loadingMode, setLoadingMode] = useState<"summary" | "question" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResponse | null>(null);

  const canRun = operationIds.length > 0;
  const trimmedQuestion = question.trim();

  const selectionText = useMemo(() => {
    if (operationIds.length === 0) return "No operations selected";
    if (operationIds.length === 1) return "1 operation selected";
    return `${operationIds.length} operations selected`;
  }, [operationIds]);

  const runExplain = async (mode: "summary" | "question") => {
    setError(null);
    setResult(null);

    if (!canRun) {
      setError("Run an operation first, or select one from Operations Journal.");
      return;
    }

    if (mode === "question" && !trimmedQuestion) {
      setError("Enter a question or use Generate Summary.");
      return;
    }

    setLoadingMode(mode);
    try {
      const response = await apiFetch("/api/explainability/operations", {
        method: "POST",
        body: JSON.stringify({
          operation_ids: operationIds,
          question: mode === "question" ? trimmedQuestion : null,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          errorMessage = errData.detail || errData.message || errorMessage;
        } catch {
          // Keep default message.
        }
        throw new Error(errorMessage);
      }

      const payload = (await response.json()) as ExplainResponse;
      setResult(payload);
    } catch (err: any) {
      setError(err.message || "Failed to generate explanation.");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <section className="border border-border bg-card p-6 mt-6 rounded-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground">{title}</h2>
        <span className="font-mono text-xs text-muted-foreground">{selectionText}</span>
      </div>

      <p className="text-xs text-muted-foreground font-mono mb-3">
        Generate a plain-language summary or ask a focused question using all stored inputs/outputs from the selected operation(s).
      </p>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Example: Why is implementation shortfall high in this run?"
        className="w-full min-h-24 bg-muted border border-border text-foreground font-mono text-sm px-3 py-2 rounded-md focus:outline-none focus:border-primary"
      />

      <div className="flex flex-wrap gap-3 mt-3">
        <button
          onClick={() => runExplain("summary")}
          disabled={loadingMode !== null || !canRun}
          className="font-mono text-xs tracking-widest px-4 py-2 border border-border rounded-md bg-primary text-primary-foreground hover:bg-primary/85 disabled:bg-muted disabled:text-muted-foreground"
        >
          {loadingMode === "summary" ? "GENERATING..." : "GENERATE SUMMARY"}
        </button>
        <button
          onClick={() => runExplain("question")}
          disabled={loadingMode !== null || !canRun}
          className="font-mono text-xs tracking-widest px-4 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
        >
          {loadingMode === "question" ? "ASKING..." : "ASK QUESTION"}
        </button>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-950/20 p-4 mt-4 rounded-md">
          <p className="text-red-400 font-mono text-xs">ERROR: {error}</p>
        </div>
      )}

      {result && !error && (
        <div className="border border-border/70 bg-muted/40 p-4 mt-4 rounded-md">
          <div className="flex flex-wrap justify-between gap-2 mb-2">
            <p className="font-mono text-xs text-muted-foreground tracking-widest">{result.mode.toUpperCase()}</p>
            <p className="font-mono text-[10px] text-muted-foreground">MODEL: {result.model}</p>
          </div>
          {result.question && (
            <p className="font-mono text-xs text-muted-foreground mb-2">Q: {result.question}</p>
          )}
          <div className="font-body text-sm leading-relaxed prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
};

export default OperationExplainPanel;
