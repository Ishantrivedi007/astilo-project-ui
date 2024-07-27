import React from "react";
import MusicPlayer from "./MusicPlayer";
import SongLyricsCard from "./SongLyricsCard";
import { Card } from "@nextui-org/react";
import PlaylistCard from "./PlaylistCard";

const MusicPlayerIndex = () => {
  const lyrics = "";
  return (
    <>
      <div className="flex flex-row mt-4">
        <div className="container">
          <PlaylistCard />
        </div>
        <div className="md:container md:mx-auto">
          <MusicPlayer />
        </div>
        <div className="container">
          <SongLyricsCard lyrics={lyrics} />
        </div>
      </div>
    </>
  );
};

export default MusicPlayerIndex;
