import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface WeatherCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  delay?: number;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const WeatherCard = ({ icon: Icon, label, value, unit, trend = "stable", trendValue, delay = 0 }: WeatherCardProps) => {
  const TrendIcon = trendIcons[trend];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="card-elevated p-5"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up" ? "text-risk-high" : trend === "down" ? "text-secondary" : "text-muted-foreground"
          }`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-mono-data text-2xl font-bold text-foreground">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherCard;