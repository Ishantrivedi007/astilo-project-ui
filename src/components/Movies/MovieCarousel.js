import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Image } from "@nextui-org/react";

const MovieCarousel = ({ movies }) => {
  return (
    <Carousel showArrows={true} infiniteLoop={true}>
      {movies.map((movie, index) => (
        <div key={index}>
          <Image
            src={movie.image}
            alt={movie.title}
            height={500}
            width={1000}
          />
          {/* <p className="legend">{movie.title}</p> */}
        </div>
      ))}
    </Carousel>
  );
};

export default MovieCarousel;
