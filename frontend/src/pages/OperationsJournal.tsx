import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import OperationExplainPanel from "@/components/OperationExplainPanel";
import { apiFetch } from "@/lib/api";

type OperationRecord = {
  id: string;
  operation_type: string;
  status: string;
  created_at: string;
  request_payload: Record<string, any>;
  response_payload: Record<string, any>;
};

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

const OperationsJournal = () => {
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        } catch {
          // Keep default message.
        }
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

  useEffect(() => {
    fetchOperations();
  }, []);

  const operationTypes = useMemo(() => {
    const values = Array.from(new Set(operations.map((op) => op.operation_type))).sort();
    return values;
  }, [operations]);

  const filteredOperations = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return operations.filter((op) => {
      if (typeFilter !== "ALL" && op.operation_type !== typeFilter) return false;
      if (statusFilter !== "ALL" && op.status.toUpperCase() !== statusFilter) return false;

      if (!searchLower) return true;

      const idMatch = op.id.toLowerCase().includes(searchLower);
      const typeMatch = op.operation_type.toLowerCase().includes(searchLower);
      const statusMatch = op.status.toLowerCase().includes(searchLower);
      const requestMatch = jsonToPrettyText(op.request_payload).toLowerCase().includes(searchLower);
      const responseMatch = jsonToPrettyText(op.response_payload).toLowerCase().includes(searchLower);

      return idMatch || typeMatch || statusMatch || requestMatch || responseMatch;
    });
  }, [operations, search, typeFilter, statusFilter]);

  const allSelected = useMemo(() => {
    return filteredOperations.length > 0 && filteredOperations.every((op) => selectedIds.includes(op.id));
  }, [filteredOperations, selectedIds]);

  const activeOperation = useMemo(() => {
    if (!activeOperationId) return null;
    return operations.find((op) => op.id === activeOperationId) ?? null;
  }, [activeOperationId, operations]);

  const toggleOne = (id: string) => {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((curr) => curr.filter((id) => !filteredOperations.some((op) => op.id === id)));
      return;
    }
    const merged = new Set(selectedIds);
    filteredOperations.forEach((op) => merged.add(op.id));
    setSelectedIds(Array.from(merged));
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by id, type, status, or payload values"
            className="h-10 bg-muted border border-border text-foreground font-mono text-xs px-3 rounded-md focus:outline-none focus:border-primary"
          />
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
          Showing {filteredOperations.length} of {operations.length} operations.
        </p>

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
                  <td colSpan={5} className="py-10 text-center font-mono text-xs text-muted-foreground">
                    No operations found for the current filters.
                  </td>
                </tr>
              )}

              {filteredOperations.map((op) => (
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
                  <td className="py-2 pr-4 font-mono text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border ${statusBadgeClass(op.status)}`}>
                      {op.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {new Date(op.created_at).toLocaleString()}
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
        <section className="border border-border bg-card p-6 mt-6 rounded-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground">OPERATION DETAILS</h2>
            <div className="flex items-center gap-2">
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
              <p className="font-mono text-xs">{new Date(activeOperation.created_at).toLocaleString()}</p>
            </div>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground mb-2">REQUEST PAYLOAD</p>
          <pre className="bg-muted border border-border rounded-md p-3 text-xs font-mono overflow-x-auto mb-4">
            {jsonToPrettyText(activeOperation.request_payload)}
          </pre>

          <p className="font-mono text-[11px] text-muted-foreground mb-2">RESPONSE PAYLOAD</p>
          <pre className="bg-muted border border-border rounded-md p-3 text-xs font-mono overflow-x-auto">
            {jsonToPrettyText(activeOperation.response_payload)}
          </pre>
        </section>
      )}

      <OperationExplainPanel
        operationIds={selectedIds}
        title="EXPLAIN SELECTED OPERATIONS"
      />
    </PageLayout>
  );
};

export default OperationsJournal;
