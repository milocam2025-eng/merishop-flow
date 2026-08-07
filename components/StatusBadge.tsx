export default function StatusBadge({ value }: { value: string }) {
  return <span className="badge">{value || "Sin estado"}</span>;
}
