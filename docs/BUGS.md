# UrApex — Bug Tracker

> Known bugs, regressions, and unexpected behaviors.
> Each bug has a severity, status, and reproduction steps.
> Update this file as bugs are found and fixed.

---

## Severity Levels

| Level | Meaning |
|---|---|
| **Critical** | Breaks core functionality, data loss, security issue |
| **High** | Major feature broken, no workaround |
| **Medium** | Feature broken, workaround exists |
| **Low** | Visual glitch, minor inconvenience |

## Status

| Symbol | Status |
|---|---|
| 🔴 | Open |
| 🟡 | In progress |
| ✅ | Fixed |
| ❌ | Won't fix / By design |

---

## Bug Template

```
### BUG-XXX — Short title

**Severity:** Critical / High / Medium / Low
**Status:** 🔴 Open
**Reported:** YYYY-MM-DD
**Fixed in:** (version or PR)
**Affected:** Page / Feature / Module

#### Description
What is happening vs what should happen.

#### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

#### Expected
What should happen.

#### Actual
What actually happens.

#### Notes
Root cause if known. Related code paths. Potential fix.
```

---

## Open Bugs

> No confirmed bugs at this time. Report issues via GitHub Issues.

---

## Fixed Bugs

> See [CHANGELOG.md](CHANGELOG.md) for what was fixed in each release.

---

## Known Limitations (not bugs)

These are known issues that are accepted as limitations of the current phase:

| ID | Description | Phase when fixed |
|---|---|---|
| L-001 | ~~Import is synchronous — large files may time out~~ | ✅ Fixed in 0.19.0 (BullMQ) |
| L-002 | ~~File storage is local — not suitable for multi-instance deployment~~ | ✅ Fixed in 0.20.0 (S3/R2) |
| L-003 | Track/car names may be wrong if not in alias table | Phase 6 (admin panel) |
| L-004 | No email notifications on import completion | Phase 3 |
| L-005 | Parser may miss fields if LMU XML format varies between versions | Ongoing |
| L-006 | Vercel Cron import fallback has ~1 min latency vs instant on persistent runtimes | By design |
| L-007 | `.vcr` replay files cannot be visualised in-browser (proprietary binary format) | Phase 4+ if format is documented |
