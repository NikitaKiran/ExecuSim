import { useEffect, useMemo, useRef, useState } from "react";
import PageLayout from "@/components/PageLayout";
import OperationExplainPanel from "@/components/OperationExplainPanel";
import { apiFetch } from "@/lib/api";
import { routeForOperationType, type ReplayOperation } from "@/lib/replayOperation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";

type OperationRecord = {
  id: string;
  operation_type: string;
  status: string;
  created_at: string;
  request_payload: Record<string, any>;
  response_payload: Record<string, any>;
};

type SummaryHistoryItem = {
  id: string;
  mode: "summary" | "question";
  question?: string | null;
  answer: string;
  created_at: string;
  operation_ids: string[];
};

const HISTORY_PAGE_SIZE = 3;
const OPERATIONS_PAGE_SIZE = 10;

const prettyType = (raw: string) => raw.replace(/_/g, " ").toUpperCase();

const typeBadgeClass = (raw: string) => {
  const type = raw.toLowerCase();
  if (type === "simulate") return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
  if (type === "compare") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (type === "optimize") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  if (type === "evaluate") return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
  if (type === "market_data") return "bg-violet-500/20 text-violet-300 border-violet-500/40";
  return "bg-slate-500/20 text-slate-300 border-slate-500/40";
};

const statusBadgeClass = (raw: string) => {
  const status = raw.toLowerCase();
  if (status === "completed") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (status === "failed") return "bg-red-500/20 text-red-300 border-red-500/40";
  return "bg-slate-500/20 text-slate-300 border-slate-500/40";
};

const jsonToPrettyText = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const formatCreatedAt = (value: string): string => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(dt);
};

const INSTRUMENT_KEYS = new Set([
  "instrument",
  "instrument_name",
  "ticker",
  "symbol",
  "asset",
  "pair",
  "security",
  "stock",
]);

const findInstrumentValue = (value: unknown, depth = 0): string | null => {
  if (depth > 4 || value == null) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInstrumentValue(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  for (const [key, fieldValue] of Object.entries(record)) {
    if (
      INSTRUMENT_KEYS.has(key.toLowerCase()) &&
      typeof fieldValue === "string" &&
      fieldValue.trim()
    ) {
      return fieldValue.trim();
    }
  }

  for (const nested of Object.values(record)) {
    const found = findInstrumentValue(nested, depth + 1);
    if (found) return found;
  }

  return null;
};

const instrumentNameForOperation = (operation: OperationRecord): string => {
  return (
    findInstrumentValue(operation.request_payload) ??
    findInstrumentValue(operation.response_payload) ??
    "N/A"
  );
};

const RESPONSE_PAYLOAD_PREVIEW_LINES = 18;

const OperationsJournal = () => {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [historyItems, setHistoryItems] = useState<SummaryHistoryItem[]>([]);
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<string[]>([]);
  const [expandedLinkedIds, setExpandedLinkedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [operationsPage, setOperationsPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showFullResponsePayload, setShowFullResponsePayload] = useState(false);
  const detailsSectionRef = useRef<HTMLElement | null>(null);

  const fetchOperations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/operations?limit=300");
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const err = await response.json();
          errorMessage = err.detail || err.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const payload = (await response.json()) as OperationRecord[];
      setOperations(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setError(err.message || "Failed to load operation history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryHistory = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await apiFetch("/api/explainability/operations/history?limit=100");
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const err = await response.json();
          errorMessage = err.detail || err.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const payload = (await response.json()) as SummaryHistoryItem[];
      setHistoryItems(Array.isArray(payload) ? payload : []);
      setHistoryPage(0);
    } catch (err: any) {
      setSummaryError(err.message || "Failed to load summary history.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
    fetchSummaryHistory();
  }, []);

  const operationTypes = useMemo(() => {
    const values = Array.from(new Set(operations.map((op) => op.operation_type))).sort();
    return values;
  }, [operations]);

  const filteredOperations = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return operations
      .filter((op) => {
        if (typeFilter !== "ALL" && op.operation_type !== typeFilter) return false;
        if (statusFilter !== "ALL" && op.status.toUpperCase() !== statusFilter) return false;

        if (!searchLower) return true;

        const idMatch = op.id.toLowerCase().includes(searchLower);
        const typeMatch = op.operation_type.toLowerCase().includes(searchLower);
        const statusMatch = op.status.toLowerCase().includes(searchLower);
        const requestMatch = jsonToPrettyText(op.request_payload).toLowerCase().includes(searchLower);
        const responseMatch = jsonToPrettyText(op.response_payload).toLowerCase().includes(searchLower);

        return idMatch || typeMatch || statusMatch || requestMatch || responseMatch;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [operations, search, typeFilter, statusFilter]);

  const pagedOperations = useMemo(() => {
    const start = operationsPage * OPERATIONS_PAGE_SIZE;
    return filteredOperations.slice(start, start + OPERATIONS_PAGE_SIZE);
  }, [filteredOperations, operationsPage]);

  const hasNextOperationsPage =
    (operationsPage + 1) * OPERATIONS_PAGE_SIZE < filteredOperations.length;

  const allSelected = useMemo(() => {
    return pagedOperations.length > 0 && pagedOperations.every((op) => selectedIds.includes(op.id));
  }, [pagedOperations, selectedIds]);

  const activeOperation = useMemo(() => {
    if (!activeOperationId) return null;
    return operations.find((op) => op.id === activeOperationId) ?? null;
  }, [activeOperationId, operations]);

  useEffect(() => {
    if (!activeOperation || !detailsSectionRef.current) return;
    detailsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeOperation]);

  useEffect(() => {
    setShowFullResponsePayload(false);
  }, [activeOperationId]);

  const pagedHistoryItems = useMemo(() => {
    const start = historyPage * HISTORY_PAGE_SIZE;
    return historyItems.slice(start, start + HISTORY_PAGE_SIZE);
  }, [historyItems, historyPage]);

  const hasNextHistoryPage = (historyPage + 1) * HISTORY_PAGE_SIZE < historyItems.length;

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(historyItems.length / HISTORY_PAGE_SIZE) - 1);
    if (historyPage > maxPage) {
      setHistoryPage(maxPage);
    }
  }, [historyItems.length, historyPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredOperations.length / OPERATIONS_PAGE_SIZE) - 1);
    if (operationsPage > maxPage) {
      setOperationsPage(maxPage);
    }
  }, [filteredOperations.length, operationsPage]);

  const toggleOne = (id: string) => {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((curr) => curr.filter((id) => !pagedOperations.some((op) => op.id === id)));
      return;
    }
    const merged = new Set(selectedIds);
    pagedOperations.forEach((op) => merged.add(op.id));
    setSelectedIds(Array.from(merged));
  };

  const toggleSummaryExpanded = (id: string) => {
    setExpandedSummaryIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]
    );
  };

  const toggleLinkedExpanded = (id: string) => {
    setExpandedLinkedIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]
    );
  };

  const runOperationAgain = (operation: OperationRecord) => {
    const targetRoute = routeForOperationType(operation.operation_type);
    if (!targetRoute) return;

    const replayOperation: ReplayOperation = {
      operationId: operation.id,
      operationType: operation.operation_type,
      requestPayload: operation.request_payload ?? {},
    };

    navigate(targetRoute, { state: { replayOperation } });
  };

  return (
    <PageLayout title="OPERATIONS JOURNAL">
      <section className="border border-border bg-card p-6 rounded-md">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
            PAST OPERATIONS
          </h2>
          <button
            onClick={fetchOperations}
            disabled={loading}
            className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
          >
            {loading ? "REFRESHING..." : "REFRESH"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id, type, status, or payload values"
              className="h-10 w-full bg-muted border border-border text-foreground font-mono text-xs pl-3 pr-9 rounded-md focus:outline-none focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                x
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 bg-muted border border-border text-foreground font-mono text-xs px-3 rounded-md focus:outline-none focus:border-primary"
          >
            <option value="ALL">ALL TYPES</option>
            {operationTypes.map((type) => (
              <option key={type} value={type}>
                {prettyType(type)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-muted border border-border text-foreground font-mono text-xs px-3 rounded-md focus:outline-none focus:border-primary"
          >
            <option value="ALL">ALL STATUS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <p className="font-mono text-[11px] text-muted-foreground mb-3">
          Showing {filteredOperations.length === 0 ? 0 : operationsPage * OPERATIONS_PAGE_SIZE + 1}
          -{Math.min((operationsPage + 1) * OPERATIONS_PAGE_SIZE, filteredOperations.length)} of {filteredOperations.length} operations (from {operations.length} total).
        </p>

        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setOperationsPage((curr) => Math.max(0, curr - 1))}
            disabled={operationsPage === 0 || loading}
            className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
          >
            PREV
          </button>
          <button
            onClick={() => setOperationsPage((curr) => curr + 1)}
            disabled={!hasNextOperationsPage || loading}
            className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
          >
            NEXT
          </button>
        </div>

        {error && (
          <div className="border border-red-500/40 bg-red-950/20 p-4 rounded-md mb-4">
            <p className="text-red-400 font-mono text-xs">ERROR: {error}</p>
          </div>
        )}

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                </th>
                {[
                  "TYPE",
                  "INSTRUMENT",
                  "STATUS",
                  "CREATED",
                  "OPERATION ID",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left font-mono text-xs text-muted-foreground tracking-widest py-2 pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredOperations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-mono text-xs text-muted-foreground">
                    No operations found for the current filters.
                  </td>
                </tr>
              )}

              {pagedOperations.map((op) => (
                <tr key={op.id} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(op.id)}
                      onChange={() => toggleOne(op.id)}
                      className="accent-primary"
                    />
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border ${typeBadgeClass(op.operation_type)}`}>
                      {prettyType(op.operation_type)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs max-w-[180px] truncate" title={instrumentNameForOperation(op)}>
                    {instrumentNameForOperation(op)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border ${statusBadgeClass(op.status)}`}>
                      {op.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {formatCreatedAt(op.created_at)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    <button
                      onClick={() => setActiveOperationId((curr) => (curr === op.id ? null : op.id))}
                      className="underline underline-offset-2 text-primary hover:text-primary/80"
                    >
                      {op.id.slice(0, 8)}... {activeOperationId === op.id ? "(close)" : "(view)"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeOperation && (
        <section ref={detailsSectionRef} className="border border-border bg-card p-6 mt-6 rounded-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground">OPERATION DETAILS</h2>
            <div className="flex items-center gap-2">
              {routeForOperationType(activeOperation.operation_type) && (
                <button
                  onClick={() => runOperationAgain(activeOperation)}
                  className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
                >
                  RUN THIS AGAIN
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedIds((curr) => (curr.includes(activeOperation.id) ? curr : [...curr, activeOperation.id]));
                }}
                className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
              >
                SELECT THIS OPERATION FOR EXPLAIN
              </button>
              <button
                onClick={() => setActiveOperationId(null)}
                className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
              >
                CLOSE DETAILS
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="border border-border/70 rounded-md p-3 bg-muted/40">
              <p className="font-mono text-[11px] text-muted-foreground mb-1">TYPE</p>
              <p className="font-mono text-xs">{prettyType(activeOperation.operation_type)}</p>
            </div>
            <div className="border border-border/70 rounded-md p-3 bg-muted/40">
              <p className="font-mono text-[11px] text-muted-foreground mb-1">STATUS</p>
              <p className="font-mono text-xs">{activeOperation.status.toUpperCase()}</p>
            </div>
            <div className="border border-border/70 rounded-md p-3 bg-muted/40">
              <p className="font-mono text-[11px] text-muted-foreground mb-1">CREATED</p>
              <p className="font-mono text-xs">{formatCreatedAt(activeOperation.created_at)}</p>
            </div>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground mb-2">REQUEST PAYLOAD</p>
          <pre className="bg-muted border border-border rounded-md p-3 text-xs font-mono overflow-x-auto mb-4">
            {jsonToPrettyText(activeOperation.request_payload)}
          </pre>

          <p className="font-mono text-[11px] text-muted-foreground mb-2">RESPONSE PAYLOAD</p>
          {(() => {
            const responsePayloadText = jsonToPrettyText(activeOperation.response_payload);
            const responsePayloadLines = responsePayloadText.split("\n");
            const isLongPayload = responsePayloadLines.length > RESPONSE_PAYLOAD_PREVIEW_LINES;
            const visiblePayload =
              isLongPayload && !showFullResponsePayload
                ? `${responsePayloadLines.slice(0, RESPONSE_PAYLOAD_PREVIEW_LINES).join("\n")}\n...`
                : responsePayloadText;

            return (
              <>
                <pre className="bg-muted border border-border rounded-md p-3 text-xs font-mono overflow-x-auto">
                  {visiblePayload}
                </pre>
                {isLongPayload && (
                  <button
                    onClick={() => setShowFullResponsePayload((curr) => !curr)}
                    className="mt-2 font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
                  >
                    {showFullResponsePayload ? "VIEW LESS" : "VIEW MORE"}
                  </button>
                )}
              </>
            );
          })()}
        </section>
      )}

      <OperationExplainPanel
        operationIds={selectedIds}
        title="EXPLAIN SELECTED OPERATIONS"
      />

      <section className="border border-border bg-card p-6 mt-6 rounded-md">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground">
              PREVIOUS SUMMARISATIONS AND QUESTIONS
            </h2>
            {historyItems.length > 0 && (
              <p className="font-mono text-[11px] text-muted-foreground mt-1">
                Showing {historyPage * HISTORY_PAGE_SIZE + 1}
                -{Math.min((historyPage + 1) * HISTORY_PAGE_SIZE, historyItems.length)} of {historyItems.length}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryPage((curr) => Math.max(0, curr - 1))}
              disabled={historyPage === 0 || summaryLoading}
              className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
            >
              PREV
            </button>
            <button
              onClick={() => setHistoryPage((curr) => curr + 1)}
              disabled={!hasNextHistoryPage || summaryLoading}
              className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
            >
              NEXT
            </button>
            <button
              onClick={fetchSummaryHistory}
              disabled={summaryLoading}
              className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted disabled:text-muted-foreground"
            >
              {summaryLoading ? "REFRESHING..." : "REFRESH"}
            </button>
          </div>
        </div>

        {summaryError && (
          <div className="border border-red-500/40 bg-red-950/20 p-4 rounded-md mb-4">
            <p className="text-red-400 font-mono text-xs">ERROR: {summaryError}</p>
          </div>
        )}

        {!summaryLoading && historyItems.length === 0 && !summaryError && (
          <div className="border border-border/70 bg-muted/30 p-4 rounded-md">
            <p className="font-mono text-xs text-muted-foreground">
              No saved explain entries yet. Generate a summary or ask a question and it will appear here.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {pagedHistoryItems.map((item) => {
            const expanded = expandedSummaryIds.includes(item.id);
            const linkedExpanded = expandedLinkedIds.includes(item.id);
            const hasLinkedOperation = item.operation_ids.some((id) => operations.some((op) => op.id === id));

            return (
              <article key={item.id} className="border border-border/70 rounded-md p-4 bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <p className="font-mono text-xs text-muted-foreground tracking-widest">
                        {formatCreatedAt(item.created_at)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {item.operation_ids.length} linked operation{item.operation_ids.length === 1 ? "" : "s"}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-border/60 font-mono text-[10px] text-muted-foreground">
                          {item.mode.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {item.mode === "question" && item.question && (
                      <p className="font-mono text-xs text-muted-foreground mb-2">Q: {item.question}</p>
                    )}

                    <div
                      className={`font-body text-sm leading-relaxed prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 ${expanded ? "" : "max-h-36 overflow-hidden"}`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => toggleSummaryExpanded(item.id)}
                        className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
                      >
                        {expanded ? "SHOW LESS" : "SHOW FULL ENTRY"}
                      </button>
                      {hasLinkedOperation && (
                        <button
                          onClick={() => {
                            const availableIds = item.operation_ids.filter((id) => operations.some((op) => op.id === id));
                            setSelectedIds((curr) => Array.from(new Set([...curr, ...availableIds])));
                          }}
                          className="font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
                        >
                          SELECT LINKED OPS
                        </button>
                      )}
                    </div>
                  </div>

                  <aside className="border border-border/60 rounded-md p-3 bg-card/60 self-start">
                    <button
                      onClick={() => toggleLinkedExpanded(item.id)}
                      className="w-full text-left font-mono text-xs tracking-widest px-3 py-2 border border-border rounded-md hover:bg-muted"
                    >
                      {linkedExpanded ? "HIDE LINKED OPERATIONS" : "SHOW LINKED OPERATIONS"}
                    </button>
                    {linkedExpanded && (
                      <div className="mt-2 space-y-2">
                        {item.operation_ids.map((operationId) => {
                          const linkedOp = operations.find((op) => op.id === operationId);
                          if (!linkedOp) {
                            return (
                              <div
                                key={operationId}
                                className="border border-border/40 rounded-md px-2 py-2 font-mono text-[10px] text-muted-foreground"
                              >
                                {operationId.slice(0, 8)}... (not in current page)
                              </div>
                            );
                          }

                          return (
                            <button
                              key={operationId}
                              onClick={() => setActiveOperationId(operationId)}
                              className="w-full text-left border border-border/50 rounded-md px-2 py-2 hover:bg-muted"
                            >
                              <p className="font-mono text-[10px] text-primary mb-1">{linkedOp.id.slice(0, 8)}...</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {prettyType(linkedOp.operation_type)} • {linkedOp.status.toUpperCase()}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
};

export default OperationsJournal;
