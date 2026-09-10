import { useMemo, type ReactNode } from "react";
import CountUp from "react-countup";
import Sparkline from "./Sparkline";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  spark?: number[];
  icon?: ReactNode;
}

/** Parse "$148,320" / "1.8%" into { prefix, number, suffix } for CountUp. */
const parseValue = (raw: string) => {
  const match = raw.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  if (!match) return { prefix: "", end: 0, suffix: raw, decimals: 0 };
  const [, prefix, digits, suffix] = match;
  const end = Number(digits.replace(/,/g, ""));
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  return { prefix, end, suffix, decimals };
};

const StatCard = ({ label, value, delta, trend, spark, icon }: StatCardProps) => {
  const parsed = useMemo(() => parseValue(value), [value]);
  const down = trend === "down";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">{label}</p>
        {icon}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="font-display text-2xl font-extrabold text-ink">
          <CountUp
            end={parsed.end}
            prefix={parsed.prefix}
            suffix={parsed.suffix}
            decimals={parsed.decimals}
            separator=","
            duration={1.4}
            enableScrollSpy
            scrollSpyOnce
          />
        </p>
        {delta && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              down
                ? "bg-rose-400/15 text-rose-500 dark:text-rose-300"
                : "bg-emerald-400/15 text-emerald-500 dark:text-emerald-300"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
      {spark && (
        <Sparkline
          data={spark}
          className={`mt-3 h-10 w-full ${
            down ? "text-rose-400" : "text-emerald-400"
          }`}
        />
      )}
    </div>
  );
};

export default StatCard;
