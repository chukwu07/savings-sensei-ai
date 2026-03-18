import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Share2, Gift, Trophy, Users, TrendingUp, Check, Crown, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const SHARE_BASE_URL = "https://budgetbuddyai.co.uk/?ref=";

export function ReferralDashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch profile (referral_code, referral_count)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["referral-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code, referral_count, display_name")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;

      // If no referral code exists, generate one via RPC
      if (!data.referral_code) {
        const { data: code, error: rpcError } = await supabase.rpc("generate_referral_code", { uid: user!.id });
        if (rpcError) throw rpcError;
        return { ...data, referral_code: code };
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch referral rewards milestones
  const { data: rewards = [] } = useQuery({
    queryKey: ["referral-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("is_active", true)
        .order("referral_threshold", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ["referral-commissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_commissions")
        .select("id, referrer_user_id, referred_user_id, commission_amount, commission_percent, status, created_at")
        .eq("referrer_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch referred users
  const { data: referredUsers = [] } = useQuery({
    queryKey: ["referred-users", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, created_at, referral_verified")
        .eq("referrer_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_referral_leaderboard");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const referralLink = profile?.referral_code ? `${SHARE_BASE_URL}${profile.referral_code}` : "";
  const referralCount = profile?.referral_count || 0;

  // Find next milestone
  const nextReward = rewards.find((r: any) => r.referral_threshold > referralCount);
  const nextThreshold = nextReward?.referral_threshold || (rewards.length > 0 ? rewards[rewards.length - 1].referral_threshold : 5);
  const progressPercent = nextReward ? Math.min((referralCount / nextReward.referral_threshold) * 100, 100) : 100;

  // Stats
  const totalEarnings = commissions.reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
  const pendingEarnings = commissions.filter((c: any) => c.status === "pending").reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const canNativeShare = !!navigator.share;

  const shareEmail = async () => {
    const subject = encodeURIComponent("Try BudgetBuddy AI - Smart Money Management");
    const body = encodeURIComponent(`Hey!\n\nI've been using BudgetBuddy AI to track my spending and it's been really helpful.\n\nYou can try it for free here: ${referralLink}\n\nEnjoy!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: "Opening email…", description: "Link also copied to clipboard" });
    } catch {}
  };

  const shareNative = async () => {
    try {
      await navigator.share({
        title: "Join BudgetBuddy AI",
        text: "Track your finances smarter",
        url: referralLink,
      });
    } catch {
      shareEmail();
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`I'm using BudgetBuddy AI to manage my money. Try it free: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Managing my finances with @BudgetBuddyAI 💰 Join me: ${referralLink}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share your link and earn rewards when friends use the app (3+ transactions). Earn extra when they upgrade to Premium.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-3 rounded-lg text-sm break-all font-mono">
              {referralLink || (profileLoading ? "Loading..." : "Generating your referral code...")}
            </code>
            <Button size="icon" variant="outline" onClick={copyLink} disabled={!referralLink}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={shareNative} disabled={!referralLink}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
            <Button size="sm" variant="outline" onClick={shareWhatsApp} disabled={!referralLink} className="text-green-600">
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={shareTwitter} disabled={!referralLink}>
              𝕏 Post
            </Button>
            <Button size="sm" variant="outline" onClick={shareEmail} disabled={!referralLink}>
              Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress to Next Reward */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-amber-500" />
              Reward Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{referralCount} referrals</span>
                <span className="font-medium">
                  {nextReward ? `Next: ${nextReward.reward_description} (${nextReward.referral_threshold})` : "All rewards unlocked! 🎉"}
                </span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {rewards.map((r: any) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-lg border text-sm ${
                    referralCount >= r.referral_threshold
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {referralCount >= r.referral_threshold ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <span className="text-muted-foreground text-xs">{r.referral_threshold}</span>
                    )}
                    <span className={referralCount >= r.referral_threshold ? "font-medium" : "text-muted-foreground"}>
                      {r.reward_description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{referralCount}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Referred Users */}
      {referredUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referredUsers.map((u: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{u.display_name || "User"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {u.referral_verified ? (
                        <Badge variant="default" className="gap-1">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Commission History */}
      {commissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(c.commission_amount))}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-amber-500" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry: any) => {
                  const isMe = entry.display_name === profile?.display_name;
                  return (
                    <TableRow key={entry.rank} className={isMe ? "bg-primary/5" : ""}>
                      <TableCell>
                        {entry.rank <= 3 ? (
                          <span className="text-lg">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span>
                        ) : (
                          entry.rank
                        )}
                      </TableCell>
                      <TableCell className={isMe ? "font-semibold" : ""}>
                        {entry.display_name || "Anonymous"}
                        {isMe && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(entry.total_earnings))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
