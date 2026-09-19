import { Satellite } from "lucide-react";

const CosmosSourceBadge = ({ source }: { source: string }) => (
  <span className="cosmos-source-badge">
    <Satellite size={11} strokeWidth={2.5} />
    {source}
  </span>
);

export default CosmosSourceBadge;
