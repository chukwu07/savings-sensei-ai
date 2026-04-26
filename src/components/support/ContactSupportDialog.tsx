import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, CheckCircle2, AlertCircle, LogIn } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const supportSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Please enter a subject")
    .max(150, "Subject must be 150 characters or fewer"),
  message: z
    .string()
    .trim()
    .min(1, "Please write a message")
    .max(2000, "Message must be 2000 characters or fewer"),
});

type SupportForm = z.infer<typeof supportSchema>;

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = "idle" | "submitting" | "success" | "error";

export function ContactSupportDialog({ open, onOpenChange }: ContactSupportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
    defaultValues: { subject: "", message: "" },
  });

  const subjectValue = form.watch("subject") ?? "";
  const messageValue = form.watch("message") ?? "";

  const handleClose = (next: boolean) => {
    if (!next) {
      // Reset on close so reopening is clean
      form.reset();
      setStatus("idle");
      setErrorMessage(null);
    }
    onOpenChange(next);
  };

  const handleSignInRedirect = () => {
    const currentPath = window.location.pathname + window.location.search;
    onOpenChange(false);
    navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
  };

  const onSubmit = async (values: SupportForm) => {
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const { data, error } = await supabase.functions.invoke("send-support-message", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          subject: values.subject,
          message: values.message,
          route: window.location.pathname,
        },
      });

      if (error) {
        // Try to surface a meaningful message
        const fnMessage =
          (error as { context?: { error?: string } })?.context?.error ??
          error.message ??
          "Failed to send message.";
        throw new Error(fnMessage);
      }

      if (!data?.ok) {
        throw new Error(data?.error ?? "Failed to send message.");
      }

      setStatus("success");
      toast({
        title: "Message sent",
        description: "We've received your message and will reply by email.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(msg);
      setStatus("error");
    }
  };

  // Unauthenticated state
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Support
            </DialogTitle>
            <DialogDescription>
              Log in to send us a message. We'll reply by email, usually within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleSignInRedirect}>
              <LogIn className="h-4 w-4 mr-2" />
              Log in to continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            We usually respond within 24 hours. Replies go to{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Message sent</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We've received your message and will reply by email shortly.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {status === "error" && errorMessage && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What can we help with?"
                        maxLength={150}
                        disabled={status === "submitting"}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {subjectValue.length}/150
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what's going on..."
                        rows={6}
                        maxLength={2000}
                        disabled={status === "submitting"}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {messageValue.length}/2000
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={status === "submitting"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending…
                    </>
                  ) : status === "error" ? (
                    "Retry"
                  ) : (
                    "Send message"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
