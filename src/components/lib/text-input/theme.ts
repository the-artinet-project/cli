import { type TextProps } from "ink";
import { type ComponentTheme } from "@inkjs/ui";

const theme = {
  styles: {
    value: (): TextProps => ({}),
  },
} satisfies ComponentTheme;

export default theme;
export type Theme = typeof theme;
