---
marp: true
paginate: true
size: 16:9
theme: default
header: 'CtrlPay · 2026 Shenzhen FinTechathon · International Track · Topic A'
footer: 'Sandbox demo · No real funds move'
---

<style>
  :root { --brand: #0b1f33; --accent: #18a67a; --warn: #e8a33d; }
  section { font-family: 'Outfit', 'Inter', sans-serif; background: #fbfbfd; color: var(--brand); }
  h1 { font-size: 54px; letter-spacing: -1.5px; }
  h2 { color: var(--brand); font-size: 38px; }
  strong { color: var(--accent); }
  .lead { font-size: 26px; line-height: 1.35; }
  .small { font-size: 19px; color: #536170; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .card { background: #fff; border: 1px solid #e6e9ee; border-radius: 18px; padding: 22px 26px; box-shadow: 0 8px 30px rgba(11,31,51,.06); }
  .tag { display: inline-block; background: #e8f7f1; color: #087a57; border-radius: 999px; padding: 6px 14px; font-size: 18px; font-weight: 700; }
  .quote { font-size: 30px; line-height: 1.35; border-left: 6px solid var(--accent); padding-left: 24px; }
  code { background: #eef2f6; border-radius: 6px; padding: 2px 6px; }
</style>

# Stop Paying Blindly.
# Let AI Control the Flow.

**CtrlPay — a proactive, defensive personal-finance agent for students**

Topic A · Personal Finance Assistant
2026 Shenzhen FinTechathon · International Track

<span class="tag">Live: ctrlpay-new-bee4.vercel.app</span>

---

## The problem is not *knowing*. It is *the moment before paying*.

<div class="cols">
<div>

Most budgeting apps are **rear-view mirrors**:

- They show what already left the account.
- They warn after the damage.
- They add another dashboard to ignore.

</div>
<div class="card">

### The student reality

- RM 1,800 monthly income
- Rent + bills + food are fixed
- One RM 180 impulse buy can create a month-end shortfall
- Subscriptions renew silently

</div>
</div>

<p class="quote">CtrlPay intervenes <strong>before</strong> the money moves.</p>

---

## One loop: receipt → insight → recommendation → action

<div class="cols">
<div class="card">

### 1. Sense

- OCR a receipt
- Read a payment intent
- Detect a subscription charge
- Advance the sandbox clock

</div>
<div class="card">

### 2. Decide

- Deterministic CFaR engine
- Shortfall probability + expected shortfall
- Needs vs wants
- Budget and mandate limits

</div>
</div>

<div class="cols" style="margin-top:26px">
<div class="card">

### 3. Advise

Groq-hosted GPT-OSS 120B turns **already-computed risk** into plain-English, non-judgmental advice.

</div>
<div class="card">

### 4. Act

Signed T3 contract card:
**Approve · Modify · Decline**

</div>
</div>

---

## Live AI, with a hard boundary

<div class="cols">
<div>

### Language brain

`app/api/chat` + `lib/groq-client.ts`

- Groq Chat Completions
- `openai/gpt-oss-120b`
- Extracts intent and identifiers
- Writes the explanation

</div>
<div>

### Arithmetic brain

`lib/quant-engine.ts`

- Every RM figure
- Every probability
- Every recommendation threshold
- Pure, deterministic TypeScript

</div>
</div>

<p class="quote">The model never computes money. The server signs every proposal with HMAC-SHA256.</p>

<p class="small">If the provider is unavailable, the API returns <code>503</code> — it never fabricates a “safe” answer.</p>

---

## Real interception, not a mock warning

<div class="cols">
<div>

### Payment interceptor

A Shopee **RM 180** want is flagged:

- CFaR and shortfall probability
- Projected month-end balance
- Daily safe allowance
- A separate, live AI advice card

</div>
<div>

### Receipt scanner

The synthetic demo receipt is **LUXE WATCH GALLERY · RM 899**:

- Tesseract extracts the fields
- Groq reviews amount, merchant and budget impact
- A real warning pop-up opens
- The user can edit before logging

</div>
</div>

<p class="small">Screenshots: <code>docs/evidence/production-payment-ai-advice.jpeg</code> · <code>docs/evidence/production-ocr-ai-warning.jpeg</code></p>

---

## Security is the product, not a slide

<div class="cols">
<div>

### Authority

- Master Switch **default OFF**
- T0–T3 permission tiers
- T3 requires a per-action click + passkey ref
- Signed, expiring proposals

</div>
<div>

### Evidence

- HMAC-SHA256 proposal signatures
- Hash-chained audit log
- PII redaction before the LLM
- Post-generation RM number verifier
- Strict CSP, no third-party scripts

</div>
</div>

<p class="quote">The LLM proposes. The engine computes. The human authorizes. The audit chain proves it.</p>

---

## Judge demo in 5 minutes

1. Open the public URL — no login, fresh synthetic student.
2. Trigger **Simulate Shopee RM 180** → deterministic CFaR + live AI advice.
3. Open **Scan receipt** → watch the LUXE WATCH warning pop-up.
4. Approve a T3 contract with a click + passkey → show the signed proposal and audit entry.
5. Turn the Master Switch OFF → repeat T3 → show the **BLOCKED** audit record.

<p class="small">Full script: README.md → “5-minute demo script”</p>

---

## Why this is different

<div class="cols">
<div class="card">

### Defensive by design

Not another spend tracker. A **pre-payment interceptor** with deterministic risk and a human decision.

</div>
<div class="card">

### AI where it helps

Language for explanation and extraction. Arithmetic for money. A clean, auditable boundary.

</div>
</div>

<div class="cols" style="margin-top:26px">
<div class="card">

### Built for the sandbox

Reproducible clock, seeded simulations, testable engine, labelled ledger buckets.

</div>
<div class="card">

### Built for trust

Every action leaves a reason-coded, hash-chained trail.

</div>
</div>

---

## What is working today

- Public production deployment: **200 OK**
- Live Groq-backed chat, OCR advisory, payment advice
- Self-hosted Tesseract OCR (no third-party runtime requests)
- 260+ automated tests, strict TypeScript, production build
- Deterministic execution evidence and security self-assessment

<p class="quote">Try it: <strong>ctrlpay-new-bee4.vercel.app</strong></p>

<p class="small">Source: github.com/zhangze1007/Yi-HUi · Docs: docs/TECHNICAL_DOCUMENTATION.md · SECURITY_REPORT.md</p>

---

## Roadmap after the hackathon

- Real bank/webhook integrations behind explicit consent
- Durable, tenant-scoped proposal store and WORM audit anchoring
- Strong authentication, device binding and step-up biometrics
- On-device OCR and a privacy-preserving model router

<br>

# Thank you.

**CtrlPay — Stop Paying Blindly. Let AI Control the Flow.**
