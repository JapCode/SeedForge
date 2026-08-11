import { style } from "@/resources/once-ui.config";
import {
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
  ThemeProvider,
  ToastProvider,
} from "@once-ui-system/core";

// Composes the Once UI providers and feeds the single source of truth
// (resources/once-ui.config.ts `style`) into the ThemeProvider, as
// described in the docs: https://docs.once-ui.com/once-ui/contexts/themeProvider
export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <LayoutProvider>
      <ThemeProvider
        theme={style.theme}
        brand={style.brand}
        accent={style.accent}
        neutral={style.neutral}
        solid={style.solid}
        solidStyle={style.solidStyle}
        border={style.border}
        surface={style.surface}
        transition={style.transition}
        scaling={style.scaling}
      >
        <DataThemeProvider>
          <ToastProvider>
            <IconProvider>{children}</IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
};
