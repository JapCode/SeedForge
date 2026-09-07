"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@once-ui-system/core";

export interface TournamentTabOption {
  value: string;
  label: string;
}

/**
 * Segmented control that switches between the tournament views. The active
 * segment lives in the URL query (?tab=...), so each view has its own
 * shareable/bookmarkable URL and the back button works.
 *
 * `selected` is driven by the server (from searchParams); toggling replaces
 * the query without scrolling back to the top.
 */
export const TournamentTabs = ({
  tournamentId,
  current,
  tabs,
}: {
  tournamentId: string;
  current: string;
  tabs: TournamentTabOption[];
}) => {
  const router = useRouter();

  const handleToggle = (value: string) => {
    router.replace(`/torneo/${tournamentId}?tab=${value}`, { scroll: false });
  };

  return (
    <SegmentedControl
      fillWidth
      selected={current}
      buttons={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
      onToggle={handleToggle}
    />
  );
};
