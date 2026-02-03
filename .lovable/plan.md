
# Fix Double Scrollbar in Admin Dashboard

## Problem Identified

The admin dashboard displays two scrollbars because of conflicting scroll containers:

1. **More.tsx (line 395)**: The admin panel wrapper has `overflow-auto`
2. **Admin.tsx (line 219)**: The main container has `min-h-screen` which causes it to extend beyond the viewport

This creates a situation where both the wrapper and the content can scroll independently.

---

## Solution

Remove the conflicting scroll behavior by:
1. Keeping only **one** scroll container (the outer wrapper in More.tsx)
2. Updating the Admin page to fit within its container without creating its own scroll

---

## Files to Modify

### 1. `src/components/More.tsx` (line 395)

Change the admin panel wrapper from:
```tsx
<div className="fixed inset-0 bg-background z-50 overflow-auto">
```

To:
```tsx
<div className="fixed inset-0 bg-background z-50 overflow-y-auto">
```

This is a minor refinement to explicitly control vertical scrolling.

### 2. `src/pages/Admin.tsx` (line 219)

Change the main container from:
```tsx
<div className="min-h-screen bg-background pb-20">
```

To:
```tsx
<div className="bg-background pb-20">
```

**Why**: Removing `min-h-screen` allows the content to size naturally. The parent container in More.tsx handles the full-screen layout and scrolling.

---

## Summary

| File | Line | Change |
|------|------|--------|
| `src/pages/Admin.tsx` | 219 | Remove `min-h-screen` from container |
| `src/components/More.tsx` | 395 | Ensure proper scroll handling (optional refinement) |

This single-line change eliminates the double scrollbar by ensuring only the outer container scrolls.
