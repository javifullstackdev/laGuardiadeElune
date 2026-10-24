"use client";

import type { ReactNode } from "react";
import type { SwitchProps as AriaSwitchProps } from "react-aria-components";
import { Switch as AriaSwitch } from "react-aria-components";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface ToggleBaseProps {
  size?: "sm" | "md";
  slim?: boolean;
  className?: string;
  isHovered?: boolean;
  isFocusVisible?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export const ToggleBase = ({
  className,
  isHovered,
  isDisabled,
  isFocusVisible,
  isSelected,
  slim,
  size = "sm",
}: ToggleBaseProps) => {
  const styles = {
    default: {
      sm: {
        root: "h-5 w-9 p-0.5",
        switch: cx("size-4", isSelected && "translate-x-4"),
      },
      md: {
        root: "h-6 w-11 p-0.5",
        switch: cx("size-5", isSelected && "translate-x-5"),
      },
    },
    slim: {
      sm: {
        root: "h-4 w-8",
        switch: cx("size-4", isSelected && "translate-x-4"),
      },
      md: {
        root: "h-5 w-10",
        switch: cx("size-5", isSelected && "translate-x-5"),
      },
    },
  };

  const classes = slim ? styles.slim[size] : styles.default[size];

  return (
    <div
      className={cx(
        "cursor-pointer rounded-full bg-white/15 ring-[0.5px] ring-white/25 outline-yellow-200 transition duration-150 ease-linear ring-inset",
        isSelected && "bg-yellow-500",
        isSelected && isHovered && "bg-yellow-400",
        isDisabled && "cursor-not-allowed opacity-50",
        isFocusVisible && "outline-2 outline-offset-2",
        slim && "ring-1",
        slim && isSelected && "ring-transparent",
        classes.root,
        className,
      )}
    >
      <div
        style={{
          transition:
            "transform 0.15s ease-in-out, translate 0.15s ease-in-out, border-color 0.1s linear, background-color 0.1s linear",
        }}
        className={cx(
          "rounded-full bg-white shadow-sm",
          slim && "border border-white/40 shadow-xs",
          slim && isSelected && "border-yellow-200",
          classes.switch,
        )}
      />
    </div>
  );
};

const styles = {
  sm: {
    root: "gap-2",
    textWrapper: "",
    label: "text-sm font-medium",
    hint: "text-sm",
  },
  md: {
    root: "gap-3",
    textWrapper: "gap-0.5",
    label: "text-base font-medium",
    hint: "text-base",
  },
};

interface ToggleProps extends AriaSwitchProps {
  size?: "sm" | "md";
  label?: string;
  hint?: ReactNode;
  hintClassName?: string;
  slim?: boolean;
}

export const Toggle = ({ label, hint, hintClassName, className, size = "sm", slim, ...ariaSwitchProps }: ToggleProps) => {
  return (
    <AriaSwitch
      {...ariaSwitchProps}
      className={(state) =>
        cx(
          "relative flex w-max items-start",
          state.isDisabled && "cursor-not-allowed",
          styles[size].root,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {({ isSelected, isDisabled, isFocusVisible, isHovered }) => (
        <>
          <ToggleBase
            slim={slim}
            size={size}
            isHovered={isHovered}
            isDisabled={isDisabled}
            isFocusVisible={isFocusVisible}
            isSelected={isSelected}
            className={slim ? "mt-0.5" : ""}
          />

          {(label || hint) && (
            <div className={cx("flex flex-col", styles[size].textWrapper)}>
              {label && <p className={cx("select-none text-gray-100", styles[size].label)}>{label}</p>}
              {hint && (
                <span className={cx("text-gray-400", styles[size].hint, hintClassName)} onClick={(event) => event.stopPropagation()}>
                  {hint}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </AriaSwitch>
  );
};
