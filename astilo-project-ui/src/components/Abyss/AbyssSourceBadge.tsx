import { Waves } from "lucide-react";

const AbyssSourceBadge = ({ source }: { source: string }) => (
  <span className="abyss-source-badge">
    <Waves size={11} strokeWidth={2.5} />
    {source}
  </span>
);

export default AbyssSourceBadge;
