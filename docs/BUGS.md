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

> No bugs yet — project not started.

---

## Fixed Bugs

> Empty — no releases yet.

---

## Known Limitations (not bugs)

These are known issues that are accepted as limitations of the current phase:

| ID | Description | Phase when fixed |
|---|---|---|
| L-001 | Import is synchronous — large files may time out | Phase 2 (BullMQ) |
| L-002 | File storage is local — not suitable for multi-instance deployment | Phase 2 (S3) |
| L-003 | Track/car names may be wrong if not in alias table | Phase 6 (admin panel) |
| L-004 | No email notifications on import completion | Phase 3 |
| L-005 | Parser may miss fields if LMU XML format varies between versions | Ongoing |
