import { ReactNode } from "react";

const SUPPORT_EMAIL = "support@budgetbuddyai.co.uk";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "BudgetBuddy Support Request",
)}`;

interface ContactSupportRowProps {
  /** Inner content (icon + label block). */
  children: ReactNode;
  className?: string;
}

/**
 * Card-row style trigger used inside the More page.
 * Pure native <a href="mailto:..."> — no JS, no fallback.
 */
export function ContactSupportRow({ children, className }: ContactSupportRowProps) {
  return (
    <a
      href={MAILTO_HREF}
      className={
        className ??
        "w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
      }
    >
      {children}
    </a>
  );
}

interface ContactSupportTextLinkProps {
  children: ReactNode;
  className?: string;
}

/**
 * Plain text-link style trigger used inside the LegalFooter.
 * Pure native <a href="mailto:..."> — no JS, no fallback.
 */
export function ContactSupportTextLink({
  children,
  className,
}: ContactSupportTextLinkProps) {
  return (
    <a
      href={MAILTO_HREF}
      className={
        className ??
        "text-sm text-muted-foreground hover:text-primary transition-colors"
      }
    >
      {children}
    </a>
  );
}
