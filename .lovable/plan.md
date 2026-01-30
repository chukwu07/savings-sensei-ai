

# Mobile Polishing Plan: Touch Targets, Modal/Dialog Behavior, and Mobile Keyboard Input Types

This plan addresses three critical areas to ensure a smooth experience for millions of users across both laptop and mobile devices.

---

## Overview of Changes

| Area | Current State | Improvement |
|------|---------------|-------------|
| Touch Targets | Some elements use `touch-target` class, but close buttons in dialogs are too small (16x16px) | Standardize all interactive elements to 44px minimum |
| Modal/Dialog Behavior | Fixed positioning, no height constraints | Add `max-h-[90vh]` and scrollable content areas |
| Mobile Keyboard Input Types | All number inputs use `type="number"` only | Add `inputmode="decimal"` for proper mobile numeric keypads |

---

## Part 1: Touch Targets

### What This Fixes
Touch targets that are too small make it difficult for users to tap accurately on mobile devices. Apple recommends a minimum of 44x44 pixels.

### Files to Update

**1. Dialog Close Button (`src/components/ui/dialog.tsx`)**
- Current close button uses `h-4 w-4` (16x16px) icon
- Add a larger touch target wrapper around the X button

**2. Alert Dialog Actions (`src/components/ui/alert-dialog.tsx`)**
- Ensure action/cancel buttons have sufficient padding
- Currently relies on button defaults which may be too small on mobile

**3. SwipeableCard Hints (`src/components/enhanced/SwipeableCard.tsx`)**
- Remove visual swipe hints that could interfere with touch
- Hide hints on touch devices (they're self-evident with swipe gesture)

**4. Input Component (`src/components/ui/input.tsx`)**
- Already has `h-10` (40px) - increase to `h-11` (44px) for mobile

---

## Part 2: Modal/Dialog Behavior on Small Screens

### What This Fixes
On small screens (especially landscape or phones with on-screen keyboards), dialogs can overflow the viewport, making content inaccessible.

### Files to Update

**1. Dialog Content (`src/components/ui/dialog.tsx`)**
- Add `max-h-[90vh]` to prevent overflow
- Add `overflow-y-auto` for scrollable content
- Add proper mobile padding

**2. Alert Dialog Content (`src/components/ui/alert-dialog.tsx`)**
- Same improvements as Dialog
- Ensure footer buttons remain visible

**3. Drawer Content (`src/components/ui/drawer.tsx`)**
- Add `max-h-[85vh]` (already from bottom, needs height cap)
- Ensure content scrolls properly

### Implementation Details

```text
+----------------------------------+
|          Dialog Content          |
|  max-h-[90vh]                    |
|  +----------------------------+  |
|  |       Scrollable Area      |  |
|  |  (overflow-y-auto)         |  |
|  |                            |  |
|  +----------------------------+  |
|  [Footer buttons - fixed]        |
+----------------------------------+
```

---

## Part 3: Mobile Keyboard Input Types

### What This Fixes
When users tap a number field on mobile, they should see a numeric keypad with a decimal point, not a full QWERTY keyboard.

### Files to Update (10 number inputs across 6 files)

**1. MoneyHub.tsx** (3 inputs)
- Income amount input
- Expense amount input  
- Edit transaction amount input

**2. SavingsGoals.tsx** (4 inputs)
- Target amount (new goal)
- Current amount (new goal)
- Edit target amount
- Edit current amount

**3. BudgetManagement.tsx** (2 inputs)
- Budget allocated amount (add form)
- Budget allocated amount (edit form)

**4. Transactions.tsx** (1 input)
- Transaction amount

**5. TransactionPlainView.tsx** (1 input)
- Edit amount

**6. OfflineTransactions.tsx** (1 input)
- Transaction amount

### Change Pattern
For each number input, add `inputMode="decimal"`:

```tsx
// Before
<Input type="number" placeholder="0.00" ... />

// After  
<Input type="number" inputMode="decimal" placeholder="0.00" ... />
```

---

## Technical Implementation Details

### Dialog Component Changes

```tsx
// src/components/ui/dialog.tsx - DialogContent

<DialogPrimitive.Content
  className={cn(
    // Existing classes...
    "max-h-[90vh] overflow-y-auto",  // Add scroll constraint
    "mx-4",  // Mobile edge padding
    className
  )}
>
  {children}
  <DialogPrimitive.Close className="absolute right-4 top-4 
    min-h-[44px] min-w-[44px]  // Increase touch target
    flex items-center justify-center
    rounded-sm opacity-70 ...">
    <X className="h-5 w-5" />  // Slightly larger icon
  </DialogPrimitive.Close>
</DialogPrimitive.Content>
```

### Input Component Changes

```tsx
// src/components/ui/input.tsx

<input
  className={cn(
    "flex h-11 w-full rounded-md ...",  // h-10 -> h-11 (44px)
    className
  )}
  ...
/>
```

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/components/ui/dialog.tsx` | Max height, scroll, larger close button |
| `src/components/ui/alert-dialog.tsx` | Max height, scroll |
| `src/components/ui/drawer.tsx` | Max height for drawer content |
| `src/components/ui/input.tsx` | Increase height to 44px |
| `src/components/enhanced/SwipeableCard.tsx` | Hide swipe hints on mobile (optional) |
| `src/pages/MoneyHub.tsx` | Add `inputMode="decimal"` to 3 inputs |
| `src/components/SavingsGoals.tsx` | Add `inputMode="decimal"` to 4 inputs |
| `src/components/BudgetManagement.tsx` | Add `inputMode="decimal"` to 2 inputs |
| `src/components/Transactions.tsx` | Add `inputMode="decimal"` to 1 input |
| `src/components/transactions/TransactionPlainView.tsx` | Add `inputMode="decimal"` to 1 input |
| `src/components/OfflineTransactions.tsx` | Add `inputMode="decimal"` to 1 input |

---

## Testing Checklist

After implementation, verify:

1. **Touch Targets**
   - Dialog close button is easy to tap
   - All buttons in dialogs are easily tappable
   - Form inputs have comfortable tap areas

2. **Modal/Dialog Behavior**
   - Dialogs don't overflow on iPhone SE (smallest common screen)
   - Content scrolls when needed
   - Footer buttons remain visible
   - Dialogs work in landscape orientation

3. **Keyboard Input Types**
   - Tapping amount fields shows numeric keypad with decimal
   - Numbers can be entered without switching keyboards
   - Decimal point is accessible

