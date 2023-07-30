import { Input } from "@nextui-org/react";
import "./InputField.css";

const PasswordInput = ({
  disabled,
  placeholder,
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
  hideToggle,
  name,
  css,
}) => {
  return (
    <>
      <div className="input-field-container">
        <Input.Password
          css={css}
          name={name}
          hideToggle={hideToggle}
          disabled={disabled}
          placeholder={placeholder}
          initialValue={initialValue}
          readOnly={readOnly}
          visibleIcon={visibleIcon}
          hiddenIcon={hiddenIcon}
          clearable={clearable}
          bordered={bordered}
          labelPlaceholder={labelPlaceholder}
          underlined={underlined}
          color={color}
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
        />
      </div>
    </>
  );
};

export default PasswordInput;
