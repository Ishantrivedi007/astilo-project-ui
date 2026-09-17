import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface AppInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value"> {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
  errorMessage?: ReactNode;
  size?: "sm" | "md";
  startContent?: ReactNode;
  endContent?: ReactNode;
  wrapperClassName?: string;
}

/**
 * Hand-rolled input (label always sits in normal flow above the field) —
 * replaces a HeroUI <Input labelPlacement="outside"> that rendered the
 * floating label on top of the typed/placeholder text in every theme.
 */
const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      label,
      value,
      onValueChange,
      isRequired,
      isInvalid,
      isDisabled,
      errorMessage,
      size = "md",
      className = "",
      wrapperClassName = "",
      id,
      startContent,
      endContent,
      onChange,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <div className={`app-input ${className}`}>
        {label && (
          <label htmlFor={inputId} className="app-input-label">
            {label}
            {isRequired && <span className="app-input-required">*</span>}
          </label>
        )}
        <div
          className={[
            "app-input-wrapper",
            size === "sm" ? "app-input-wrapper--sm" : "",
            isInvalid ? "app-input-wrapper--invalid" : "",
            isDisabled ? "app-input-wrapper--disabled" : "",
            wrapperClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {startContent}
          <input
            ref={ref}
            id={inputId}
            value={value}
            disabled={isDisabled}
            required={isRequired}
            aria-invalid={isInvalid || undefined}
            onChange={(e) => {
              onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            className="app-input-field"
            {...rest}
          />
          {endContent}
        </div>
        {isInvalid && errorMessage && <p className="app-input-error">{errorMessage}</p>}
      </div>
    );
  }
);

AppInput.displayName = "AppInput";

export default AppInput;
