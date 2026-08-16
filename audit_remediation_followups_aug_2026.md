# Whole-Site Audit Remediation — External Follow-Ups

The code and content safeguards implemented from the August 16 audit are ready for production validation. The following items require an owner action, external-account access, or Tennessee counsel review and should not be represented as completed until independently verified.

| Follow-up | Why it needs external action | Owner action |
| --- | --- | --- |
| Toll-free SMS verification | U.S. carrier delivery remains blocked until Twilio approves the pending verification filing. | Watch for Twilio’s approval or rejection email; after approval, request a fresh two-phone delivery test. |
| Google Business Profile and Bing Places facts | Profile categories, phone, address, hours, and service areas live in third-party accounts. | Compare each field against `local_profile_facts_sheet.md`; do not publish an unapproved private address. |
| Verified review visibility | The site intentionally shows only live Google reviews from the connected profile. | Resolve the Place ID/listing issue and verify that eligible reviews are available before expecting review cards to populate. |
| AI visibility measurement | AI answer sampling is volatile and should not be treated as a search ranking. | Review a weekly three-run median beside Search Console, Bing AI Performance, Google Business Profile actions, and qualified organic leads. |
| Privacy policy | The site policy is a legal-review draft. | Have Tennessee counsel review the disclosure and messaging language before relying on it as final legal policy. |
| Payment reconciliation | Stripe webhook ledger now records idempotent processing and retriable exceptions. | Review any reconciliation exception in Operations and compare settlement status in the Stripe Dashboard. |

## Pricing Intelligence Operating Rule

Pricing research now produces review-only suggestions. It must not change approved private AI Pricing settings or set a quote by itself. Review each suggested service unit, direct source link, actual job cost, margin, travel, density, terrain, access, and property conditions before approving it. A site visit and written proposal remain the final control.
