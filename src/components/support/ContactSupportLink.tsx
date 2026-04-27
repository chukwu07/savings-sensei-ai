import { ReactNode, useEffect, useRef, useState, MouseEvent } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "support@budgetbuddyai.co.uk";
const SUBJECT = "BudgetBuddy Support Request";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}`;
const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
  SUPPORT_EMAIL,
)}&su=${encodeURIComponent(SUBJECT)}`;
const FALLBACK_DETECTION_MS = 600;

/**
 * Shared hook: schedules a fallback check 600ms after a mailto click.
 * If the page still has focus and is visible, the OS did not hand off
 * to a mail app — open the fallback dialog.
 */
function useMailtoFallback() {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const handleClick = (_e: MouseEvent<HTMLAnchorElement>) => {
    // Don't prevent default — let the native mailto: fire.
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const stillHere =
        typeof document !== "undefined" &&
        document.hasFocus() &&
        document.visibilityState === "visible";
      if (stillHere) {
        setOpen(true);
      }
      timerRef.current = null;
    }, FALLBACK_DETECTION_MS);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) clearTimer();
    setOpen(next);
  };

  return { open, handleClick, handleOpenChange };
}

interface FallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContactSupportFallbackDialog({ open, onOpenChange }: FallbackDialogProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const copyEmail = async (autoClose: boolean) => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
    } catch {
      // Clipboard may be blocked (e.g. insecure context). Fall back to selection.
      try {
        const ta = document.createElement("textarea");
        ta.value = SUPPORT_EMAIL;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        return;
      }
    }
    setCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      if (autoClose) onOpenChange(false);
      copyTimerRef.current = null;
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>We couldn't open your email app</DialogTitle>
          <DialogDescription>
            You can copy the address below or open Gmail in your browser.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => copyEmail(false)}
          className="w-full flex items-center justify-between gap-3 rounded-md border border-border bg-muted/50 px-3 py-3 font-mono text-sm text-foreground hover:bg-muted transition-colors text-left"
          aria-label="Copy support email address"
        >
          <span className="truncate">{SUPPORT_EMAIL}</span>
          {copied ? (
            <Check className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => copyEmail(true)}
            className="sm:order-1"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy email
              </>
            )}
          </Button>
          <Button asChild className="sm:order-2">
            <a
              href={GMAIL_COMPOSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Gmail
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContactSupportRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card-row style trigger used inside the More page.
 * Native <a href="mailto:..."> fires immediately; fallback dialog
 * only appears if the OS has no mail handler.
 */
export function ContactSupportRow({ children, className }: ContactSupportRowProps) {
  const { open, handleClick, handleOpenChange } = useMailtoFallback();
  return (
    <>
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
      <ContactSupportFallbackDialog open={open} onOpenChange={handleOpenChange} />
    </>
  );
}

interface ContactSupportTextLinkProps {
  children: ReactNode;
  className?: string;
}

/**
 * Plain text-link style trigger used inside the LegalFooter.
 * Native <a href="mailto:..."> fires immediately; fallback dialog
 * only appears if the OS has no mail handler.
 */
export function ContactSupportTextLink({
  children,
  className,
}: ContactSupportTextLinkProps) {
  const { open, handleClick, handleOpenChange } = useMailtoFallback();
  return (
    <>
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
      <ContactSupportFallbackDialog open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
