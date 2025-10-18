import { type BoxProps, type TextProps } from "ink";
import { type ComponentTheme } from "@inkjs/ui";

const theme = {
  styles: {
    container: (): BoxProps => ({
      gap: 1,
    }),
    frame: (): TextProps => ({
      color: "whiteBright",
    }),
    label: (): TextProps => ({
      color: "gray",
    }),
  },
} satisfies ComponentTheme;

export default theme;
export type Theme = typeof theme;
