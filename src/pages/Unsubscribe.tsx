import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type ViewState =
  | { kind: "validating" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<ViewState>({ kind: "validating" });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ kind: "invalid", message: "This unsubscribe link is missing its token." });
      return;
    }

    (async () => {
      try {
        const url = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const resp = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } });
        const data = await resp.json().catch(() => ({}));
        if (cancelled) return;

        if (!resp.ok) {
          setState({
            kind: "invalid",
            message: data?.error ?? "This unsubscribe link is no longer valid.",
          });
          return;
        }
        if (data?.valid === false && data?.reason === "already_unsubscribed") {
          setState({ kind: "already" });
          return;
        }
        if (data?.valid === true) {
          setState({ kind: "valid" });
          return;
        }
        setState({ kind: "invalid", message: "This unsubscribe link is no longer valid." });
      } catch {
        if (!cancelled) {
          setState({ kind: "invalid", message: "We couldn't reach the server. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        setState({ kind: "success" });
        return;
      }
      if (data?.reason === "already_unsubscribed") {
        setState({ kind: "already" });
        return;
      }
      throw new Error(data?.error ?? "Failed to process your request.");
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Manage your BudgetBuddy AI email subscription.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "validating" && (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-sm">Checking your link…</p>
            </div>
          )}

          {state.kind === "valid" && (
            <>
              <p className="text-sm text-foreground">
                Click the button below to confirm you'd like to stop receiving emails from
                BudgetBuddy AI to this address.
              </p>
              <Button onClick={handleConfirm} className="w-full">
                Confirm unsubscribe
              </Button>
            </>
          )}

          {state.kind === "submitting" && (
            <Button disabled className="w-full">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing…
            </Button>
          )}

          {state.kind === "success" && (
            <div className="flex flex-col items-center text-center py-2">
              <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
              <h3 className="font-semibold">You're unsubscribed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You will no longer receive marketing or notification emails from BudgetBuddy AI.
                Important account emails (like password resets) will still be delivered.
              </p>
            </div>
          )}

          {state.kind === "already" && (
            <div className="flex flex-col items-center text-center py-2">
              <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
              <h3 className="font-semibold">Already unsubscribed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This address has already been removed from our mailing list.
              </p>
            </div>
          )}

          {(state.kind === "invalid" || state.kind === "error") && (
            <div
              role="alert"
              className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{state.message}</div>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link to="/" className="text-sm text-primary hover:underline">
              Return to BudgetBuddy AI
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
