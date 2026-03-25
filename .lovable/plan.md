

## Add Dark Mode Toggle

**What**: A button in Settings that lets users switch between the default light theme and a dark/black background. This is an accessibility feature for users who find bright screens uncomfortable.

### How it works

1. **Create a ThemeContext** (`src/contexts/ThemeContext.tsx`)
   - Stores user preference (`light` / `dark`) in `localStorage`
   - Toggles the `dark` class on `<html>` element (Tailwind's `darkMode: ["class"]` is already configured)
   - Persists across sessions

2. **Add ThemeProvider to App.tsx**
   - Wrap the app with the new `ThemeContext` provider

3. **Add toggle to Settings/More component** (`src/components/More.tsx`)
   - Add a Moon/Sun icon toggle or Switch component in the settings area
   - Label: "Dark Mode" with a brief description like "Easier on your eyes"

### Technical details

- Tailwind dark mode is already set up (`darkMode: ["class"]` in `tailwind.config.ts`)
- Dark theme CSS variables are already defined in `index.css` (`.dark` class block)
- No new dependencies needed — uses existing `Switch` component and `lucide-react` icons

### Files

| File | Change |
|------|--------|
| `src/contexts/ThemeContext.tsx` | New — theme state, localStorage persistence, toggle function |
| `src/App.tsx` | Wrap with `ThemeProvider` |
| `src/components/More.tsx` | Add Dark Mode toggle (Switch + Moon icon) in settings section |

