"use client";

import { FormHTMLAttributes, forwardRef } from "react";

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /**
   * If true, prevents Enter key from submitting the form when pressed in input fields.
   * This is useful when using barcode scanners that send Enter after scanning.
   * @default true
   */
  preventEnterSubmit?: boolean;
}

/**
 * Form component that prevents accidental submission from barcode scanners.
 * Barcode scanners typically send an Enter key after scanning, which would
 * normally submit the form. This component prevents that behavior by default.
 */
export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ preventEnterSubmit = false, onKeyDown, children, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
      // Prevent Enter key from submitting form when in input fields
      // (barcode scanners send Enter after scanning)
      if (
        preventEnterSubmit &&
        e.key === "Enter" &&
        e.target instanceof HTMLInputElement &&
        e.target.type !== "submit"
      ) {
        e.preventDefault();
      }

      // Call original onKeyDown if provided
      onKeyDown?.(e);
    };

    return (
      <form ref={ref} onKeyDown={handleKeyDown} {...props}>
        {children}
      </form>
    );
  }
);

Form.displayName = "Form";
