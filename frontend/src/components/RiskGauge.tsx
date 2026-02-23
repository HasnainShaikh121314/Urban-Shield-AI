interface RiskGaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

const getRiskInfo = (value: number) => {
  if (value <= 30) return { category: "Low", colorClass: "text-risk-low", strokeColor: "hsl(142, 71%, 45%)" };
  if (value <= 60) return { category: "Moderate", colorClass: "text-risk-moderate", strokeColor: "hsl(48, 96%, 53%)" };
  if (value <= 85) return { category: "High", colorClass: "text-risk-high", strokeColor: "hsl(25, 95%, 53%)" };
  return { category: "Severe", colorClass: "text-risk-severe", strokeColor: "hsl(0, 72%, 51%)" };
};

const RiskGauge = ({ value, size = 180, label = "Flood Risk" }: RiskGaugeProps) => {
  const risk = getRiskInfo(value);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={risk.strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${risk.strokeColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono-data text-3xl font-bold ${risk.colorClass}`}>
            {value}%
          </span>
          <span className={`text-sm font-semibold ${risk.colorClass}`}>
            {risk.category}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
};

export default RiskGauge;
