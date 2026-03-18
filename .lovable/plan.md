

## Plan: Two Small Polish Fixes

**File:** `src/components/ReferralDashboard.tsx`

### 1. Add AbortError check in `shareNative` (line 141-142)
Skip the email fallback when the user simply cancels the native share dialog:
```ts
} catch (err: any) {
  if (err?.name !== "AbortError") {
    shareEmail();
  }
}
```

### 2. Improve toast message in `shareEmail` (line 130)
Change from `"Opening email… / Link also copied to clipboard"` to a clearer message:
```ts
toast({ title: "Link copied", description: "Paste it into your email if needed" });
```

Two small, surgical edits. No other changes needed.

