import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

interface ForecastChartProps {
  data?: Array<{
    day: string;
    risk: number;
    rainfall: number;
  }>;
}

const getRiskColor = (value: number) => {
  if (value <= 30) return "hsl(142, 71%, 45%)";
  if (value <= 60) return "hsl(48, 96%, 53%)";
  if (value <= 85) return "hsl(25, 95%, 53%)";
  return "hsl(0, 72%, 51%)";
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground mt-1">
          <span className="font-medium" style={{ color: entry.color }}>{entry.name}:</span>{" "}
          {entry.value}{entry.name === "Flood Risk" ? "%" : "mm"}
        </p>
      ))}
    </div>
  );
};

const ForecastChart = ({ data = [] }: ForecastChartProps) => {
  // Default mock data if no real data provided
  const chartData = data.length > 0 ? data : [
    { day: "Mon", risk: 22, rainfall: 5 },
    { day: "Tue", risk: 35, rainfall: 12 },
    { day: "Wed", risk: 58, rainfall: 28 },
    { day: "Thu", risk: 72, rainfall: 45 },
    { day: "Fri", risk: 65, rainfall: 32 },
    { day: "Sat", risk: 40, rainfall: 15 },
    { day: "Sun", risk: 28, rainfall: 8 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="card-elevated p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">7-Day Flood Risk Forecast</h3>
          <p className="text-sm text-muted-foreground">Probability trend over the next week</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-secondary" /> Flood Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Rainfall
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(174, 56%, 47%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(174, 56%, 47%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(224, 80%, 24%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(224, 80%, 24%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 88%)" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="risk"
            name="Flood Risk"
            stroke="hsl(174, 56%, 47%)"
            fill="url(#riskGradient)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "hsl(174, 56%, 47%)", stroke: "hsl(0, 0%, 100%)", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="rainfall"
            name="Rainfall"
            stroke="hsl(224, 80%, 24%)"
            fill="url(#rainGradient)"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(224, 80%, 24%)", stroke: "hsl(0, 0%, 100%)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default ForecastChart;