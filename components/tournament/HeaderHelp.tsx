"use client";

import { useEffect, useRef, useState } from "react";
import { Animation, Row, Text, IconButton } from "@once-ui-system/core";

export const HeaderHelp = ({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <Row gap="4" vertical="center">
      <Text variant="label-default-s">{label}</Text>
      <Animation
        triggerType="manual"
        active={open}
        placement="bottom"
        portal
        offsetDistance="8"
        fade={0}
        scale={0.95}
        duration={150}
        trigger={
          <IconButton
            ref={triggerRef}
            icon="help"
            size="s"
            variant="ghost"
            aria-label={hint}
            onClick={() => setOpen((value) => !value)}
          />
        }
      >
        <Row
          ref={popoverRef}
          paddingX="12"
          paddingY="8"
          radius="m"
          background="surface"
          border="neutral-medium"
          style={{ maxWidth: "18rem", whiteSpace: "normal" }}
        >
          <Text variant="body-default-s">{hint}</Text>
        </Row>
      </Animation>
    </Row>
  );
};
