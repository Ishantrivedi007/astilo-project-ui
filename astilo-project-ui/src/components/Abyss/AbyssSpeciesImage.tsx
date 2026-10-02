import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";

import { fetchSpeciesImage } from "../../lib/abyssApi";

interface Props {
  title: string;
  height?: number;
  rounded?: boolean;
}

/** Fetches and renders a real, license-verified image for any topic via
 * /api/abyss/species-image, with a graceful placeholder when none exists —
 * never a broken image or a silent blank. Credit/license always shown. */
const AbyssSpeciesImage = ({ title, height = 180, rounded = true }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["abyss", "species-image", title],
    queryFn: () => fetchSpeciesImage(title),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const image = data?.data;

  if (isLoading) {
    return (
      <div
        style={{ height, borderRadius: rounded ? "0.9rem" : 0, background: "rgba(94, 234, 212, 0.06)" }}
        className="animate-pulse"
      />
    );
  }

  if (!image) {
    return (
      <div
        style={{
          height,
          borderRadius: rounded ? "0.9rem" : 0,
          background: "rgba(94, 234, 212, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          color: "rgba(228,246,245,0.3)",
        }}
      >
        <ImageOff size={20} />
        <span style={{ fontSize: "0.68rem", fontStyle: "italic" }}>No verified open image available</span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height, borderRadius: rounded ? "0.9rem" : 0, overflow: "hidden" }}>
      <img src={image.url} alt={title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0.3rem 0.5rem",
          fontSize: "0.62rem",
          color: "rgba(255,255,255,0.75)",
          background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
        }}
      >
        {image.artist ? `${image.artist} · ` : ""}
        {image.license}
      </div>
    </div>
  );
};

export default AbyssSpeciesImage;
