import React from "react";
import { Card, Divider } from "@nextui-org/react";

const PlaylistCard = () => {
  const tracks = [
    { name: "La Vie En Rose", artist: "Louis B. Armstrong" },
    { name: "Iris", artist: "Goo Goo Dolls" },
    { name: "Hello", artist: "Adele" },
    { name: "Conversations in the Dark", artist: "John Legend" },
    { name: "It Might Be You", artist: "Stephen Bishop" },
    // Add more tracks as needed
  ];

  return (
    <Card
      className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg shadow-lg mt-3 ml-3"
      style={{ height: "441px" }}
    >
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 underline underline-offset-1">
          Playlist
        </h3>
        {tracks.map((track, index) => (
          <div key={index} className="mb-4">
            <p className="text-base font-medium text-white italic">
              {track.name}
            </p>
            <p className="text-sm text-gray-200">{track.artist}</p>
            {index < tracks.length - 1 && <Divider className="my-2" />}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PlaylistCard;
