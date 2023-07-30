import React from "react";
import { Button, Text } from "@nextui-org/react";
import "./SharedComponents/GradientButton.css";

const SharedButton = ({
  className,
  onPress,
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
        onPress={onPress}
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
        <Text color={buttonTextColor}>{title}</Text>
        {IconNode && (
          <div className={`p-4 ${iconClassName}`}>
            <IconNode iconSize={IconNodeSize} />
          </div>
        )}
      </Button>
    </>
  );
};

export default SharedButton;
