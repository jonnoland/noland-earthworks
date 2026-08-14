# Lean Native Operations Stack — Source of Truth

## Decision

The Noland Earthworks operations dashboard is the authoritative record for **clients, site-visit requests, leads, quotes, jobs, invoices, deposits, and final payment status**. A client or job must be updated in this system before any optional external bookkeeping or field-service copy is made.

| Record | Authoritative native record | Required operating fields |
| --- | --- | --- |
| Client | `native_clients` | Contact information, address, first-contact source |
| Site-visit request and quote | `native_quotes` | Source, fit decision, next action/due time, visit status, proposal status, deposit status, final-payment status |
| Job | `native_jobs` | Linked quote, schedule, completion, invoiced and paid amounts |
| Invoice | `native_invoices` | Linked job/quote, sent status, due date, paid status |
| Lead context | `ops_leads` | Inquiry details, qualification notes, linked native quote |

## Daily Rule

Open **Today’s Next Actions** at the beginning of the workday. Complete or reschedule the listed lead, visit, proposal, deposit, weather, invoice, and review actions before opening secondary tools. An open record without a next action or an explicit closed decision is incomplete.

## Jobber Policy

Jobber is **not** synchronized by default. It may be added back only if it is required for a documented function that the native stack cannot reliably perform, such as a contractual customer portal requirement, accounting workflow, or a customer-mandated integration. Before any synchronization is enabled, define one-way versus two-way ownership, conflict behavior, deletion behavior, event logging, and an approval step. The native record remains the source used for daily operation and reporting unless Jon explicitly changes this decision.
