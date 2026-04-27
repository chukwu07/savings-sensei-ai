import { ReactNode, MouseEvent } from "react";
import { toast } from "sonner";

const SUPPORT_EMAIL = "support@budgetbuddyai.co.uk";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "BudgetBuddy Support Request",
)}`;

/**
 * Shared fallback handler — if no mail handler intercepts the navigation
 * (common on desktops without a configured email client), the page keeps
 * focus. After 600ms we surface a toast with a copy-to-clipboard action.
 */
function attachFallback() {
  window.setTimeout(() => {
    if (typeof document === "undefined") return;
    if (!document.hasFocus()) return; // mail app took over — done.

    toast("No email app detected", {
      description: `Email us at ${SUPPORT_EMAIL}`,
      action: {
        label: "Copy",
        onClick: () => {
          navigator.clipboard
            ?.writeText(SUPPORT_EMAIL)
            .then(() => toast.success("Email address copied"))
            .catch(() => toast.error("Couldn't copy — please copy manually"));
        },
      },
      duration: 8000,
    });
  }, 600);
}

interface ContactSupportRowProps {
  /** Inner content (icon + label block). */
  children: ReactNode;
  className?: string;
}

/**
 * Card-row style trigger used inside the More page.
 * Renders a real <a href="mailto:..."> so the click event itself triggers
 * navigation — required by Chrome/Edge for mailto: links.
 */
export function ContactSupportRow({ children, className }: ContactSupportRowProps) {
  const handleClick = (_e: MouseEvent<HTMLAnchorElement>) => {
    attachFallback();
  };

  return (
    <a
      href={MAILTO_HREF}
      onClick={handleClick}
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
 */
export function ContactSupportTextLink({
  children,
  className,
}: ContactSupportTextLinkProps) {
  const handleClick = (_e: MouseEvent<HTMLAnchorElement>) => {
    attachFallback();
  };

  return (
    <a
      href={MAILTO_HREF}
      onClick={handleClick}
      className={
        className ??
        "text-sm text-muted-foreground hover:text-primary transition-colors"
      }
    >
      {children}
    </a>
  );
}
