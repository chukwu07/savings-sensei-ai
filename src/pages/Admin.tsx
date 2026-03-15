import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Search,
  Calendar,
  Activity,
  CreditCard,
  Target,
  MessageSquare,
  Crown,
  Gift,
  Percent,
  CheckCircle
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Admin() {
  const [searchEmail, setSearchEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Promo code form state
  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    campaign_name: '',
    subscription_tier: 'Premium',
    duration_days: '',
    max_uses: '',
    commission_percent: '0',
    referrer_user_id: '',
  });

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin-admin-page"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return false;
      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (error) return false;
        return data === true;
      } catch { return false; }
    },
  });

  // Aggregate Analytics
  const { data: analytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-admin-analytics");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // All Users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map((p: any) => p.user_id);

      const [rolesRes, subsRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("subscribers").select("user_id, subscribed, subscription_tier, subscription_end, manual_override").in("user_id", userIds),
      ]);

      const rolesByUser = new Map<string, { role: string }[]>();
      (rolesRes.data || []).forEach((r: any) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push({ role: r.role });
        rolesByUser.set(r.user_id, list);
      });

      const subsByUser = new Map<string, any>();
      (subsRes.data || []).forEach((s: any) => { subsByUser.set(s.user_id, s); });

      return profiles.map((p: any) => ({
        ...p,
        user_roles: rolesByUser.get(p.user_id) ?? [],
        subscribers: subsByUser.get(p.user_id) ? [subsByUser.get(p.user_id)] : [],
      }));
    },
    enabled: isAdmin === true,
  });

  // Audit Logs
  const { data: auditLogs } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // Promo Codes
  const { data: promoCodes } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // Commissions
  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_commissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  const logAuditEvent = async (action: string, targetUserId?: string, details?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action,
      target_user_id: targetUserId,
      details,
    });
  };

  const handleGrantPremium = async (userId: string, displayName: string) => {
    try {
      // Get user email from profiles or use a placeholder
      const { error } = await supabase.from("subscribers").upsert({
        user_id: userId,
        email: `user-${userId}@manual-grant`,
        subscribed: true,
        subscription_tier: 'Premium',
        manual_override: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;

      await logAuditEvent("GRANT_PREMIUM", userId, { display_name: displayName });
      toast({ title: "Premium Granted", description: `${displayName || 'User'} now has Premium access.` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRevokePremium = async (userId: string, displayName: string) => {
    try {
      const { error } = await supabase.from("subscribers").update({
        subscribed: false,
        subscription_tier: null,
        manual_override: false,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      if (error) throw error;

      await logAuditEvent("REVOKE_PREMIUM", userId, { display_name: displayName });
      toast({ title: "Premium Revoked", description: `${displayName || 'User'}'s premium has been removed.` });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("promo_codes").insert({
        code: promoForm.code.toUpperCase(),
        description: promoForm.description,
        campaign_name: promoForm.campaign_name || null,
        subscription_tier: promoForm.subscription_tier,
        duration_days: promoForm.duration_days ? parseInt(promoForm.duration_days) : null,
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
        commission_percent: parseFloat(promoForm.commission_percent) || 0,
        referrer_user_id: promoForm.referrer_user_id || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Promo Code Created", description: `Code ${promoForm.code.toUpperCase()} is now active.` });
      setPromoForm({ code: '', description: '', campaign_name: '', subscription_tier: 'Premium', duration_days: '', max_uses: '', commission_percent: '0', referrer_user_id: '' });
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTogglePromoCode = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("promo_codes").update({ is_active: !currentActive }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    }
  };

  const handleMarkCommissionPaid = async (id: string) => {
    const { error } = await supabase.from("referral_commissions").update({ status: 'paid' }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Commission Marked as Paid" });
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    }
  };

  const handleUserSearch = async () => {
    if (!searchEmail) return;
    const user = users?.find((u: any) => u.user_id === searchEmail || u.display_name?.toLowerCase().includes(searchEmail.toLowerCase()));
    if (user) {
      await logAuditEvent("VIEW_USER_DATA", user.user_id, { email: searchEmail });
      toast({ title: "User Found", description: `${user.display_name || "User"} - ID: ${user.user_id}` });
    } else {
      toast({ title: "User Not Found", description: "No user found with that email or name", variant: "destructive" });
    }
  };

  // Commission summary
  const totalPending = commissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0) || 0;
  const totalPaid = commissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0) || 0;

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>You don't have admin permissions to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background pb-20">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Monitor and manage your application</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="promo">Promo Codes</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">+{analytics?.newUsersThisMonth || 0} this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.activeSubscribers || 0}</div>
                  <p className="text-xs text-muted-foreground">{analytics?.subscriptionRate || 0}% conversion rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalTransactions || 0}</div>
                  <p className="text-xs text-muted-foreground">{analytics?.transactionsThisMonth || 0} this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics?.monthlyRevenue || 0}</div>
                  <p className="text-xs text-muted-foreground">MRR from subscriptions</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>User Growth (30 Days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics?.userGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Transaction Volume</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics?.transactionVolume || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Category Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={analytics?.categoryDistribution || []} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={80} fill="hsl(var(--primary))" dataKey="value">
                        {(analytics?.categoryDistribution || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Subscription Tiers</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics?.subscriptionTiers || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tier" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all registered users. Grant or revoke premium access.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading users...</p>
                    </div>
                  </div>
                )}
                {usersError && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center text-destructive">
                      <p className="font-medium">Error loading users</p>
                      <p className="text-sm">{usersError.message}</p>
                    </div>
                  </div>
                )}
                {!usersLoading && !usersError && users && users.length > 0 && (
                  <div className="space-y-4">
                    {users.map((user: any) => {
                      const sub = user.subscribers?.[0];
                      const isPremium = sub?.subscribed;
                      const isManual = sub?.manual_override;

                      return (
                        <Card key={user.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="font-medium">{user.display_name || "No name"}</p>
                                <p className="text-sm text-muted-foreground">ID: {user.user_id}</p>
                                {user.referral_code && (
                                  <p className="text-xs text-muted-foreground">Referral: {user.referral_code}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {user.user_roles?.map((role: any) => (
                                    <Badge key={role.role} variant="secondary">{role.role}</Badge>
                                  ))}
                                  {isPremium && (
                                    <Badge variant="default" className="flex items-center gap-1">
                                      <Crown className="h-3 w-3" />
                                      {sub.subscription_tier}
                                      {isManual && <span className="text-xs">(manual)</span>}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {isPremium ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRevokePremium(user.user_id, user.display_name)}
                                  >
                                    Revoke Premium
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleGrantPremium(user.user_id, user.display_name)}
                                  >
                                    <Crown className="h-4 w-4 mr-1" />
                                    Grant Premium
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Create Promo Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePromoCode} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Code</Label>
                    <Input placeholder="e.g. ALICE50" value={promoForm.code} onChange={(e) => setPromoForm(p => ({ ...p, code: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input placeholder="Internal note" value={promoForm.description} onChange={(e) => setPromoForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Campaign Name</Label>
                    <Input placeholder="e.g. TikTok Campaign" value={promoForm.campaign_name} onChange={(e) => setPromoForm(p => ({ ...p, campaign_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Input placeholder="Premium" value={promoForm.subscription_tier} onChange={(e) => setPromoForm(p => ({ ...p, subscription_tier: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Duration (days, empty = permanent)</Label>
                    <Input type="number" placeholder="∞" value={promoForm.duration_days} onChange={(e) => setPromoForm(p => ({ ...p, duration_days: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Max Uses (empty = unlimited)</Label>
                    <Input type="number" placeholder="∞" value={promoForm.max_uses} onChange={(e) => setPromoForm(p => ({ ...p, max_uses: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Commission %
                    </Label>
                    <Input type="number" min="0" max="100" step="0.1" value={promoForm.commission_percent} onChange={(e) => setPromoForm(p => ({ ...p, commission_percent: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Referrer User ID (influencer)</Label>
                    <Input placeholder="UUID of code owner" value={promoForm.referrer_user_id} onChange={(e) => setPromoForm(p => ({ ...p, referrer_user_id: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" className="w-full">
                      <Gift className="h-4 w-4 mr-2" />
                      Create Promo Code
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Promo Codes</CardTitle>
                <CardDescription>{promoCodes?.length || 0} codes total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {promoCodes?.map((pc: any) => (
                    <Card key={pc.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-lg">{pc.code}</p>
                              <Badge variant={pc.is_active ? "default" : "secondary"}>
                                {pc.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{pc.description}</p>
                            {pc.campaign_name && (
                              <p className="text-xs text-muted-foreground">Campaign: {pc.campaign_name}</p>
                            )}
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Uses: {pc.current_uses}{pc.max_uses ? `/${pc.max_uses}` : '/∞'}</span>
                              <span>Tier: {pc.subscription_tier}</span>
                              <span>Commission: {pc.commission_percent}%</span>
                              {pc.duration_days && <span>Duration: {pc.duration_days}d</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pc.is_active}
                              onCheckedChange={() => handleTogglePromoCode(pc.id, pc.is_active)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!promoCodes || promoCodes.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No promo codes yet. Create one above.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{totalPending.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{totalPaid.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission Log</CardTitle>
                <CardDescription>All referral commissions from Stripe payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {commissions?.map((c: any) => (
                    <Card key={c.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              Referrer: <span className="font-mono text-xs">{c.referrer_user_id.slice(0, 8)}...</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Referred: <span className="font-mono">{c.referred_user_id.slice(0, 8)}...</span>
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Payment: £{Number(c.payment_amount).toFixed(2)}</span>
                              <span>Rate: {c.commission_percent}%</span>
                              <span className="font-semibold text-foreground">Earned: £{Number(c.commission_amount).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(c.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                              {c.status}
                            </Badge>
                            {c.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkCommissionPaid(c.id)}>
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!commissions || commissions.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No commissions yet. They'll appear here when referred users make payments.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Lookup</CardTitle>
                <CardDescription>Search for users by email or name for support</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input placeholder="Enter user email or name..." value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                  <Button onClick={handleUserSearch}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">View user transaction history and activity logs</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Review AI chat history for quality assurance</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>All admin actions are logged here</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditLogs?.map((log: any) => (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{log.action}</p>
                            <p className="text-sm text-muted-foreground">Admin: {log.admin_user_id}</p>
                            {log.target_user_id && (
                              <p className="text-sm text-muted-foreground">Target: {log.target_user_id}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
