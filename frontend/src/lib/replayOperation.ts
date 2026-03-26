export type ReplayOperation = {
  operationId: string;
  operationType: string;
  requestPayload: Record<string, any>;
};

export const routeForOperationType = (operationType: string): string | null => {
  const normalized = operationType.toLowerCase();
  if (normalized === "simulate") return "/simulation";
  if (normalized === "compare") return "/compare";
  if (normalized === "optimize") return "/optimize";
  if (normalized === "evaluate") return "/evaluate";
  if (normalized === "market_data") return "/market-data";
  return null;
};

export const asString = (value: unknown, fallback = ""): string => {
  if (value == null) return fallback;
  return String(value);
};

export const normalizeSide = (
  value: unknown,
  mode: "title" | "upper" = "upper"
): string => {
  const raw = asString(value).trim().toUpperCase();
  const side = raw === "SELL" ? "SELL" : "BUY";
  return mode === "title" ? `${side[0]}${side.slice(1).toLowerCase()}` : side;
};
