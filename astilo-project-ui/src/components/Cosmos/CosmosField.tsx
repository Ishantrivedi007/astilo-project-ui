interface CosmosFieldProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

/** A labeled data point that never fabricates a value — shows "Data unavailable" per Cosmos's provenance rules instead of a blank or a guess. */
const CosmosField = ({ label, value, unit }: CosmosFieldProps) => {
  const hasValue = value !== null && value !== undefined && value !== "";
  // Upstream catalogs (e.g. SIMBAD redshifts) often return long raw floats
  // that overflow the field grid and visually collide with neighboring
  // fields — round for display only, the full value is still saved as-is
  // wherever it's persisted (Kanban/Research/Favorites).
  const display = typeof value === "number" && !Number.isInteger(value) ? Number(value.toPrecision(6)) : value;
  return (
    <div className="cosmos-field">
      <dt>{label}</dt>
      <dd className={hasValue ? "" : "cosmos-unavailable"} title={hasValue ? String(value) : undefined}>
        {hasValue ? `${display}${unit ? ` ${unit}` : ""}` : "Data unavailable"}
      </dd>
    </div>
  );
};

export default CosmosField;
