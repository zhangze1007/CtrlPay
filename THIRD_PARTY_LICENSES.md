# Third-Party Licenses — CtrlPay

CtrlPay is a sandbox for the **2026 Shenzhen FinTechathon (Topic A)**. This file lists the
third-party packages it depends on and their licenses, to satisfy the competition's
**anti-plagiarism / asset-compliance** requirement (see `SECURITY_REPORT.md` §10.3).

All licenses below are **permissive (MIT / Apache-2.0 / ISC)**. No copyleft (GPL/AGPL)
dependency is used. Version numbers reflect the pinned/installed versions at the time of
submission; the authoritative ranges are in `package.json`.

## Runtime dependencies

| Package | Version | License | Purpose |
|---|---|---|---|
| `ai` | 4.3.19 | Apache-2.0 | Vercel AI SDK core (streaming, tools) |
| `@ai-sdk/react` | 1.2.12 | Apache-2.0 | `useChat` React hook |
| `zod` | 3.25.76 | MIT | Strict schema validation (tool I/O, proposals) |
| `next` | 14.2.35 | MIT | React framework (App Router) |
| `react` | 18.3.1 | MIT | UI runtime |
| `react-dom` | 18.3.1 | MIT | DOM renderer |
| `zustand` | 4.5.7 | MIT | Reactive sandbox state store |
| `framer-motion` | 11.18.2 | MIT | Vault / funds-movement transitions |
| `lucide-react` | 0.454.0 | ISC | Icon set |
| `clsx` | 2.1.1 | MIT | Conditional class names |
| `tailwind-merge` | 2.6.1 | MIT | Tailwind class de-duplication |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | Component variant API |

## Development dependencies

| Package | Version | License | Purpose |
|---|---|---|---|
| `typescript` | 5.9.3 | Apache-2.0 | Type checking (`strict`) |
| `@types/node` | 20.19.43 | MIT | Node type definitions |
| `@types/react` | 18.3.31 | MIT | React type definitions |
| `@types/react-dom` | 18.3.7 | MIT | React DOM type definitions |
| `tailwindcss` | 3.4.19 | MIT | Utility-first CSS |
| `tailwindcss-animate` | 1.0.7 | MIT | Animation utilities |
| `postcss` | 8.5.30 | MIT | CSS transform pipeline |
| `autoprefixer` | 10.6.1 | MIT | Vendor prefixing |
| `eslint` | 8.57.1 | MIT | Linting |
| `eslint-config-next` | 14.2.35 | MIT | Next.js ESLint rules |
| `vitest` | 2.1.9 | MIT | Unit test runner |

## Assets & data

- **Icons:** [Lucide](https://lucide.dev) — **ISC license**. Used via `lucide-react`.
- **Fonts:** system font stack only; **no third-party webfonts are loaded** (also enforced by the CSP `font-src 'self' data:`).
- **Images / illustration:** none bundled. The UI is composed from CSS/Tailwind primitives.
- **Merchant names** (Netflix, Spotify, Disney+, YouTube, Anytime Fitness, Grab, Shopee, iCloud…) appear **only as descriptive labels for mock data**. **No merchant logos, trademarks or brand assets are included.**
- **Sandbox datasets** (`lib/mock-data.ts`) are **generated / hand-authored and 100 % original** (deterministic seeded PRNG; no real personal data).
- **Behance UI links** were used for **high-level visual inspiration only**; no layouts, assets or illustrations were copied.

## Verifying licenses yourself

```bash
# Inspect a package's declared license
node -e "console.log(require('./node_modules/<package>/package.json').license)"

# Confirm the AI SDK stays on v4 (no v5 identifiers, correct pins)
npm run verify:sdk-version
```
