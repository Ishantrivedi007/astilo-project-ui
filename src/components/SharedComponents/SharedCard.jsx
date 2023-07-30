import React from "react";
import { Card } from "@nextui-org/react";

const CustomCard = ({ header, body, footer }) => {
  return (
    <Card>
      {header && <Card.Header>{header}</Card.Header>}
      {body && <Card.Body>{body}</Card.Body>}
      {footer && <Card.Footer>{footer}</Card.Footer>}
    </Card>
  );
};

export default CustomCard;
