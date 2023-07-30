import { Card, Col, Text } from "@nextui-org/react";

export const MovieCard = () => (
  <Card style={{ width: "300px", height: "340px" }}>
    <Card.Header
      css={{
        position: "absolute",
        zIndex: 1,
        top: 5,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Col
        css={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text size={12} weight="bold" transform="uppercase" color="#ffffffAA">
          What to watch
        </Text>
        <Text h4 color="white">
          Stream the Acme event
        </Text>
      </Col>
    </Card.Header>
    <Card.Image
      src="https://nextui.org/images/card-example-3.jpeg"
      objectFit="cover"
      width="100%"
      height={340}
      alt="Card image background"
    />
  </Card>
);

export default MovieCard;
