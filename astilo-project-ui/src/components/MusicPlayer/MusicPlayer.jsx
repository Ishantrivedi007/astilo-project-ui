import React, { useState } from "react";
import { Card, Slider, Button } from "@nextui-org/react";
import { PauseCircle, SkipForward, SkipBack, Shuffle } from "react-feather";
import "./MusicPlayer.css";

const MusicPlayer = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(300); // Example duration in seconds
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const playPause = () => {
    setIsPlaying(!isPlaying);
    // Implement play/pause functionality
  };

  const changeVolume = (value) => {
    setVolume(value);
    // Implement volume control functionality
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  // Example song information
  const songName = "Copines";
  const artistName = "Aya Nakamura";
  const thumbnailUrl = "/nextuiplayer.jpeg"; // Replace with actual thumbnail URL

  return (
    <div className="flex justify-center">
      <Card
        className="top-3 funky-music-player shadow-2xl "
        shadow
        bordered
        isFooterBlurred
        style={{ width: "90%" }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "10px",
          }}
        >
          <img
            src={thumbnailUrl}
            alt="Thumbnail"
            style={{ width: "100%", height: "auto", borderRadius: "10px" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "0",
              left: "0",
              right: "0",
              padding: "10px",
              background: "rgba(0, 0, 0, 0.5)",
              borderRadius: "0 0 10px 10px",
            }}
          >
            <p className="text-lg text-white font-bold italic">{songName}</p>
            <p className="text-white">{artistName}</p>
          </div>
        </div>
        <div
          className="flex flex-row mx-2 px-2 items-center"
          style={{ marginTop: "10px", textAlign: "center" }}
        >
          <p>{formatTime(currentTime)}</p>
          <Slider
            className="px-4"
            classNames={{
              base: "max-w-md",
              filler:
                "bg-gradient-to-r from-primary-500 via-purple-500 to-pink-400",
              labelWrapper: "mb-2",
              label: "font-medium text-default-700 text-medium",
              value: "font-medium text-default-500 text-small",
              thumb: [
                "transition-size",
                "bg-gradient-to-r from-purple-500 to-pink-400",
                "data-[dragging=true]:shadow-lg data-[dragging=true]:shadow-black/20",
                "data-[dragging=true]:w-7 data-[dragging=true]:h-7 data-[dragging=true]:after:h-6 data-[dragging=true]:after:w-6",
              ],
              step: "data-[in-range=true]:bg-black/30 dark:data-[in-range=true]:bg-white/50",
            }}
            value={currentTime}
            max={totalTime}
            onChange={(value) => setCurrentTime(value)}
            style={{ marginTop: "5px", marginBottom: "5px" }}
          />
          <p>{formatTime(totalTime)}</p>
        </div>
        <div className="flex justify-center mt-4">
          <Button
            variant="flat"
            auto
            color="foreground"
            className="funky-button mt-4"
          >
            <img
              src="/prev.png"
              alt="Previous"
              style={{ width: "40px", height: "40px" }}
            />
          </Button>
          <Button
            auto
            variant="shadow"
            isIconOnly
            color="foreground"
            className="funky-button mx-2 h-[70px] w-[70px]"
            size="lg"
            onClick={playPause}
          >
            {isPlaying ? (
              // <PauseCircle size={24} style={{ color: "white" }} />
              <img
                src="/pause.png"
                alt="Pause"
                style={{ width: "60px", height: "60px" }}
              />
            ) : (
              <img
                src="/play.png"
                alt="Play"
                style={{ width: "60px", height: "60px" }}
              />
            )}
          </Button>
          <Button
            variant="flat"
            auto
            color="foreground"
            className="funky-button mt-4"
          >
            <img
              src="/next.png"
              alt="Next"
              style={{ width: "40px", height: "40px" }}
            />
          </Button>
        </div>
        <div className="flex justify-center">
          <Button
            variant="flat"
            auto
            isIconOnly
            color="foreground"
            className="funky-button pb-3 mr-4"
          >
            <img
              src="/shuffle.png"
              alt="Shuffle"
              style={{ width: "30px", height: "30px" }}
            />
          </Button>
          {/* <Slider
            value={volume}
            onChange={changeVolume}
            classNames={{
              filler: "bg-gradient-to-r from-purple-500 to-pink-500",
            }}
            style={{ width: "100px", marginLeft: "10px" }}
          /> */}
          <Slider
            style={{ width: "150px", marginLeft: "10px" }}
            value={volume}
            onChange={changeVolume}
            classNames={{
              base: "max-w-md",
              filler:
                "bg-gradient-to-r from-primary-500 via-purple-500 to-pink-400",
              labelWrapper: "mb-2",
              label: "font-medium text-default-700 text-medium",
              value: "font-medium text-default-500 text-small",
              thumb: [
                "transition-size",
                "bg-gradient-to-r from-purple-500 to-pink-400",
                "data-[dragging=true]:shadow-lg data-[dragging=true]:shadow-black/20",
                "data-[dragging=true]:w-7 data-[dragging=true]:h-7 data-[dragging=true]:after:h-6 data-[dragging=true]:after:w-6",
              ],
              step: "data-[in-range=true]:bg-black/30 dark:data-[in-range=true]:bg-white/50",
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default MusicPlayer;
