import React from "react";
import { Card, Button, Spacer, Chip, Divider } from "@nextui-org/react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css"; // Import Swiper styles
import "./Movies.css";
import { EffectCoverflow, Pagination } from "swiper/modules";

const MovieHome = () => {
  return (
    <div className="netflix-homepage">
      <h2 className="section-title">Featured Movies</h2>
      <Spacer y={1} />
      <Swiper
        effect={"coverflow"}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={"auto"}
        coverflowEffect={{
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={true}
        modules={[EffectCoverflow, Pagination]}
        className="mySwiper"
        // effect="coverflow"
        // grabCursor={true}
        // centeredSlides={true}
        // slidesPerView={"auto"}
        // coverflowEffect={{
        //   rotate: 50,
        //   stretch: 0,
        //   depth: 100,
        //   modifier: 1,
        //   slideShadows: true,
        // }}
        // loop={true}
        // navigation
        // modules={[EffectCoverflow, Pagination]}
        // pagination={{ clickable: true }}
        // autoplay={{ delay: 3000 }}
        // className="mySwiper"
      >
        <SwiperSlide>
          <div className="flex flex-row gap-3 bg-gradient-to-br from-blue-200 to-gray-900 border-small border-white/50 shadow-purple-500/30">
            <div className="movie-slide">
              <img
                src="https://image.tmdb.org/t/p/w500/v0eQLbzT6sWelfApuYsEkYpzufl.jpg"
                alt="Movie 1"
              />
            </div>
            <div className="flex flex-col">
              <div className="mt-3">
                <h2 className="text-4xl font-bold">JOKER</h2>
              </div>
              <div className="flex flex-row mt-3 gap-3 items-center">
                <Chip variant="bordered" color="danger">
                  R
                </Chip>
                <Divider orientation="vertical" />
                <Chip size="lg">2019</Chip>
                <Divider orientation="vertical" />
                <Chip
                  className="italic"
                  classNames={{
                    base: "bg-gradient-to-br from-indigo-900 to-pink-700 border-small border-white/50 shadow-pink-500/30",
                    content: "drop-shadow shadow-black text-white",
                  }}
                  size="lg"
                  variant="dot"
                  color="danger"
                >
                  2h 2m
                </Chip>
              </div>
              <div className="flex w-[86%] mt-3">
                <p className="text-white">
                  During the 1980s, a failed stand-up comedian is driven insane
                  and turns to a life of crime and chaos in Gotham City while
                  becoming an infamous psychopathic crime figure.
                </p>
              </div>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide>
          <div className="flex flex-row gap-3 bg-gradient-to-br from-gray-400 to-blue-900 border-small border-white/50 shadow-purple-500/30">
            <div className="movie-slide">
              <img
                src="https://image.tmdb.org/t/p/w500/dWSnsAGTfc8U27bWsy2RfwZs0Bs.jpg"
                alt="Movie 2"
              />
            </div>
            <div className="flex flex-col">
              <div className="mt-3">
                <h2 className="text-4xl font-bold">Below Zero</h2>
              </div>
              <div className="flex flex-row mt-3 gap-3 items-center">
                <Chip variant="bordered" color="danger">
                  R
                </Chip>
                <Divider orientation="vertical" />
                <Chip size="lg">2019</Chip>
                <Divider orientation="vertical" />
                <Chip
                  className="italic"
                  classNames={{
                    base: "bg-gradient-to-br from-indigo-900 to-pink-700 border-small border-white/50 shadow-pink-500/30",
                    content: "drop-shadow shadow-black text-white",
                  }}
                  size="lg"
                  variant="dot"
                  color="danger"
                >
                  2h 2m
                </Chip>
              </div>
              <div className="flex w-[86%] mt-3">
                <p className="text-white">
                  During the 1980s, a failed stand-up comedian is driven insane
                  and turns to a life of crime and chaos in Gotham City while
                  becoming an infamous psychopathic crime figure.
                </p>
              </div>
            </div>
          </div>
        </SwiperSlide>
        <SwiperSlide>
          <div className="flex flex-row gap-3 bg-gradient-to-br from-pink-400 via-purple-900 to-blue-900 border-small border-white/50 shadow-purple-500/30">
            <div className="movie-slide">
              <img
                src="https://image.tmdb.org/t/p/w500/eShw0LB5CkoEfYtpUcXPD85oz5Q.jpg"
                alt="Movie 3"
              />
            </div>
            <div className="flex flex-col">
              <div className="mt-3">
                <h2 className="text-4xl font-bold">GAME</h2>
              </div>
              <div className="flex flex-row mt-3 gap-3 items-center">
                <Chip variant="bordered" color="danger">
                  R
                </Chip>
                <Divider orientation="vertical" />
                <Chip size="lg">2019</Chip>
                <Divider orientation="vertical" />
                <Chip
                  className="italic"
                  classNames={{
                    base: "bg-gradient-to-br from-indigo-900 to-pink-700 border-small border-white/50 shadow-pink-500/30",
                    content: "drop-shadow shadow-black text-white",
                  }}
                  size="lg"
                  variant="dot"
                  color="danger"
                >
                  2h 2m
                </Chip>
              </div>
              <div className="flex w-[86%] mt-3">
                <p className="text-white">
                  During the 1980s, a failed stand-up comedian is driven insane
                  and turns to a life of crime and chaos in Gotham City while
                  becoming an infamous psychopathic crime figure.
                </p>
              </div>
            </div>
          </div>
        </SwiperSlide>
        {/* Add more slides as needed */}
      </Swiper>

      <section className="section mt-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Action Movies</h2>
          <Button variant="gradient" auto className="explore-button">
            Explore Action Movies
          </Button>
        </div>
        <Spacer y={1} />
        <div className="movies-container">
          <Card bordered className="movie-card" shadow>
            <img
              src="https://image.tmdb.org/t/p/w500/v0eQLbzT6sWelfApuYsEkYpzufl.jpg"
              alt="Action Movie 1"
            />
          </Card>
          <Card bordered className="movie-card" shadow>
            <img
              src="https://image.tmdb.org/t/p/w500/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg"
              alt="Action Movie 2"
            />
          </Card>
          <Card bordered className="movie-card" shadow>
            <img
              src="https://image.tmdb.org/t/p/w500/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg"
              alt="Action Movie 3"
            />
          </Card>
        </div>
        <Spacer y={1} />
      </section>

      <section className="section mt-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Comedy Movies</h2>
          <Button variant="gradient" auto className="explore-button">
            Explore Comedy Movies
          </Button>
        </div>
        <Spacer y={1} />
        <div className="flex flex-row gap-5">
          <Card bordered className="movie-card" shadow>
            <img
              src="https://image.tmdb.org/t/p/w500/5bFK5d3mVTAvBCXi5NPWH0tYjKl.jpg"
              alt="Comedy Movie 1"
            />
          </Card>
          <Card bordered className="movie-card" shadow>
            <img
              src="https://image.tmdb.org/t/p/w500/dWSnsAGTfc8U27bWsy2RfwZs0Bs.jpg"
              alt="Comedy Movie 2"
            />
          </Card>
          <Card bordered className="movie-card" shadow>
            <img
              src="https://image.tmdb.org/t/p/w500/4ZSzEDVdxWVMVO4oZDvoodQOEfr.jpg"
              alt="Comedy Movie 3"
            />
          </Card>
        </div>
        <Spacer y={1} />
      </section>
    </div>
  );
};

export default MovieHome;
