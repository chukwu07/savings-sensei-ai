

## Replace WhatsApp with Share Button in ReferralPrompt

**Problem**: The "WhatsApp" button is too narrow — a general "Share" button using the native share sheet (with email fallback) is more versatile and consistent with the ReferralDashboard.

### Changes in `src/components/ReferralPrompt.tsx`

**1. Replace `handleWhatsApp` with `handleShare`**
- Use `navigator.share()` when available (opens native share sheet — includes WhatsApp, Messages, etc.)
- Fall back to `mailto:` link + clipboard copy when native share isn't supported
- Ignore `AbortError` (user cancelling the share dialog)

**2. Update the button label**
- Change "WhatsApp" → "Share"
- Keep the `Share2` icon (already imported)

**Result**: Copy Link + Share — two clean buttons covering all sharing channels.

**Single file**: `src/components/ReferralPrompt.tsx`

