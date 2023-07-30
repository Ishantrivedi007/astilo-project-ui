import { useState, useEffect } from "react";
import { Card, Container, Grid, Progress, Row, Text } from "@nextui-org/react";
import {
  FaPlay,
  FaPause,
  FaStepBackward,
  FaStepForward,
  FaForward,
  FaBackward,
} from "react-icons/fa";
import "./MusicPlayer.css";

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBackward = () => {
    console.log("Skip backward");
  };

  const handleSkipForward = () => {
    console.log("Skip forward");
  };

  return (
    <>
      <Row>
        <Container alignItems="left" justify="left" display="flex-start">
          <Card shadow width={700} className="playlist-card">
            <Card.Header>
              <Text
                h2
                b
                i
                blockquote
                css={{
                  textGradient: "45deg, $blue600 -20%, $pink600 50%",
                }}
                weight="bold"
              >
                Now Playing
              </Text>
            </Card.Header>
            <Card.Body>
              <Row>
                <Text b i>
                  Wicked Games
                </Text>
              </Row>
              <Row>
                <Text i>by Chris Izaak</Text>
              </Row>
              <Card.Divider></Card.Divider>
              <Row>
                <Text b i>
                  Fade to Black
                </Text>
              </Row>
              <Row>
                <Text i>by Metallica</Text>
              </Row>
              <Card.Divider></Card.Divider>

              <Row>
                <Text b i>
                  La Vie En Rose
                </Text>
              </Row>
              <Row>
                <Text i>{`by Louis Armstrong`}</Text>
              </Row>
              <Card.Divider></Card.Divider>
              <Row>
                <Text b i>
                  The Zephyr Song
                </Text>
              </Row>
              <Row>
                <Text i>{`by Red Hot Chilli Peppers`}</Text>
              </Row>
              <Card.Divider></Card.Divider>
              <Row>
                <Text b i>
                  The Final Cut
                </Text>
              </Row>
              <Row>
                <Text i>{`by Pink Floyd`}</Text>
              </Row>
              <Card.Divider></Card.Divider>
            </Card.Body>

            <Card.Footer>
              <Text color="error" i>
                EVERYDAY I'M SHUFFLIN'...
              </Text>
            </Card.Footer>
          </Card>
        </Container>
        {/* <Container alignItems="center" justify="center" display="flex-start">
          <Card shadow width={700} className="lyrics-card">
            <Card.Header>
              <Text
                h2
                b
                i
                blockquote
                css={{
                  textGradient: "45deg, $blue600 -20%, $pink600 50%",
                }}
                weight="bold"
              >
                Lyrics
              </Text>
            </Card.Header>
            <Card.Body>
              <Row>
                <Text b i>
                  Wicked Games
                </Text>
              </Row>
              <Row>
                <Text i>by Chris Izaak</Text>
              </Row>
              <Card.Divider></Card.Divider>
              <Row>
                <Text b i>
                  Fade to Black
                </Text>
              </Row>
              <Row>
                <Text i>by Metallica</Text>
              </Row>
              <Card.Divider></Card.Divider>

              <Row>
                <Text b i>
                  La Vie En Rose
                </Text>
              </Row>
              <Row>
                <Text i>{`by Louis Armstrong`}</Text>
              </Row>
              <Card.Divider></Card.Divider>
              <Row>
                <Text b i>
                  The Zephyr Song
                </Text>
              </Row>
              <Row>
                <Text i>{`by Red Hot Chilli Peppers`}</Text>
              </Row>
              <Card.Divider></Card.Divider>
              <Row>
                <Text b i>
                  The Final Cut
                </Text>
              </Row>
              <Row>
                <Text i>{`by Pink Floyd`}</Text>
              </Row>
              <Card.Divider></Card.Divider>
            </Card.Body>

            <Card.Footer>
              <Text color="error" i>
                EVERYDAY I'M SHUFFLIN'...
              </Text>
            </Card.Footer>
          </Card>
            </Container>*/}
        <Container alignItems="center" justify="center" display="flex">
          <Card shadow className="card" width={900}>
            <Card.Header>
              <Grid.Container>
                <Row justify="center" align="center">
                  <Text
                    b
                    i
                    justify="center"
                    align="center"
                    size={"$lg"}
                    blockquote
                  >
                    Only Hope
                  </Text>
                </Row>
                <Row justify="center" align="center">
                  <Text i justify="center" align="center" size={"$md"}>
                    Switchfoot
                  </Text>
                </Row>
              </Grid.Container>
            </Card.Header>
            <Card.Body>
              <Card.Image
                src={
                  "https://c.saavncdn.com/648/iTunes-Sessions-English-2010-20200822053332-500x500.jpg"
                }
                objectFit="contain"
                width="100%"
                height={200}
                alt={""}
              />
              <audio id="audio" src="path_to_your_audio_file.mp3"></audio>
              {/* <Progress value={80} color={"warning"} /> */}
            </Card.Body>
            <Card.Footer>
              <Grid.Container justify="center" alignContent="center">
                <Grid.Container xs={1} className="custom-child-icon">
                  <FaStepBackward
                    onClick={handleSkipBackward}
                    size={20}
                    className="separate-icon"
                  />
                </Grid.Container>
                <Grid.Container xs={1} className="custom-child-icon">
                  <FaBackward
                    onClick={handleSkipBackward}
                    size={20}
                    //className="separate-icon"
                  />
                </Grid.Container>
                {isPlaying ? (
                  <Grid.Container xs={1} className="custom-icon">
                    <FaPause
                      onClick={handlePlayPause}
                      size={20}
                      className="separate-icon"
                    />
                  </Grid.Container>
                ) : (
                  <Grid.Container xs={1} className="custom-icon ">
                    <FaPlay
                      onClick={handlePlayPause}
                      size={20}
                      className="separate-icon"
                    />
                  </Grid.Container>
                )}
                <Grid.Container xs={1} className="custom-child-icon">
                  <FaForward
                    onClick={handleSkipForward}
                    size={20}
                    className="separate-icon"
                  />
                </Grid.Container>
                <Grid.Container xs={1} className="custom-child-icon">
                  <FaStepForward
                    onClick={handleSkipForward}
                    size={20}
                    className="separate-icon"
                  />
                </Grid.Container>
              </Grid.Container>
            </Card.Footer>
          </Card>
        </Container>
      </Row>
    </>
  );
};

export default MusicPlayer;
