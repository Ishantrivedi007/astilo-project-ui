import { Input, Spacer } from "@nextui-org/react";
import "./InputField.css";

const InputField = ({
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
    <>
      <Spacer y={0.5} />
      <div className="input-field-container">
        {" "}
        <Input
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
      </div>

      <Spacer y={yMarkings} x={xMarkings} />
    </>
  );
};

export default InputField;
