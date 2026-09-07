"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@once-ui-system/core";

export interface PublicTabOption {
  value: string;
  label: string;
}

/**
 * Segmented control that switches between the public views (bracket and
 * standings). The active segment lives in the URL query (?tab=...), so each
 * view has its own shareable URL and the back button works.
 *
 * `selected` is driven by the server (from searchParams); toggling replaces
 * the query without scrolling back to the top.
 */
export const PublicTabs = ({
  token,
  current,
  tabs,
}: {
  token: string;
  current: string;
  tabs: PublicTabOption[];
}) => {
  const router = useRouter();

  const handleToggle = (value: string) => {
    router.replace(`/share/${token}?tab=${value}`, { scroll: false });
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
