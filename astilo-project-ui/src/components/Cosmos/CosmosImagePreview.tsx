import { useQuery } from "@tanstack/react-query";

import { searchNasaImages } from "../../lib/cosmosApi";

/** Best-effort visual for object types with no dedicated imagery source
 * (asteroids, exoplanets, stars, galaxies, supernova remnants) — looks up
 * a real NASA Image Library result by name. This is a name-matched search
 * result, not a verified photo of the exact object, so it's always labeled
 * as such rather than presented as a direct observation. */
const CosmosImagePreview = ({ name }: { name: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["cosmos", "image-preview", name],
    queryFn: () => searchNasaImages(name, 1),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const image = data?.data.results[0];

  if (isLoading) {
    return <div className="cosmos-image-preview cosmos-image-preview--loading" aria-hidden />;
  }

  if (!image?.previewUrl) {
    return (
      <div className="cosmos-image-preview cosmos-image-preview--empty">
        <span>No image available</span>
      </div>
    );
  }

  return (
    <div className="cosmos-image-preview">
      <img src={image.previewUrl} alt={image.title} loading="lazy" />
      <span className="cosmos-image-preview-caption">NASA Image Library match — not a verified photo of this exact object</span>
    </div>
  );
};

export default CosmosImagePreview;
