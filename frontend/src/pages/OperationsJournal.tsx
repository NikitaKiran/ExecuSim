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

const OperationsJournal = () => {
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const allSelected = useMemo(() => {
    return operations.length > 0 && selectedIds.length === operations.length;
  }, [operations, selectedIds]);

  const toggleOne = (id: string) => {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(operations.map((op) => op.id));
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
              {!loading && operations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-mono text-xs text-muted-foreground">
                    No operations found yet.
                  </td>
                </tr>
              )}

              {operations.map((op) => (
                <tr key={op.id} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(op.id)}
                      onChange={() => toggleOne(op.id)}
                      className="accent-primary"
                    />
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{prettyType(op.operation_type)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{op.status.toUpperCase()}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {new Date(op.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{op.id.slice(0, 8)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <OperationExplainPanel
        operationIds={selectedIds}
        title="EXPLAIN SELECTED OPERATIONS"
      />
    </PageLayout>
  );
};

export default OperationsJournal;
