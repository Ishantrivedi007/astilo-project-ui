interface BarItem {
  name: string;
  value: number;
}

interface BarListProps {
  data: BarItem[];
  valueFormatter?: (n: number) => string;
}

/** Dependency-free labelled bar list (Tremor BarList replacement). */
const BarList = ({ data, valueFormatter = String }: BarListProps) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((item) => (
        <li key={item.name} className="relative">
          <div className="relative h-8 overflow-hidden rounded-lg bg-ink/5">
            <div
              className="h-full rounded-lg bg-gradient-to-r from-accent/70 to-accent-2/50"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
            <span className="absolute inset-y-0 left-3 flex items-center truncate pr-16 text-sm font-medium text-ink">
              {item.name}
            </span>
          </div>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink/70">
            {valueFormatter(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default BarList;
