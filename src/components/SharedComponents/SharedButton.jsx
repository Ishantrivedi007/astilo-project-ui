import React from "react";
import { Button, Text } from "@nextui-org/react";
import "./GradientButton.css";
import { Typography } from "@mui/material";

const SharedButton = ({
  className,
  onClick, // Updated from onPress to onClick
  title,
  color,
  auto = true,
  shadow = true,
  disabled = false,
  size,
  IconNode,
  IconNodeSize,
  bordered,
  ghost,
  rounded,
  flat = false,
  buttonTextColor,
  iconClassName,
  type,
  css,
}) => {
  const getColor = (color) => {
    switch (color) {
      default:
        return "primary";
      case "secondary":
        return "secondary";
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "error":
        return "error";
      case "gradient":
        return "gradient";
    }
  };

  return (
    <>
      <Button
        auto={auto}
        shadow={shadow}
        onClick={onClick} // Updated from onPress to onClick
        color={getColor(color)}
        size={size}
        disabled={disabled}
        className={className}
        bordered={bordered}
        ghost={ghost}
        rounded={rounded}
        flat={flat}
        type={type}
        css={css}
      >
        <Typography color={buttonTextColor}>{title}</Typography>
        {IconNode && (
          <div className={`p-4 ${iconClassName}`}>
            <IconNode size={IconNodeSize} />{" "}
            {/* Updated prop from iconSize to size */}
          </div>
        )}
      </Button>
    </>
  );
};

export default SharedButton;
