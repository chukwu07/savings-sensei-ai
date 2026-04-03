

## Dark Mode Polish — Final Fixes

Your app already uses theme-aware CSS variables throughout (no hardcoded `text-black`, `text-gray-*`, or `bg-white` remaining). The design system is solid. Here are the few remaining improvements:

### Changes

**1. `src/index.css`** — Add `color-scheme: dark` + improve card/background contrast
- Add `color-scheme: dark` to `.dark` class (fixes native inputs, date pickers, scrollbars)
- Increase card-to-background contrast: change `--card` from `210 20% 10%` to `210 20% 13%` (currently card and background are nearly identical at 10% vs 8%)
- Bump `--border` from `210 20% 20%` to `210 20% 22%` for slightly more visible card edges

**2. `src/components/Dashboard.tsx`** — Fix chart axis text color
- The `XAxis` and `YAxis` use `className="text-muted-foreground"` which doesn't work reliably with Recharts SVG. Add explicit `stroke="hsl(var(--muted-foreground))"` and `tick={{ fill: 'hsl(var(--muted-foreground))' }}` props so axis labels are visible in dark mode
- Add `stroke="hsl(var(--border))"` to `CartesianGrid` instead of relying on className

### What's already working well
- All text uses `text-foreground`, `text-muted-foreground`, etc.
- Cards use `bg-card` with proper dark variants
- Buttons use `primary` which stays bright in dark mode
- Icons use theme-aware colors
- Shadows already have dark-mode-specific values
- Gradients have separate dark definitions

### Result
- Native date pickers and scrollbars render correctly in dark mode
- Cards visually separate from the background with more depth
- Chart labels and grid lines are clearly visible

### Files
| File | Change |
|------|--------|
| `src/index.css` | `color-scheme: dark`, improve card/border contrast |
| `src/components/Dashboard.tsx` | Explicit chart axis colors for SVG compatibility |

