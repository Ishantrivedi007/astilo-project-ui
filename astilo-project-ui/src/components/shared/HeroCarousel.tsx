import { useRef } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Chip } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper";
import { EffectFade, Pagination, Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "./HeroCarousel.scss";

import type { MediaItem } from "../../lib/tmdb";

interface HeroCarouselProps {
  items: MediaItem[];
  basePath: string;
  typeLabel: (item: MediaItem) => string;
  onWatchlist: (item: MediaItem) => void;
  autoplayDelay?: number;
  className?: string;
  extraChip?: (item: MediaItem) => ReactNode;
}

/**
 * Full-bleed cross-fade hero banner — one slide visible at a time, arrows
 * appear on hover. Replaces the old coverflow effect whose half-visible side
 * slides bled their own titles/text into the active slide.
 */
const HeroCarousel = ({
  items,
  basePath,
  typeLabel,
  onWatchlist,
  autoplayDelay = 5000,
  className = "",
  extraChip,
}: HeroCarouselProps) => {
  const swiperRef = useRef<SwiperClass | null>(null);
  const navigate = useNavigate();

  if (!items.length) return null;

  return (
    <div className={`hero-carousel ${className}`}>
      <Swiper
        modules={[EffectFade, Pagination, Autoplay, Navigation]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={items.length > 1}
        autoplay={{ delay: autoplayDelay, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation={{ prevEl: ".hero-carousel-prev", nextEl: ".hero-carousel-next" }}
        onSwiper={(s) => (swiperRef.current = s)}
        className="hero-carousel-swiper"
      >
        {items.map((item) => (
          <SwiperSlide key={`${item.kind}-${item.id}`}>
            <div className="hero-carousel-slide">
              <img
                src={item.backdrop || item.poster}
                alt=""
                aria-hidden
                className="hero-carousel-img-fill"
              />
              <img
                src={item.backdrop || item.poster}
                alt={item.title}
                className="hero-carousel-img"
              />
              <div className="hero-carousel-scrim" />
              <div className="hero-carousel-content">
                <div className="hero-carousel-chips">
                  <Chip className="bg-white/15 text-xs font-semibold text-white backdrop-blur">
                    {typeLabel(item)}
                  </Chip>
                  {item.year && (
                    <Chip className="bg-white/15 text-xs font-semibold text-white backdrop-blur">
                      {item.year}
                    </Chip>
                  )}
                  {item.rating > 0 && (
                    <Chip className="bg-amber-400/25 text-xs font-semibold text-white backdrop-blur">
                      ★ {item.rating.toFixed(1)}
                    </Chip>
                  )}
                  {extraChip?.(item)}
                </div>
                <Link
                  to={`${basePath}/${item.kind}/${item.id}`}
                  className="hero-carousel-title"
                >
                  {item.title}
                </Link>
                {item.overview && (
                  <p className="hero-carousel-overview">{item.overview}</p>
                )}
                <div className="hero-carousel-actions">
                  <Button
                    onPress={() => navigate(`${basePath}/${item.kind}/${item.id}`)}
                    radius="full"
                    className="bg-white font-bold text-black transition-transform hover:scale-105"
                  >
                    ▶ Details
                  </Button>
                  <Button
                    radius="full"
                    variant="bordered"
                    onPress={() => onWatchlist(item)}
                    title="Add to watchlist"
                    className="border-white/40 font-semibold text-white"
                  >
                    + Watchlist
                  </Button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <button
        className="hero-carousel-arrow hero-carousel-prev"
        aria-label="Previous"
        type="button"
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>
      <button
        className="hero-carousel-arrow hero-carousel-next"
        aria-label="Next"
        type="button"
      >
        <ChevronRight size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default HeroCarousel;
