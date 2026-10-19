# Optional demo screenshots

This folder is **optional**. The submission intentionally does **not** claim a user survey — the
security rationale in [`../../SECURITY_REPORT.md`](../../SECURITY_REPORT.md) §10.2 is qualitative
(privacy-by-default) and no sample size or willingness percentage is fabricated.

If the team wants to add screenshots before submitting, capture them from the running sandbox
(`npm run dev` or the deployed URL) and reference them from the deck / report:

| File (suggested) | What it should show |
|---|---|
| `dashboard.png` | Home tab with the currency switcher, balance, canteen-meal equivalent, Defense Vault |
| `backtap.png` | Back-Tap quick-log modal with the live Dynamic Daily Allowance preview |
| `intercept.png` | Payment intercept modal with CFaR shortfall probability |
| `passkey.png` | FIDO2 / Face ID gate (locked status-bar icon) |
| `cancel-sheet.png` | Assisted cancellation sheet: whitelisted deep link + in-app email preview |
| `sweep.png` | Zombie Radar → PendingSweep verification after the next billing date |
| `audit-drawer.png` | Audit Drawer with `data_accessed`, `authorization_ref` and the chain-verified badge |

> Do **not** commit fabricated survey data or invented numbers. The repository is judged on the
> working sandbox, tests and the deterministic evidence artifacts under `docs/`.
