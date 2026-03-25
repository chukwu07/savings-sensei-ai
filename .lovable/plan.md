

## Remove Duplicate Share Buttons

**Problem**: The WhatsApp and Copy Link buttons in the share row are duplicates — Copy is already the icon button next to the referral code, and WhatsApp is accessible via the native Share sheet.

**Change in `src/components/ReferralDashboard.tsx`**:

Remove lines 189-197 (WhatsApp and Copy Link buttons), keeping only Share/Email + 𝕏 Post:

```tsx
<div className="flex flex-wrap gap-2">
  {canNativeShare ? (
    <Button size="sm" variant="outline" onClick={shareNative} disabled={!referralLink}>
      <Share2 className="h-4 w-4 mr-1" /> Share
    </Button>
  ) : (
    <Button size="sm" variant="outline" onClick={shareEmail} disabled={!referralLink}>
      Email
    </Button>
  )}
  <Button size="sm" variant="outline" onClick={shareTwitter} disabled={!referralLink}>
    𝕏 Post
  </Button>
</div>
```

Also remove the now-unused `shareWhatsApp` function (lines 148-151) and the `Share2` import can stay (used by native share button).

**Result**: Two buttons — Share (or Email) + 𝕏 Post. Copy is handled by the dedicated icon button above.

**Single file**: `src/components/ReferralDashboard.tsx`

