import { Input, type InputProps } from "@heroui/react";

/**
 * The single Input styling used across the app — consistent label placement,
 * border, and (critically) matching font-size/line-height between the typed
 * value and the placeholder so neither looks mis-aligned against the other.
 */
const AppInput = ({ classNames, labelPlacement = "outside", variant = "bordered", ...props }: InputProps) => (
  <Input
    variant={variant}
    labelPlacement={labelPlacement}
    classNames={{
      label: "text-ink/60 font-semibold !text-[13px] pb-1",
      inputWrapper: [
        "border-hair/40 bg-ink/5 rounded-2xl transition-colors",
        "data-[hover=true]:border-hair/70",
        "group-data-[focus=true]:border-accent/70 group-data-[focus=true]:bg-ink/[0.07]",
      ].join(" "),
      input: "text-sm text-ink placeholder:text-sm placeholder:text-ink/35",
      innerWrapper: "gap-2",
      ...classNames,
    }}
    {...props}
  />
);

export default AppInput;
