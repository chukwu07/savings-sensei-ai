

## Fix Dark Text on Goals Page

**Problem**: The Goals page has hardcoded `text-black` classes on labels and values in the goal cards. In dark mode, black text on a dark background is unreadable.

**Affected lines in `src/components/SavingsGoals.tsx`**:
- Line 423: `text-black` → "Monthly Target" label
- Line 427: `text-black` → monthly contribution value
- Line 436: `text-black` → "Months Left" label
- Line 440: `text-black` → months remaining value
- Line 449: `text-black` → "Remaining" label
- Line 453: `text-black` → remaining amount value

**Fix**: Replace all 6 instances of `text-black` with `text-foreground`, which automatically adapts between light and dark themes using the CSS variable system already in place.

**File**: `src/components/SavingsGoals.tsx` — 6 occurrences, single file edit.

