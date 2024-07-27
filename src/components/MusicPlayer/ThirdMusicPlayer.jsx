import React from "react";
import { Card, CardBody, Image, Button, Slider } from "@nextui-org/react";
import { HeartIcon } from "../Navbar/HeartIcon";
import { PauseCircleIcon } from "../Navbar/PauseCircleIcon";
import { NextIcon } from "../Navbar/NextIcon";
import { PreviousIcon } from "../Navbar/PreviousIcon";
import { RepeatOneIcon } from "../Navbar/RepeatOneIcon";
import { ShuffleIcon } from "../Navbar/ShuffleIcon";
import SecondMusicPlayer from "./SecondMusicPlayer";
import MusicPlayer from "./MusicPlayer";
import SongLyricsCard from "./SongLyricsCard";

const ThirdMusicPlayer = () => {
  const [liked, setLiked] = React.useState(false);
  const lyrics = `Oh, I'm just a teenage dirtbag, baby
  Listen to Iron Maiden, baby, with me
  Oh, yeah, dirtbag, no, she doesn't know what she's missin'
  Oh, yeah, dirtbag, no, she doesn't know what she's missin'
  Oh, I'm just a teenage dirtbag, baby
  Listen to Iron Maiden, baby, with me
  Oh, yeah, dirtbag, no, she doesn't know what she's missin'
  Oh, yeah, dirtbag, no, she doesn't know what she's missin'`;

  return (
    <div className="flex h-auto justify-center items-center">
      {/* <div className="flex grid-col-6">
        <Card
          isBlurred
          className="border-none bg-background/60 dark:bg-default-100/50 max-w-[610px]"
          shadow="lg"
          style={{ background: "#ff705b" }}
        >
          <CardBody>
            <div className="grid  items-center justify-center">
              <div className="flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0">
                    <h3 className="font-semibold text-foreground/90">
                      Daily Mix
                    </h3>
                    <h1 className="text-large font-medium mt-2">
                      Frontend Radio
                    </h1>
                    <p className="text-small text-foreground/80">12 Tracks</p>
                  </div>
                  <Button
                    isIconOnly
                    className="text-default-900/60 data-[hover]:bg-foreground/10 -translate-y-2 translate-x-2"
                    radius="full"
                    variant="light"
                    onPress={() => setLiked((v) => !v)}
                  >
                    <HeartIcon
                      className={liked ? "[&>path]:stroke-transparent" : ""}
                      fill={liked ? "currentColor" : "none"}
                    />
                  </Button>
                </div>

                <div className="mt-3">
                  <Image
                    alt="Album cover"
                    className="object-cover"
                    height={50} // Adjusted height here
                    shadow="lg"
                    src="music.png"
                    width="100%"
                  />
                </div>

                <div className="flex flex-col mt-3 gap-1">
                  <Slider
                    aria-label="Music progress"
                    classNames={{
                      track: "bg-default-500/30",
                      thumb: "w-2 h-2 after:w-2 after:h-2 after:bg-foreground",
                    }}
                    color="foreground"
                    defaultValue={33}
                    size="sm"
                  />
                  <div className="flex justify-between">
                    <p className="text-small">1:23</p>
                    <p className="text-small text-foreground/50">4:32</p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-center">
                  <Button
                    isIconOnly
                    className="data-[hover]:bg-foreground/10"
                    radius="full"
                    variant="light"
                  >
                    <RepeatOneIcon className="text-foreground/80" />
                  </Button>
                  <Button
                    isIconOnly
                    className="data-[hover]:bg-foreground/10"
                    radius="full"
                    variant="light"
                  >
                    <PreviousIcon />
                  </Button>
                  <Button
                    isIconOnly
                    className="w-auto h-auto data-[hover]:bg-foreground/10"
                    radius="full"
                    variant="light"
                  >
                    <PauseCircleIcon size={54} />
                  </Button>
                  <Button
                    isIconOnly
                    className="data-[hover]:bg-foreground/10"
                    radius="full"
                    variant="light"
                  >
                    <NextIcon />
                  </Button>
                  <Button
                    isIconOnly
                    className="data-[hover]:bg-foreground/10"
                    radius="full"
                    variant="light"
                  >
                    <ShuffleIcon className="text-foreground/80" />
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div> */}
      <div className="flex grid-col-6">
        <MusicPlayer />
      </div>
      {/* <SongLyricsCard lyrics={lyrics} /> */}
    </div>
  );
};
export default ThirdMusicPlayer;
