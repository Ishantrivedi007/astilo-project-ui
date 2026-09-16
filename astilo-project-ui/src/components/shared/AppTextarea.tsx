import { Textarea, type TextAreaProps } from "@heroui/react";

/** Textarea counterpart to AppInput — same label/border/placeholder treatment. */
const AppTextarea = ({ classNames, labelPlacement = "outside", variant = "bordered", ...props }: TextAreaProps) => (
  <Textarea
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
      ...classNames,
    }}
    {...props}
  />
);

export default AppTextarea;
