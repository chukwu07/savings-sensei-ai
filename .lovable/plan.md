## Why the button does nothing

Two reasons:

1. **You're testing in the Lovable preview iframe.** The iframe's sandbox silently blocks `window.location.href = "mailto:..."` (top-level navigation). No error appears — it just does nothing.
2. **Even on the live site, the JS approach is fragile.** Desktop browsers without a configured mail handler will silently ignore `window.location.href = "mailto:..."`. A real anchor tag, by contrast, triggers the OS-level protocol handler and the browser shows its "choose an app" prompt as a fallback.

## The fix (one file, ~5 lines)

Edit `src/components/support/ContactSupportDialog.tsx`:

- Replace the "Open email app" `<Button onClick={handleOpenEmail}>` with a `<Button asChild>` wrapping a real `<a href={MAILTO_HREF}>` anchor.
- Delete the `handleOpenEmail` function — no longer needed.
- Keep `onOpenChange(false)` behavior by adding `onClick={() => onOpenChange(false)}` to the anchor so the dialog closes after click.

Result:
```tsx
<Button asChild className="w-full sm:w-auto">
  <a href={MAILTO_HREF} onClick={() => onOpenChange(false)}>
    <ExternalLink className="h-4 w-4 mr-2" />
    Open email app
  </a>
</Button>
```

This works because:
- Anchors with `mailto:` hand off to the OS, bypassing iframe sandbox restrictions.
- If no mail client is installed, the browser shows its native picker instead of failing silently.
- `Button asChild` (Radix `Slot` pattern) keeps the existing button styling.

## Important — how to test

- The button **may still appear to do nothing inside the Lovable preview iframe** depending on the user's browser, because the iframe context is unusual.
- **Test on the published site** (`https://www.budgetbuddyai.co.uk`) or open the preview in a new tab. That's the real user environment.
- On a phone, it will always work — `mailto:` opens the default Mail app instantly.

## What stays the same

- Dialog UI, copy email button, toasts — unchanged.
- No infrastructure changes, no new dependencies.
- "Copy email" remains the reliable fallback for desktop users without a mail client.
