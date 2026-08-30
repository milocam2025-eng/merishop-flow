type Metric = {
  label: string;
  value: string | number;
  minWidth?: number;
};

type HeaderMetricsProps = {
  metrics: Metric[];
};

export default function HeaderMetrics({ metrics }: HeaderMetricsProps) {
  return (
    <div className="header-metrics" aria-label="Resumen">
      {metrics.map((metric) => (
        <div
          className="header-metric"
          key={metric.label}
          style={{ minWidth: metric.minWidth ?? 110 }}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
