import { Mail, Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SUPPORT_EMAIL = "support@budgetbuddyai.co.uk";
const MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "BudgetBuddy Support Request",
)}`;

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSupportDialog({ open, onOpenChange }: ContactSupportDialogProps) {
  const { toast } = useToast();

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast({
        title: "Email copied",
        description: `${SUPPORT_EMAIL} is on your clipboard.`,
      });
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: `Please copy this address manually: ${SUPPORT_EMAIL}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            We'd love to hear from you. Email us and we usually reply within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Send us an email at</p>
          <p className="font-medium text-foreground break-all select-all">
            {SUPPORT_EMAIL}
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={handleCopyEmail} className="w-full sm:w-auto">
            <Copy className="h-4 w-4 mr-2" />
            Copy email
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <a href={MAILTO_HREF} onClick={() => onOpenChange(false)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open email app
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
