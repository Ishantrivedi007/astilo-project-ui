import React from "react";
import { Grid, Container, Text } from "@nextui-org/react";
import "./PageNotFound.css";

const PageNotFound = () => {
  return (
    <Grid.Container
      css={{ display: "flex", flexDirection: "column" }}
      justify="center"
      alignItems="center"
    >
      <Text size="h1" color="error" css={{ fontSize: "60px" }}>
        404
      </Text>
      <Text size="h4" css={{ fontSize: "40px" }}>
        Page Not Found
      </Text>
    </Grid.Container>
  );
};

export default PageNotFound;
