import { Column, Background } from "@once-ui-system/core";

/**
 * Shared layout for the auth pages (login / registro): minimal layout that
 * centers the form card on the space below the global navbar, on top of a
 * stacked decorative background (gradient + lines + dots). The background is
 * anchored to the viewport (fixed) so it extends behind the floating SiteNav
 * instead of starting below it. The Seed Forge brand lives in the SiteNav.
 */
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Column
      fillWidth
      flex="1"
      horizontal="center"
      vertical="center"
      position="relative"
      overflow="hidden"
    >
      <Background
        position="fixed"
        top={0}
        left={0}
        fill
        gradient={{
          display: true,
          opacity: 100,
          x: 50,
          y: 0,
          colorStart: "brand-background-strong",
          colorEnd: "static-transparent",
        }}
        lines={{
          display: true,
          opacity: 60,
          size: "16",
          thickness: 1,
          angle: 90,
          color: "brand-background-weak",
        }}
        dots={{
          display: true,
          opacity: 60,
          size: "4",
          color: "page-background",
        }}
      />
      <Column
        maxWidth={28}
        fillWidth
        gap="24"
        horizontal="center"
        position="relative"
        zIndex="1"
      >
        {children}
      </Column>
    </Column>
  );
};

export default AuthLayout;
