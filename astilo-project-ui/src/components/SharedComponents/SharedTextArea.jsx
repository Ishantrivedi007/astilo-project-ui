import { Textarea } from "@nextui-org/react";
import React from "react";

const SharedTextArea = ({
  disabled,
  placeholder,
  spacer,
  xMarkings,
  yMarkings = 0.5,
  initialValue,
  readOnly = false,
  clearable = true,
  bordered = false,
  labelPlaceholder,
  underlined = false,
  visibleIcon,
  hiddenIcon,
  color,
  rounded = false,
  status,
  shadow = true,
  onClearClick,
  helperColor,
  helperText,
  type,
  labelLeft,
  labelRight,
  contentRight,
  contentLeft,
  currentColor,
  value,
  animation,
  onBlur,
  onChange,
  onFocus,
  className,
  size,
  fullWidth = true,
  style,
  password = false,
  name,
  css,
}) => {
  return (
    <Textarea
      css={css}
      name={name}
      disabled={disabled}
      placeholder={placeholder}
      initialValue={initialValue}
      readOnly={readOnly}
      clearable={clearable}
      bordered={bordered}
      labelPlaceholder={labelPlaceholder}
      underlined={underlined}
      color={color}
      style={style}
      rounded={rounded}
      status={status}
      shadow={shadow}
      onClearClick={onClearClick}
      helperColor={helperColor}
      helperText={helperText}
      type={type}
      labelLeft={labelLeft}
      labelRight={labelRight}
      contentRight={contentRight}
      contentLeft={contentLeft}
      currentColor={currentColor}
      value={value}
      animated={animation}
      onBlur={onBlur}
      onChange={onChange}
      onFocus={onFocus}
      className={`${className}`}
      size={size}
      fullWidth={fullWidth}
      visibleIcon={visibleIcon}
      hiddenIcon={hiddenIcon}
    />
  );
};

export default SharedTextArea;
