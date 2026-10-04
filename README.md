# TalentFlow (تالنت فلو) — BUILDx demo

Live demo: https://fanciful-choux-ca144a.netlify.app

## What is inside
- `site/`   The finished website. Upload this folder to any static host (Netlify Drop, Vercel, GitHub Pages).
            Start page: `index.html` (landing + pricing). The app opens from the "جرّب العرض" button (`app.html`).
- `source/` The full project (React + TypeScript + Tailwind + Vite).

## Run the source
    cd source
    npm install
    npm run dev      # local preview
    npm run build    # writes the site to source/dist
    npm test         # scoring checks

## What the demo shows
- Landing page: product preview, about, 3 pricing plans (FlowStart, FlowGrow, FlowScale) with a 3-month free trial.
- App, manager view: overview, candidate ranking, candidate detail, vacancy chain, decision comparison,
  behavioral readiness (list, profile, individual development analysis, rating form).
- App, employee view (Ahmad): readiness, development plan, behavioral profile.
- Arabic (RTL) by default, English toggle, desktop / mobile preview switch.

## Notes
- All data is fictional and lives in `source/src/app/lib/demo-data.ts` and `behavior.ts`. No backend, no sign-in.
- Editable assumptions (time, cost, failed-promotion cost): `source/src/app/lib/assumptions.ts`.
- The "AI" suggestions in the rating form are keyword rules, not a real model. Scores come from declared weights.
- Pricing figures are sample numbers.
