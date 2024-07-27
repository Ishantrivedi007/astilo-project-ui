import React, { useState, useEffect } from "react";
import { Card, CardBody, Button } from "@nextui-org/react";
import axios from "axios";
import "./MusicPlayer.css";

const SongLyricsCard = () => {
  const [lyrics, setLyrics] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLyrics = async () => {
      try {
        const response = await axios.get(
          "https://cors-anywhere.herokuapp.com/https://api.genius.com/search?q=yesterday%20the%20beatles&access_token=1HeutDAlMLwDtlh3cGYGKjpwOav4pvIe4z5CR1yq5YI6efy6uCjcWYdtBbxre9AP"
        );
        if (response.status === 200) {
          console.log("inside if");
          const data = response.data;
          // Assuming the first result is the correct song
          const songUrl = data.response.hits[0].result.url;
          console.log(songUrl);
          const songPage = await axios.get(
            `https://cors-anywhere.herokuapp.com/${songUrl}`
          );
          const songPageText = songPage.data;
          // Extract lyrics from the HTML of the song page
          const lyricsStart = songPageText.indexOf(
            'class="Lyrics__Container-sc-1ynbvzw-1 kUgSbL"'
          );
          const lyricsEnd = songPageText.indexOf("</div>", lyricsStart);
          const lyricsHtml = songPageText.slice(lyricsStart, lyricsEnd);

          // Convert HTML to plain text
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = lyricsHtml;
          const lyricsText = tempDiv.textContent || tempDiv.innerText || "";

          // Remove class name and set the lyrics state with the formatted text
          setLyrics(
            lyricsText
              .replace(/class=".*?"/g, "")
              .replace(/^>/, "")
              .trim()
          );
        } else {
          console.error("Failed to fetch lyrics:", response.status);
        }
      } catch (error) {
        console.error("Error fetching lyrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, []);

  const renderParagraphs = () => {
    // Split lyrics into paragraphs based on [Verse] and [Bridge] sections
    let paragraphs = lyrics.split(/\[(Verse|Bridge)\s*\d*]/);
    // Filter out empty strings and trim each paragraph
    paragraphs = paragraphs.filter((paragraph) => paragraph.trim() !== "");
    // Add <p> tags after each ","
    paragraphs = paragraphs.map((paragraph) => paragraph.split(",").join(", "));
    // Join the paragraphs with <p> tags and include the "]" with Verse and Bridge
    return paragraphs.map((paragraph, index) => {
      // Separate combined words without space
      paragraph = paragraph.replace(/([a-z])([A-Z])/g, "$1 $2");
      // Split paragraph into lines
      const lines = paragraph.split(/\n/);
      // Render each line with words starting with uppercase letters on a new line
      return (
        <p className="lyrics-text text-white" key={index}>
          {lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {line.split(/\s/).map((word, wordIndex) => (
                <React.Fragment key={wordIndex}>
                  {word.match(/^[A-Z]/) && wordIndex !== 0 ? <br /> : null}
                  {word}{" "}
                </React.Fragment>
              ))}
              <br />
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  return (
    <div className="flex h-auto justify-center items-center mt-3 ">
      {/* <div
        className="w-full md:w-96 overflow-y-auto"
        style={{ maxHeight: "400px" }}
      > */}
      <Card
        shadow
        bordered
        className="w-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 card-scroll rounded-xl shadow-xl mr-4"
        style={{ height: "441px" }}
      >
        <CardBody>
          <div className="lyrics-content text-center">
            <h3 className="lyrics-title font-bold italic text-white">
              Song Lyrics
            </h3>

            {isLoading ? (
              <p className="lyrics-text text-white">Loading lyrics...</p>
            ) : (
              renderParagraphs()
            )}
          </div>
          <Button
            radius="full"
            className="mt-4 bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
          >
            Show More
          </Button>
        </CardBody>
      </Card>
      {/* </div> */}
    </div>
  );
};

export default SongLyricsCard;
