

# Fix Email Recipient - Send Budget Alerts to User's Email

## Problem Identified

Currently, the budget alert emails may not be going to the logged-in user's email address. Looking at the code in `src/hooks/useBudgets.ts`, the email is sent using EmailJS with the parameter `email: userEmail`.

The issue is that EmailJS uses specific parameter names:
- **`to_email`** - The recipient's email address (where the email is sent)
- **`email`** - Often used as a display variable, not the actual recipient

## Current Code (Line 33-34)

```javascript
{
  email: userEmail,  // This may not be setting the recipient correctly
  from_name: 'Budget Buddy',
  ...
}
```

## Solution

Change the parameter name from `email` to `to_email` so EmailJS sends the email to the authenticated user's email address:

```javascript
{
  to_email: userEmail,  // Now correctly sets recipient
  from_name: 'Budget Buddy',
  ...
}
```

## Implementation Steps

### Step 1: Update `src/hooks/useBudgets.ts`

Modify the `sendBudgetAlertEmail` function to use `to_email` instead of `email`:

**Before:**
```javascript
emailjs.send(
  'service_qjr2kr6',
  'template_4baxleq',
  {
    email: userEmail,
    from_name: 'Budget Buddy',
    from_email: 'info.helpstep@gmail.com',
    reply_to: 'info.helpstep@gmail.com',
    ...
  }
)
```

**After:**
```javascript
emailjs.send(
  'service_qjr2kr6',
  'template_4baxleq',
  {
    to_email: userEmail,  // Changed from 'email' to 'to_email'
    from_name: 'Budget Buddy',
    from_email: 'info.helpstep@gmail.com',
    reply_to: 'info.helpstep@gmail.com',
    ...
  }
)
```

### Step 2: Update EmailJS Template (Required)

You will also need to update your EmailJS template (`template_4baxleq`) in the EmailJS dashboard:

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Navigate to **Email Templates** and select `template_4baxleq`
3. In the **To Email** field, change the variable from `{{email}}` to `{{to_email}}`
4. Save the template

---

## Technical Notes

- The code already correctly retrieves the authenticated user's email via `user.email` from the `AuthContext`
- The email is triggered when a budget reaches 80% usage (line 203)
- Alert tracking prevents duplicate emails for the same budget (stored in localStorage)
- The `user?.user_metadata?.name` is used for personalisation, falling back to the email address

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useBudgets.ts` | Change `email` to `to_email` in EmailJS send parameters |

## After Implementation

Once approved, each logged-in user will receive budget alerts at their own email address (the one they used to sign up) rather than a fixed email address.

