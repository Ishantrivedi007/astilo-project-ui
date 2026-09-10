import { Button, type ButtonProps } from "@heroui/react";

type GradientButtonProps = Omit<ButtonProps, "color" | "variant">;

/**
 * The accent-gradient CTA used across the app (login, lyrics, hero actions…).
 * Colours follow the active theme via the `--accent` / `--accent-2` tokens.
 */
const GradientButton = ({ className, radius = "full", ...props }: GradientButtonProps) => (
  <Button
    {...props}
    radius={radius}
    className={[
      "border-0 bg-gradient-to-r from-accent via-accent-2 to-accent bg-[length:200%_auto]",
      "font-bold text-[#17131f] shadow-glow",
      "transition-[background-position,transform] duration-500 hover:bg-right hover:scale-[1.03] active:scale-95",
      className ?? "",
    ].join(" ")}
  />
);

export default GradientButton;
