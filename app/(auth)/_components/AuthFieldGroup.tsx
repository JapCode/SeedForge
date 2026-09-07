"use client";

import type { ChangeEvent, CSSProperties, InputHTMLAttributes } from "react";
import { Column, Input, PasswordInput } from "@once-ui-system/core";
import styles from "./AuthFieldGroup.module.scss";

export interface AuthField {
  id: string;
  label: string;
  type: InputHTMLAttributes<HTMLInputElement>["type"];
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  /** Renders a PasswordInput (show/hide toggle) instead of a plain Input. */
  isPassword?: boolean;
}

interface AuthFieldGroupProps {
  fields: AuthField[];
  /**
   * CSS background for the inputs, e.g. "var(--neutral-background-weak)".
   * Defaults to the opaque neutral background so the decorative page
   * background behind the translucent auth card doesn't darken the fields.
   */
  background?: string;
}

/**
 * Renders a group of inputs joined into a single block (Once UI):
 * rounded top corners on the first field, rounded bottom corners on the
 * last one, and overlapping 1px borders in between (the -1px margin makes
 * the stacked borders render as a single line, matching the Figma spec).
 */
export const AuthFieldGroup = ({ fields, background }: AuthFieldGroupProps) => {
  return (
    <Column
      gap="0"
      fillWidth
      style={
        background
          ? ({ "--sf-input-background": background } as CSSProperties)
          : undefined
      }
    >
      {fields.map((field, index) => {
        const isFirst = index === 0;
        const isLast = index === fields.length - 1;
        const radius = isFirst ? "top" : isLast ? "bottom" : "none";
        const Component = field.isPassword ? PasswordInput : Input;

        return (
          <Component
            key={field.id}
            id={field.id}
            label={field.label}
            type={field.type}
            value={field.value}
            onChange={field.onChange}
            autoComplete={field.autoComplete}
            required={field.required}
            height="m"
            radius={radius}
            className={styles.input}
            style={isFirst ? undefined : { marginTop: "-1px" }}
          />
        );
      })}
    </Column>
  );
};
