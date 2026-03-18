

## Fix Email Share Button — Final Plan

**File:** `src/components/ReferralDashboard.tsx`

### Changes

1. **Replace share buttons section** with capability-based UI:
   - Use `const canNativeShare = !!navigator.share` (no user-agent sniffing)
   - If `canNativeShare` → show "Share" button; else → show "Email" button
   - Always show WhatsApp, X Post, and Copy Link buttons

2. **Update `shareEmail` function** — keep `window.location.href` (not `window.open`), add clipboard fallback:
```ts
const shareEmail = async () => {
  const subject = encodeURIComponent("Try BudgetBuddy AI - Smart Money Management");
  const body = encodeURIComponent(`Hey!\n\nI've been using BudgetBuddy AI to track my spending and it's been really helpful.\n\nYou can try it for free here: ${referralLink}\n\nEnjoy!`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  try {
    await navigator.clipboard.writeText(referralLink);
    toast({ title: "Opening email…", description: "Link also copied to clipboard" });
  } catch {}
};
```

3. **Update `shareNative` to fall back to `shareEmail`** on failure/cancel:
```ts
const shareNative = async () => {
  try {
    await navigator.share({ title: "Join BudgetBuddy AI", text: "Track your finances smarter", url: referralLink });
  } catch {
    shareEmail();
  }
};
```

4. **Update button layout** (~lines 148-159):
```tsx
const canNativeShare = !!navigator.share;
// ...
{canNativeShare ? (
  <Button size="sm" variant="outline" onClick={shareNative} disabled={!referralLink}>
    <Share2 className="h-4 w-4 mr-1" /> Share
  </Button>
) : (
  <Button size="sm" variant="outline" onClick={shareEmail} disabled={!referralLink}>
    Email
  </Button>
)}
<Button size="sm" variant="outline" onClick={shareWhatsApp} disabled={!referralLink} className="text-green-600">
  WhatsApp
</Button>
<Button size="sm" variant="outline" onClick={shareTwitter} disabled={!referralLink}>
  𝕏 Post
</Button>
<Button size="sm" variant="outline" onClick={copyLink} disabled={!referralLink}>
  <Copy className="h-4 w-4 mr-1" /> Copy Link
</Button>
```

### Summary
- Feature detection, not device detection
- `mailto:` stays as `window.location.href` (not `window.open`)
- Clipboard copy as the real reliability layer
- Native share falls back to email on failure
- Subject/body already `encodeURIComponent`'d (already done in current code)

