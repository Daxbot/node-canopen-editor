# Style & Coding Guide

Design and coding preferences established in this project, for reference in future work.

The style we are aiming for with Dax Tooling is futuristic Sci-Fi, bordering on FUI, with a hint of retro. We want to create a unique look and feel that sets Dax Tooling apart from other applications. The style is primarily a dark-mode style, so the background and foreground colors are darker than typical, and the fonts are slightly muted.

This style borrows from such as

Oblivion

Supreme Commander

Tron



---

## Color Palette

All colors are CSS custom properties on `:root`. Always define new colors as variables — never hard-code hex values outside of `styles.css`.

| Variable | Value | Usage |
|---|---|---|
| `--bg-primary-color` | `#000000` | Page/body background |
| `--bg-secondary-color` | `#080E10` | Nav bar, card backgrounds, section containers |
| `--fg-primary-color` | `#18242B` | Elevated surfaces (modal body, inputs) |
| `--filterbar-color` | `#0D161A` | Sidebar/drawer background |
| `--font-primary-color` | `#FFFFFFE5` | Primary text (slight transparency) |
| `--font-secondary-color` | `#6FBDCCCC` | Teal accent — borders, active states, hover highlights |
| `--font-terciary-color` | `#ccc36f` | Amber accent, use sparingly |
| `--font-muted` | `#ffffff85` | Secondary text (timestamps, labels, empty states) |

Dark theme only.

---

## Typography

- **Default font**: `scifi` (Jura variable font). Applied globally via `body { font-family: scifi; }`.
- Font sizes:
  - Page/section headings: `1.1–1.3rem`, `font-weight: 600`, `letter-spacing: 0.03em`
  - Card titles / body: `1rem`, `font-weight: 600`
  - Secondary text: `0.85rem`
  - Meta / labels: `0.72–0.75rem`

---

## Cards & Panels

```css
background: var(--bg-secondary-color);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 8px;
padding: 16px 18px;
```

- Section dividers: `border-bottom: 1px solid rgba(255,255,255,0.08)`
- Structural separators: `rgba(255,255,255,0.07)`
- Never use solid opaque borders on dark chrome.

---

## Buttons

Custom button class (e.g. `.job-mgmt-btn`), not Bootstrap defaults:

```css
background: var(--bg-secondary-color);
color: var(--font-primary-color);
border: 1px solid rgba(255,255,255,0.2);
border-radius: 5px;
padding: 7px 16px;
font-size: 0.875rem;
cursor: pointer;
transition: border-color 0.15s, background 0.15s;

/* Hover */
border-color: var(--font-secondary-color);
background: var(--fg-primary-color);
```

**Variants:**
- **Primary** — teal border + teal text; hover background `rgba(111,189,204,0.12)`
- **Danger** — border `rgba(248,113,113,0.4)`, text `#f87171`; hover border `#f87171`, background `rgba(248,113,113,0.12)`

Bootstrap's `.btn-primary` is overridden globally to match the dark theme.

---

## Inputs & Forms

- Transparent background; bottom border only (no left/right/top).
- No `outline` on focus — change `border-color` to `var(--font-primary-color)` instead.
- Invalid state: `outline: 2px solid red; border-radius: 5px`
- Form group spacing: `margin-top: 20px; margin-bottom: 15px`
- Neutralize autofill white-flash with a long CSS transition reset on `-webkit-autofill`.
- Date/time picker icons: `filter: invert(1)` to match dark theme.

---

## Layout

- Always **flexbox** — never CSS grid.
- Card grids: `display: flex; flex-wrap: wrap; gap: 14px; padding: 16px; align-content: flex-start`
- Vertical lists: `display: flex; flex-direction: column; gap: 12px`
- Page containers fill available height with `overflow-y: auto` internally.
- Use Bootstrap utility classes (`d-flex`, `align-items-center`, `gap-2`, etc.) for layout, but override all Bootstrap colors with CSS variables.

---

## Sidebar / Drawer

- Fixed width (e.g. 260px), `position: absolute`, `z-index: 200`.
- Hidden: `transform: translateX(-100%)` → shown: `transform: translateX(0)`, `transition: 0.25s ease`.
- Backdrop behind content: `rgba(0,0,0,0.5)`, `backdrop-filter: blur(1px)`, `z-index: 199`.
- Right border: `1px solid rgba(255,255,255,0.1)`.
- Box shadow: `4px 0 24px rgba(0,0,0,0.5)`.

---

## Overlays

- Bottom-of-card info gradient: `linear-gradient(transparent, rgba(0,0,0,0.78))`
- Full-screen status overlay: `background: rgba(0,0,0,0.7)`, centered flex column.
- Toast/pill badge: `background: rgba(0,0,0,0.65)`, `border-radius: 20px`, `border: 1px solid rgba(255,255,255,0.25)`.

---

## Transitions

| Context | Value |
|---|---|
| Color / border hover | `0.15s` |
| Sidebar slide | `0.25s ease` |
| Modal backdrop | `0.3s ease-in-out` |

---

## Scrollbars (WebKit)

Rounded pill thumb, padded track:

```css
::-webkit-scrollbar-thumb {
    border: 8px solid transparent;
    background-clip: padding-box;
    border-radius: 9999px;
    background-color: #8F9293;
}
::-webkit-scrollbar-track {
    background-color: #202627;
    border-radius: 9999px;
    border: 8px solid transparent;
    background-clip: padding-box;
}
```

---

## CSS Naming Conventions

- **Class names**: kebab-case (`.job-card`, `.job-card-name`, `.stream-link-info`)
- **Flat BEM-ish structure**: parent-child naming without `__` — e.g. `.job-card`, `.job-card-top`, `.job-card-actions`
- One CSS file per component — see framework section below for how to import it.
- Never use inline styles for theming; reserve inline styles for one-off layout values that don't belong in a shared class.

---

## General UI Preferences

- Always set `cursor: pointer` explicitly on interactive elements.
- Use `user-select: none` on buttons and clickable cards.
- Row/item hover: shift text to `var(--font-secondary-color)`, background to `var(--bg-secondary-color)`.
- Prefer `rgba(255,255,255, x)` for borders and separators on dark backgrounds over gray hex values.
- Empty states and loading states should use `var(--font-muted)` centered text.

---

## JavaScript Conventions

These apply regardless of framework:

- **One file per component/class**, exported at the bottom.
- **Async**: `async/await` throughout. Avoid raw `.then()` chains.
- **String building**: Template literals for dynamic strings. Always escape user-supplied values before inserting into HTML.

---

## If using the React framework

### JavaScript Conventions

- **Modules**: ES Modules — `import` / `export default ComponentName`.
- **Components**: Functional only — no class components.
- **CSS imports**: CSS Modules — `import styles from './MyComponent.module.css'`, apply as `styles.my-class`.
- **Timers**: Return a cleanup function from `useEffect` — `return () => clearInterval(timer)`.
- **DOM**: Avoid direct DOM manipulation; use React refs (`useRef`) only when necessary (e.g. canvas, media elements).
- **String building**: Escape user content by passing values as JSX children or `textContent`, not `innerHTML`.

### Component Structure

- Each component lives in its own folder with a `.jsx` file and a `.module.css` file.
- Shared/reusable components go in `src/components/`, page-level components in `src/pages/`.
- Page components are responsible for data fetching; presentational sub-components receive data as props.
- Routing is handled by React Router v6 — add a `<Route>` in `App.jsx`.
- Modals are components rendered via a portal or conditional render; pass content as JSX children.
- Use `useState` + `useEffect` for local state and side effects. Use TanStack Query for server data (fetching, polling, caching).
- For real-time data (socket.io), set up the listener in `useEffect` and return a cleanup that removes it.

### Project Structure

```
webapp/
├── index.html             # Vite entry HTML
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx           # App entry point — mounts <App />
│   ├── App.jsx            # React Router route definitions
│   ├── index.css          # Global CSS variables, resets, typography, scrollbars
│   ├── pages/             # One folder per route/page
│   │   └── MyPage/
│   │       ├── MyPage.jsx
│   │       ├── MyPage.module.css
│   │       └── components/    # Page-local components
│   │           └── MyWidget/
│   │               ├── MyWidget.jsx
│   │               └── MyWidget.module.css
│   └── components/        # Shared/reusable components
│       └── Modal/
│           ├── Modal.jsx
│           └── Modal.module.css
└── public/                # Static assets (fonts, images)
```

**Build system**: Vite. Entry point is `src/main.jsx`.

```bash
npm run dev      # dev server with HMR
npm run build    # production build → dist/
```

Output goes to `dist/`. Served statically by the Node server.

**Adding a new page:**
1. Create `src/pages/MyPage/MyPage.jsx` and `MyPage.module.css`.
2. Add a `<Route path="/my-page" element={<MyPage />} />` in `App.jsx`.
3. Add a nav link in the nav component.

**Key shared components** (in `src/components/`):
- `Modal` — dark-themed modal, accepts JSX children.
- `ContextMenu` — right-click menu.
- `Searchbar`, `DropdownFilter`, `RadioFilter`, `CheckboxFilter` — filter controls.

**CSS variables** are defined in `src/index.css` on `:root` — the same palette as the rest of this guide. All component `.module.css` files reference them via `var(--name)`.

