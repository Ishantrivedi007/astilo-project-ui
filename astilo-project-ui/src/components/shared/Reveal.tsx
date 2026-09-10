import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  /** stagger index — multiplies the delay */
  index?: number;
  delay?: number;
}

/** Scroll-into-view fade + rise. Used to bring life to grids and panels. */
const Reveal = ({ children, index = 0, delay = 0, ...rest }: RevealProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.4, delay: delay + index * 0.06, ease: "easeOut" }}
    {...rest}
  >
    {children}
  </motion.div>
);

export default Reveal;
