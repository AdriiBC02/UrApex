# UrApex — Monetization Strategy

> This document outlines the monetization approach for UrApex.
> Monetization is Phase 8. The MVP and Phase 1–7 are not gated by billing.
> Architecture must not block future monetization but must not implement it prematurely.

---

## Principles

1. **Never block the core value loop.** Importing and viewing sessions must always work on the free tier.
2. **Premium features enhance, not withhold.** Free users get real value. Pro users get more depth.
3. **Transparent limits.** Users always know what their limits are before hitting them.
4. **Easy upgrade path.** One click from a limit to the upgrade page.
5. **Charge for AI separately.** AI costs are variable — use a credit system, not unlimited.

---

## Plan Structure

### Free Tier
Target: Sim racers who want to try before committing.

| Feature | Limit |
|---|---|
| Imports per month | 10 |
| Session history | Last 90 days |
| Driver scores | Consistency + Safety only |
| Goals | 5 active |
| Setups | 10 |
| AI coach credits | 5 per month |
| File storage | 500MB |
| Teams | View only (invited) |
| Community profile | No |
| Data export | No |

**Free tier philosophy:** Enough to understand the value, not enough to replace dedicated tools.

---

### Pro Tier — €8/month or €72/year
Target: Serious sim racers who race regularly.

| Feature | Limit |
|---|---|
| Imports per month | Unlimited |
| Session history | Unlimited |
| Driver scores | All 8 scores |
| Goals | Unlimited |
| Setups | Unlimited + versioning |
| AI coach credits | 30 per month |
| File storage | 20GB |
| Teams | Create teams (up to 3) |
| Community profile | Yes |
| Data export | Yes (CSV + JSON) |
| Priority support | Yes |
| Early access features | Yes |

---

### Team Tier — €25/month (5 seats) or €200/year
Target: Sim racing teams, leagues, communities.

| Feature | Limit |
|---|---|
| Everything in Pro | Per member |
| Team members | 5 included, +€4/extra |
| Team dashboard | Yes |
| Discord webhook | Yes |
| Shared setups | Yes |
| Driver comparison | Yes |
| Team AI analysis | 100 credits/month shared |

---

### AI Credits (à la carte)
- 50 credits: €5
- 150 credits: €12
- 500 credits: €35

Credit usage:
- Quick analysis: 1 credit
- Deep session analysis: 3 credits
- Training plan generation: 5 credits
- Full conversation: 1 credit per exchange

---

## Pricing Rationale

| Anchor | Reasoning |
|---|---|
| €8/month Pro | < cost of one cheap sim racing game. Less than iRacing membership. |
| €72/year | 25% discount vs monthly. Reduces churn. |
| €25/month Team | 3× Pro price for 5 seats = < €5/seat. Very competitive. |

---

## Revenue Projections (Rough)

| Metric | Month 6 | Month 12 | Month 24 |
|---|---|---|---|
| Free users | 200 | 800 | 3000 |
| Pro conversion | 5% | 8% | 10% |
| Pro users | 10 | 64 | 300 |
| Team plans | 2 | 8 | 30 |
| Monthly MRR | €80 | €512 + €200 | €2400 + €750 |

**Break-even estimate:** ~100 Pro users covers server costs (~€800/month for Neon DB + Vercel Pro + R2 + Claude API).

---

## Infrastructure Costs at Scale

| Service | Cost estimate |
|---|---|
| Vercel Pro | €20/month |
| Neon PostgreSQL | €0–25/month (free tier → pro) |
| Cloudflare R2 | ~€0.015/GB stored + free egress |
| Claude API (AI Coach) | ~€0.015 per analysis (claude-haiku) to €0.15 (claude-sonnet) |
| Redis (BullMQ) | €0–10/month (Upstash free tier) |
| Email (Resend) | €0 (free tier to 100/day) |

**Total at MVP:** ~€30–50/month with zero users.
**Total at 100 Pro users:** ~€150–200/month, MRR ~€800.

---

## Alternative Monetization Models Considered

### One-Time Lifetime Deal
- Price: €149 (limited to first 200 users)
- Pros: Immediate cash, validation, loyal early adopters
- Cons: Cash flow stops after initial batch, not sustainable long-term
- **Verdict:** Consider for early access phase before Pro launch

### Usage-Based Only (no subscription)
- Pay per import, per analysis, per month active
- Pros: Aligns cost with value
- Cons: Unpredictable for users, hard to plan infrastructure
- **Verdict:** Not suitable for primary model

### Open Source + Self-Hosted + SaaS
- Release the code open source
- Charge for hosted SaaS version
- Pros: Community contributions, trust, visibility
- Cons: Competitors can self-host, support burden
- **Verdict:** Consider for Phase 8+ if community is strong

---

## Implementation Notes (Phase 8)

### Billing Stack
- Stripe for subscriptions and one-time payments
- Stripe Billing Portal for subscription management
- Webhooks to sync subscription state to DB

### Database Changes Needed
```prisma
model SubscriptionPlan {
  id       String @id
  slug     String @unique  // "free" | "pro" | "team"
  name     String
  priceId  String?         // Stripe price ID
}

model BillingCustomer {
  id               String @id
  userId           String @unique
  stripeCustomerId String @unique
  planSlug         String @default("free")
  currentPeriodEnd DateTime?
  aiCreditsLeft    Int     @default(5)
  aiCreditsTotal   Int     @default(5)
}
```

### Usage Enforcement
- Import limits: check `ImportFile` count in current month before processing
- AI credits: decrement on each AI request, reject if 0
- Storage: check total file size before accepting upload
- History cutoff: `Session.sessionDate > NOW() - interval '90 days'` for free tier queries

### Graceful Degradation
- When a limit is hit: clear message + one-click upgrade CTA
- Never silently fail or show confusing errors
- Show remaining credits/imports prominently in relevant UIs

---

## What Monetization Must NOT Do

- Block registration or login
- Delete data when downgrading (hide it, offer export first)
- Show intrusive paywalls mid-flow
- Charge for features that were previously free without notice
- Make the free tier so limited it's useless
