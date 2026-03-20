

## Fix Social Link Preview Branding

### Problem
`index.html` lines 14, 17-18 reference `lovable.dev` image and `@lovable_dev` Twitter handle. This causes WhatsApp/Twitter/Facebook previews to show "Lovable" branding.

### Changes

**1. Generate `public/og-image.png` (1200×630px)**
- Programmatically create a branded social card using the app's brand colors:
  - Background: dark navy (`hsl(210, 20%, 15%)` — the app's foreground/dark color)
  - Primary blue accent: `hsl(210, 100%, 50%)`
  - Green accent: `hsl(160, 60%, 50%)`
- Content: "BudgetBuddy AI" title + "Smart Personal Finance Management" tagline
- Clean, modern layout

**2. Update `index.html` meta tags (lines 11-18)**

Replace with:
```html
<meta property="og:title" content="BudgetBuddy AI" />
<meta property="og:description" content="Smart Personal Finance Management with AI-powered insights. Track transactions, manage budgets, and achieve your savings goals." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.budgetbuddyai.co.uk" />
<meta property="og:image" content="https://www.budgetbuddyai.co.uk/og-image.png" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@BudgetBuddyAI" />
<meta name="twitter:image" content="https://www.budgetbuddyai.co.uk/og-image.png" />
```

### Files

| File | Change |
|------|--------|
| `index.html` | Replace OG/Twitter meta tags (remove Lovable references) |
| `public/og-image.png` | New 1200×630 branded social card |

### Post-deploy note
WhatsApp caches previews aggressively. Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to force-refresh after deploying.

