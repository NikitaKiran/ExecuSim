// Mock data generators for Execusim

export function generateMockMarketData(ticker: string, startDate: string, endDate: string, interval: string) {
  const data = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let basePrice = ticker === "AAPL" ? 178 : ticker === "MSFT" ? 415 : ticker === "GOOGL" ? 141 : 150;
  
  const intervalMinutes = interval === "1m" ? 1 : interval === "5m" ? 5 : interval === "15m" ? 15 : interval === "1h" ? 60 : 1440;
  
  const current = new Date(start);
  while (current <= end) {
    const hour = current.getHours();
    if (hour >= 9 && hour < 16) {
      const change = (Math.random() - 0.48) * 2;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * 1.5;
      const low = Math.min(open, close) - Math.random() * 1.5;
      const volume = Math.floor(50000 + Math.random() * 200000);
      const typical_price = (high + low + close) / 3;
      const candle_vwap = typical_price;

      data.push({
        datetime: current.toISOString(),
        open: +open.toFixed(2),
        close: +close.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        volume,
        typical_price: +typical_price.toFixed(2),
        candle_vwap: +candle_vwap.toFixed(2),
      });
      basePrice = close;
    }
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  return data.length > 0 ? data : generateDefaultData(basePrice);
}

function generateDefaultData(basePrice: number) {
  const data = [];
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const change = (Math.random() - 0.48) * 2;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    const volume = Math.floor(50000 + Math.random() * 200000);
    data.push({
      datetime: new Date(now.getTime() - (60 - i) * 5 * 60000).toISOString(),
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      volume,
      typical_price: +((high + low + close) / 3).toFixed(2),
      candle_vwap: +((high + low + close) / 3).toFixed(2),
    });
    basePrice = close;
  }
  return data;
}

export function generateSimulationResult(strategy: string, side: string, quantity: number) {
  const arrivalPrice = 178 + Math.random() * 5;
  const slippageBps = strategy === "vwap" ? 2 + Math.random() * 5 : 3 + Math.random() * 7;
  const avgExecPrice = side === "Buy" 
    ? arrivalPrice * (1 + slippageBps / 10000) 
    : arrivalPrice * (1 - slippageBps / 10000);
  const shortfall = Math.abs(avgExecPrice - arrivalPrice) * quantity;

  const logs = [];
  const slices = 10 + Math.floor(Math.random() * 10);
  const qtyPerSlice = Math.floor(quantity / slices);
  let filledTotal = 0;

  for (let i = 0; i < slices; i++) {
    const filled = Math.min(qtyPerSlice + Math.floor(Math.random() * 20 - 10), quantity - filledTotal);
    filledTotal += filled;
    logs.push({
      timestamp: new Date(Date.now() - (slices - i) * 300000).toISOString(),
      requested_qty: qtyPerSlice,
      filled_qty: filled,
      execution_price: +(arrivalPrice + (Math.random() - 0.5) * 2).toFixed(2),
      market_volume: Math.floor(80000 + Math.random() * 150000),
      participation_rate: +(Math.random() * 0.15).toFixed(4),
    });
  }

  return {
    arrival_price: +arrivalPrice.toFixed(2),
    avg_execution_price: +avgExecPrice.toFixed(4),
    slippage_bps: +slippageBps.toFixed(2),
    implementation_shortfall: +shortfall.toFixed(2),
    total_filled: filledTotal,
    execution_logs: logs,
  };
}

export function generateComparisonResult(side: string, quantity: number) {
  const twap = generateSimulationResult("twap", side, quantity);
  const vwap = generateSimulationResult("vwap", side, quantity);

  const recommended = vwap.slippage_bps < twap.slippage_bps ? "VWAP" : "TWAP";
  const message = `${recommended} produced lower slippage. ${recommended} is recommended for this execution window.`;

  return { twap, vwap, recommendation: message };
}

export function generateOptimizationResult(advanced: boolean) {
  return {
    best_params: {
      slice_frequency: +(5 + Math.random() * 25).toFixed(1),
      participation_capital: +(0.02 + Math.random() * 0.1).toFixed(4),
      aggressiveness: +(0.3 + Math.random() * 0.6).toFixed(3),
    },
    metrics: {
      arrival_price: +(178 + Math.random() * 5).toFixed(2),
      avg_execution_price: +(178 + Math.random() * 5).toFixed(4),
      slippage_bps: +(1 + Math.random() * 4).toFixed(2),
      shortfall: +(50 + Math.random() * 200).toFixed(2),
      total_filled: 9800 + Math.floor(Math.random() * 200),
    },
  };
}

export function generateEvaluationResult() {
  return {
    cost: +(100 + Math.random() * 500).toFixed(2),
    implementation_shortfall: +(50 + Math.random() * 300).toFixed(2),
    slippage_bps: +(1 + Math.random() * 8).toFixed(2),
    avg_execution_price: +(178 + Math.random() * 5).toFixed(4),
  };
}
