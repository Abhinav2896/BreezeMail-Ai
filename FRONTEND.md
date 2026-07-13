# BreezeMail AI — Front-End Architecture

> A glassmorphic, AI-assisted email generator dashboard built with Next.js App Router and React.

---

## 1. Product Overview

**BreezeMail AI** is a single-page React application (rendered via Next.js) that lets a user describe an email, pick a tone / language / length, and produce a draft using Google's Gemini LLM. The dashboard is built around a **3-column layout** on desktop with a **full-screen History overlay**, wrapped in a translucent **mint glassmorphism** aesthetic.

### Core user flows
1. **Draft an email** — type a description, choose tone / language / length, pick a suggestion chip, click *Generate Email*.
2. **View the result** — the generated email is shown in the middle panel with a one-click *Copy to clipboard*.
3. **Browse history** — the last 5 generations appear in the right rail; *View all* opens a full-screen overlay sorted by recency.
4. **Reset / start over** — *New Generation* in the navbar clears the form.
5. **Toggle dark mode** — manual `.dark` class toggle on the root `<html>` (no persistence).

---

## 2. Tech Stack

| Layer            | Technology                                    | Version  |
|------------------|-----------------------------------------------|----------|
| UI framework     | **React**                                     | 18.3.1   |
| Meta-framework   | **Next.js (App Router)**                      | 16.2.10 (Turbopack) |
| Language         | **TypeScript**                                | ESM      |
| Styling          | **Tailwind CSS** (v4, via `@tailwindcss/postcss`)| 4.1.12   |
| Primitives       | **Radix UI** (headless) + **lucide-react** icons | 1.x / 0.487 |
| Class utilities  | `clsx`, `tailwind-merge`, `class-variance-authority` | 2.1 / 3.2 / 0.7 |
| Package manager  | **npm**                                       | —        |

> Note: many shadcn-style components are present under `src/app/components/ui/` but the active dashboard only consumes `Button`, `Textarea`, `Select`, and `Badge`. 

---

## 3. Project Structure

```
BreezeMail Ai/
├── app/
│   ├── layout.tsx                # Next.js root layout, sets html/body & imports CSS
│   └── page.tsx                  # Next.js client wrapper for <App />
├── package.json                  # npm scripts: dev / build / start
├── postcss.config.mjs            # Tailwind v4 PostCSS configuration
├── next.config.ts                # Next.js config
│
└── src/
    ├── app/
    │   ├── App.tsx               # Top-level state, view switcher, layout
    │   ├── types.ts              # EmailContent, HistoryItem, ViewName + helpers
    │   └── components/
    │       ├── BackgroundLayer.tsx   # Fixed full-bleed bg + dark overlay
    │       ├── Navbar.tsx            # Logo pill + 3 action buttons
    │       ├── EmailInputPanel.tsx   # Form: description + tone/lang/length + chips
    │       ├── GeneratedEmailPanel.tsx  # Renders current email + sources chips + Copy
    │       ├── HistoryPanel.tsx      # Last 5 history items + "View all"
    │       ├── TipsPanel.tsx         # Mint lightbulb callout
    │       ├── HistoryView.tsx       # Full-screen overlay, sorted list
    │       └── ui/                    # shadcn primitives
    ├── styles/
    │   ├── index.css             # Aggregator: fonts + tailwind + theme
    │   ├── fonts.css             # Google Fonts: Inter, Plus Jakarta Sans
    │   ├── tailwind.css          # @import 'tailwindcss'; .glass-edge component
    │   └── theme.css             # :root / .dark CSS variables (oklch palette)
```

---

## 4. Architecture

### 4.1 Component hierarchy
```
<App>
 ├─ <BackgroundLayer />                              (fixed, -z-10)
 ├─ Wrapper (px-4 sm:px-6, flex column, min-h-screen xl:h-screen)
 │   ├─ <Navbar />                                   (logo pill + right action pill)
 │   └─ <main>                                       (3-col grid on xl, 1-col otherwise)
 │       ├─ <EmailInputPanel />                      (col 1)
 │       ├─ <GeneratedEmailPanel />                  (col 2)
 │       └─ <div>                                    (col 3)
 │           ├─ <HistoryPanel />                     (top)
 │           └─ <TipsPanel />                        (bottom)
 ├─ {view === "history" && <HistoryView items onBack />}   (full-screen overlay)
 └─ <style dangerouslySetInnerHTML>                  (custom-scrollbar CSS)
```

### 4.2 State management
- **100% local component state** via `useState` / `useCallback` / `useEffect` in `App.tsx` (marked `"use client"`).
- No Redux, Zustand, Context, or router library is used for application state.
- **Routing** is a single `view: "dashboard" | "history"` enum in `App.tsx`; the History overlay is conditionally rendered.
- **Dark mode** is a class toggle on `document.documentElement` driven by `useEffect` watching `isDark`. No `localStorage` persistence.
- **History** is a `useState<HistoryItem[]>` prepended on each successful generation; sorted by `timestamp` in `HistoryView`.

### 4.3 Data shapes (`src/app/types.ts`)
```ts
interface EmailContent {
  subject: string;
  greeting: string;
  paragraphs: string[];
  bullets: string[];
  signOff: string;
  sources?: { id: string; title: string }[];
}

interface HistoryItem {
  id: string;
  title: string;
  time: string;
  timestamp: number;
  email: EmailContent;
}
```

### 4.4 Email generation
`handleGenerate` in `App.tsx` hits the `POST /api/generate` route.
- An `AbortController` handles timeouts and cancellation if the user clicks generate repeatedly.
- Loading and Error states are passed down as props to `<EmailInputPanel />` and `<GeneratedEmailPanel />`.

### 4.5 Layout & responsiveness
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.
- **Mobile (< 640px):** single column, cards stack, page scrolls.
- **Tablet (640 – 1279px):** single column, page scrolls.
- **Desktop (≥ 1280px / `xl`):** 3-column grid `[1fr_1fr_0.85fr]`, fixed viewport height with internal scroll via unbroken `min-h-0` constraint chains down to the panels.
- **Horizontal-overflow safety:** the root wrapper carries `overflow-x-hidden`, and grid items in `EmailInputPanel` carry `min-w-0` so Radix `Select` can't push the grid wider than the viewport.

---

## 5. Design System

### 5.1 Glassmorphism — the `.glass-edge` component
Defined in `src/styles/tailwind.css`. It is a two-pseudo-element stack (`::before` ring + `::after` interior glow) mimicking real glass depth.

### 5.2 Background
`BackgroundLayer.tsx` is a `fixed inset-0 -z-10` layer with the leafy PNG and a `bg-black/40` overlay that activates in `.dark`.

---

## 6. Build & Run

```bash
npm install
npm run dev
npm run build
```

---

## 7. Constraints & Lessons Learned

- **Next.js Server Components vs Client Components:** Because the app is heavily stateful, almost all components in `src/app` must carry the `"use client";` directive at the top of the file to preserve interactivity (hooks and event handlers).
- **Flexbox Heights:** On desktop, achieving internal scroll inside the glass panels requires an unbroken chain of `min-h-0` and `flex-1`/`h-full` attributes extending all the way from the `xl:h-screen` root down to the scrollable container. Without it, flex children will expand to fit their content and ruin the layout.
- **Radix Select + Tailwind grid**: always pair `min-w-0` on grid items and `w-full min-w-0` on the trigger, otherwise `whitespace-nowrap` lets the trigger blow the grid past the viewport.
