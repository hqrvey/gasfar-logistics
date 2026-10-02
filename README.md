# GASFAR

React + [Vite](https://vite.dev) app (migrated from Create React App).

## Scripts

```bash
npm install
npm run dev       # dev server  -> http://localhost:3000
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
```

## Structure

```
index.html          Vite entry (project root, not public/)
vite.config.js
public/             static files served as-is (favicon, robots.txt)
src/
├── main.jsx        mounts <App />
├── App.jsx         ALL components + routes in one file
├── App.css         ALL styles in one file
└── assets/logos/   logo images imported by App.jsx
```

`App.jsx` is organised in labelled sections (`/* ═══ ComponentName ═══ */`), in
dependency order: UI primitives → layout → pages → routes. Search for the
banner name to jump to a component.

## Mock login credentials

| Role   | Username | Password    |
|--------|----------|-------------|
| User   | `user`   | `user123`   |
| Driver | `driver` | `driver123` |

## Notes

- `leaflet` and `react-leaflet` are dependencies (used by the map picker).
- Routes use `BrowserRouter`. For production hosting, configure your server to
  fall back to `index.html` for unknown paths (SPA fallback).
