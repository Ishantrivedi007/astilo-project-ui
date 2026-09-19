interface CosmosFieldProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

/** A labeled data point that never fabricates a value — shows "Data unavailable" per Cosmos's provenance rules instead of a blank or a guess. */
const CosmosField = ({ label, value, unit }: CosmosFieldProps) => {
  const hasValue = value !== null && value !== undefined && value !== "";
  return (
    <div className="cosmos-field">
      <dt>{label}</dt>
      <dd className={hasValue ? "" : "cosmos-unavailable"}>
        {hasValue ? `${value}${unit ? ` ${unit}` : ""}` : "Data unavailable"}
      </dd>
    </div>
  );
};

export default CosmosField;
