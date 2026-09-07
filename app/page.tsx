import { Column } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { Hero } from "./_components/landing/Hero";
import { HowItWorks } from "./_components/landing/HowItWorks";
import { ClosingCta } from "./_components/landing/ClosingCta";
import { LandingFooter } from "./_components/landing/LandingFooter";

/**
 * DIRECTION CONTRACT — Landing page (Persuade).
 * THESIS: Seed Forge is the modern web alternative to KTS; the landing proves
 *   the mechanism (a live standings table) instead of claiming it, and
 *   refuses the generic text-only hero + icon-card grid.
 * OWN-WORLD: Forge Floor — violet heat on slate steel, Geist, Once UI
 *   primitives, translucent surfaces, alpha borders, playful radii; magenta
 *   only for the live state.
 * STORY: the organizer understands the flow (create → players → rounds →
 *   standings) in one scroll and registers.
 * FIRST VIEWPORT: copy on the left with the primary action; a synthetic live
 *   standings table on the right under a pulsing "En vivo" dot.
 * FORM: surface redesign inside the established identity (extended surface).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 */
const Home = async () => {
  // Signed-in users go straight to creation; guests land on the sign-up page.
  const userId = await getSessionUserId();
  const primaryCtaHref = userId ? "/crear" : "/registro";

  return (
    <Column fillWidth>
      <Hero primaryCtaHref={primaryCtaHref} />

      <Column fillWidth horizontal="center" paddingY="40" gap="80">
        <HowItWorks />
        <ClosingCta primaryCtaHref={primaryCtaHref} />
      </Column>

      <LandingFooter />
    </Column>
  );
};

export default Home;
