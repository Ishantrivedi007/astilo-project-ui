import React, { useState, useEffect, useRef } from "react";
import { Button } from "primereact/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faBackward,
  faForward,
} from "@fortawesome/free-solid-svg-icons";
import "./MusicPlayer.css";
import { Grid } from "@nextui-org/react";

const MusicPlayer = () => {
  const [index, setIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [musicList] = useState([
    {
      name: "Nice piano and ukulele",
      author: "Royalty",
      img: "https://www.bensound.com/bensound-img/buddy.jpg",
      audio: "https://www.bensound.com/bensound-music/bensound-buddy.mp3",
      duration: "2:02",
    },
    {
      name: "Gentle acoustic",
      author: "Acoustic",
      img: "https://www.bensound.com/bensound-img/sunny.jpg",
      audio: "https://www.bensound.com//bensound-music/bensound-sunny.mp3",
      duration: "2:20",
    },
    {
      name: "Slow cinematic",
      author: "Royalty",
      img: "https://www.bensound.com/bensound-img/slowmotion.jpg",
      audio: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
      duration: "3:26",
    },
    {
      name: "Slow cinematic",
      author: "Royalty",
      img: "https://www.bensound.com/bensound-img/slowmotion.jpg",
      audio: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
      duration: "3:26",
    },
    {
      name: "Slow cinematic",
      author: "Royalty",
      img: "https://www.bensound.com/bensound-img/slowmotion.jpg",
      audio: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
      duration: "3:26",
    },
    {
      name: "Slow cinematic",
      author: "Royalty",
      img: "https://www.bensound.com/bensound-img/slowmotion.jpg",
      audio: "https://www.bensound.com/bensound-music/bensound-slowmotion.mp3",
      duration: "3:26",
    },
    // Add other songs here
  ]);
  const [pause, setPause] = useState(false);

  const playerRef = useRef(null);
  const timelineRef = useRef(null);
  const playheadRef = useRef(null);
  const hoverPlayheadRef = useRef(null);

  useEffect(() => {
    const player = playerRef.current;

    if (player) {
      player.addEventListener("timeupdate", timeUpdate, false);
      player.addEventListener("ended", nextSong, false);
    }

    timelineRef.current.addEventListener("click", changeCurrentTime, false);
    timelineRef.current.addEventListener("mousemove", hoverTimeLine, false);
    timelineRef.current.addEventListener("mouseout", resetTimeLine, false);

    return () => {
      if (player) {
        player.removeEventListener("timeupdate", timeUpdate);
        player.removeEventListener("ended", nextSong);
      }
      timelineRef.current.removeEventListener("click", changeCurrentTime);
      timelineRef.current.removeEventListener("mousemove", hoverTimeLine);
      timelineRef.current.removeEventListener("mouseout", resetTimeLine);
    };
  }, []);

  const changeCurrentTime = (e) => {
    const duration = playerRef.current.duration;
    const playheadWidth = timelineRef.current.offsetWidth;
    const offsetWidth = timelineRef.current.offsetLeft;
    const userClickWidth = e.clientX - offsetWidth;
    const userClickWidthInPercent = (userClickWidth * 100) / playheadWidth;

    playheadRef.current.style.width = userClickWidthInPercent + "%";
    playerRef.current.currentTime = (duration * userClickWidthInPercent) / 100;
  };

  const hoverTimeLine = (e) => {
    const duration = playerRef.current.duration;
    const playheadWidth = timelineRef.current.offsetWidth;
    const offsetWidth = timelineRef.current.offsetLeft;
    const userClickWidth = e.clientX - offsetWidth;
    const userClickWidthInPercent = (userClickWidth * 100) / playheadWidth;

    if (userClickWidthInPercent <= 100) {
      hoverPlayheadRef.current.style.width = userClickWidthInPercent + "%";
    }

    const time = (duration * userClickWidthInPercent) / 100;

    if (time >= 0 && time <= duration) {
      hoverPlayheadRef.current.dataset.content = formatTime(time);
    }
  };

  const resetTimeLine = () => {
    hoverPlayheadRef.current.style.width = 0;
  };

  const timeUpdate = () => {
    const duration = playerRef.current.duration;
    const timelineWidth =
      timelineRef.current.offsetWidth - playheadRef.current.offsetWidth;
    const playPercent = 100 * (playerRef.current.currentTime / duration);
    playheadRef.current.style.width = playPercent + "%";
    const currentTime = formatTime(parseInt(playerRef.current.currentTime));
    setCurrentTime(currentTime);
  };

  const formatTime = (currentTime) => {
    const minutes = Math.floor(currentTime / 60);
    let seconds = Math.floor(currentTime % 60);

    seconds = seconds >= 10 ? seconds : "0" + (seconds % 60);

    const formattedTime = minutes + ":" + seconds;

    return formattedTime;
  };

  const updatePlayer = () => {
    const currentSong = musicList[index];
    playerRef.current.src = currentSong.audio;
    playerRef.current.load();
  };

  const nextSong = () => {
    setIndex((index + 1) % musicList.length);
    updatePlayer();
    if (pause) {
      playerRef.current.play();
    }
  };

  const prevSong = () => {
    setIndex((index + musicList.length - 1) % musicList.length);
    updatePlayer();
    if (pause) {
      playerRef.current.play();
    }
  };

  const playOrPause = () => {
    if (!pause) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
    setPause(!pause);
  };

  const clickAudio = (key) => {
    setIndex(key);
    updatePlayer();
    if (pause) {
      playerRef.current.play();
    }
  };

  const playlistCard = (
    <div className="play-list card-second flex flex-col">
      {musicList.map((music, key) => (
        <div
          key={key}
          onClick={() => clickAudio(key)}
          className={`track ${
            index === key && !pause ? "current-audio ml-6 mt-9 mb-1" : ""
          } ${index === key && pause ? "play-now" : ""}`}
        >
          <div className="flex flex-row items-center mb-4">
            {/* Align items in a row and center them vertically */}
            <img
              className="track-img"
              src={music.img}
              alt="Album Artwork"
              height={100}
              width={100}
            />
            <div className="flex flex-col ml-4 mr-5">
              <div className="track-discr">
                <span className="track-name">{music.name}</span>
              </div>
              <div className="track-discr">
                <span className="track-author">{music.author}</span>
              </div>
              <div className="track-discr">
                <span className="track-duration">
                  {index === key ? currentTime : music.duration}
                </span>
              </div>
            </div>
          </div>
          <audio style={{ display: "none" }}>
            <source src={music.audio} type="audio/ogg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex justify-center">
      <Grid.Container>
        <div className="card w-96">
          <div className="current-song">
            <audio ref={playerRef}>
              <source src={musicList[index]?.audio} type="audio/ogg" />
              Your browser does not support the audio element.
            </audio>
            <div className="img-wrap">
              <img src={musicList[index].img} alt="Album Artwork" />
            </div>
            <span className="song-name">{musicList[index].name}</span>
            <span className="song-autor">{musicList[index].author}</span>

            <div className="time">
              <div className="current-time">{currentTime}</div>
              <div className="end-time">{musicList[index].duration}</div>
            </div>

            <div ref={timelineRef} id="timeline">
              <div ref={playheadRef} id="playhead"></div>
              <div
                ref={hoverPlayheadRef}
                className="hover-playhead"
                data-content="0:00"
              ></div>
            </div>

            <div className="controls">
              <Button
                onClick={prevSong}
                className="prev prev-next current-btn"
                icon={<FontAwesomeIcon icon={faBackward} />}
              />
              <Button
                onClick={playOrPause}
                className="play current-btn"
                icon={
                  !pause ? (
                    <FontAwesomeIcon icon={faPlay} />
                  ) : (
                    <FontAwesomeIcon icon={faPause} />
                  )
                }
              />
              <Button
                onClick={nextSong}
                className="next prev-next current-btn"
                icon={<FontAwesomeIcon icon={faForward} />}
              />
            </div>
          </div>
        </div>
      </Grid.Container>
      <Grid.Container justify="flex-end" className="mr-5">
        {playlistCard}
      </Grid.Container>
    </div>
  );
};

export default MusicPlayer;
