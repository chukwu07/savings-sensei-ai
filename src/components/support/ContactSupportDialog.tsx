import { useEffect } from "react";

const SUPPORT_EMAIL = "support@budgetbuddyai.co.uk";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "BudgetBuddy Support Request",
)}`;

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Contact Support" trigger — direct mailto, no UI.
 *
 * When `open` flips to true, fires a mailto: link to support@budgetbuddyai.co.uk
 * via a programmatically clicked anchor (more reliable than window.location.href,
 * especially inside iframe sandboxes), then resets the trigger state.
 */
export function ContactSupportDialog({ open, onOpenChange }: ContactSupportDialogProps) {
  useEffect(() => {
    if (!open) return;

    const a = document.createElement("a");
    a.href = MAILTO_HREF;
    a.rel = "noopener";
    // Append + click + remove so browsers reliably treat it as a user-initiated nav.
    document.body.appendChild(a);
    a.click();
    a.remove();

    onOpenChange(false);
  }, [open, onOpenChange]);

  return null;
}
