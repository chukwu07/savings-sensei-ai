import { useState, useEffect } from "react";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, X, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ReferralPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("referral_prompt_dismissed")) {
      setDismissed(true);
      return;
    }
    if (user?.id) {
      supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.referral_code) setReferralCode(data.referral_code);
        });
    }
  }, [user?.id]);

  if (dismissed || !referralCode) return null;

  const link = `https://budgetbuddyai.co.uk/?ref=${referralCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "✅ Link copied!", description: "Share it with friends to earn rewards." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `I've been using BudgetBuddy AI to manage my money smarter — it's brilliant! Join free here: ${link}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleDismiss = () => {
    sessionStorage.setItem("referral_prompt_dismissed", "true");
    setDismissed(true);
  };

  return (
    <EnhancedCard className="relative overflow-hidden">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-mobile-lg">Invite friends, earn Premium</h3>
            <p className="text-xs text-muted-foreground">
              Join thousands improving their finances with BudgetBuddy.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleWhatsApp} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>
    </EnhancedCard>
  );
}
