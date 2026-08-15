# Noland Earthworks Privacy Notice — Draft for Legal Review

**Status:** Working draft reflecting the collection and operational practices currently implemented in the Noland Earthworks website and native operations system. This is not legal advice and should be reviewed by Tennessee-appropriate counsel before reliance or any legal/compliance representation.

## Operational Data Map

| Interaction | Information handled | Operational purpose | Current handling path |
| --- | --- | --- | --- |
| Site Visit Request | Name, phone, email, county/address, requested service, size, timing, project message, preferred contact method, project-text acknowledgement when selected | Request review, site-visit planning, lead/client record, native quote workflow | Native operations records; Resend; Twilio; AI-assisted internal organization; hosting/storage |
| General Contact Form | Name, email, optional phone, topic, message | Respond to inquiry and create/update a native inquiry/client record | Native operations records; Resend; owner notification |
| Public AI Chat | Conversation text and voluntarily provided contact details | Answer service questions, organize details, create/update a lead or client record when enough contact detail is supplied | AI service infrastructure; chat record; Resend owner-transcript notification when applicable |
| Subscriber Form | Email address and form source | Occasional seasonal tips and schedule updates | Email-subscriber record and email service; unsubscribe required for marketing use |
| Approved quote or job payment | Customer identity, quote/job reference, invoice/deposit/payment status | Deposit and final-payment collection and reconciliation | Stripe-hosted payment flow; native invoice/payment-status record |

## Required Public Policy Statements

The public policy should identify the contact, property, project, communication, uploaded-material, native operations, payment-status, and website-use data that may be handled. It should state that payment-card details are processed by Stripe and are not intended to be stored in the Noland Earthworks operations system. It should state that the business does not sell or rent personal information and shares information with providers only as needed to operate the applicable function.

The policy should describe AI use plainly: inquiry details and chat text may be processed by AI service infrastructure to organize requests, draft internal materials or proposed communications, support planning, and route work. The owner reviews output before commitments. AI must not be described as independently setting final price, confirming scope, scheduling work, approving discounts, or deciding whether to accept a customer.

## SMS, Email, and Form Notices

The Site Visit Request should require a separate acknowledgement only when a visitor selects text as the preferred project-contact method. The notice should state that messages are project-related, frequency varies, message and data rates may apply, consent is not required to request service, and recipients can reply STOP or HELP. The acknowledgement should be stored with the request.

The public contact form should state that the business uses the submitted details to respond and may create an inquiry/client record. The subscriber form should state that it is a separate optional marketing-email choice, identify the type of messages, link to the policy, and provide a working unsubscribe path before any campaign is sent.

## Provider and System-of-Record Notice

The current stack may use Manus-hosted infrastructure and storage, Resend, Twilio, Stripe, Google Maps, Google Analytics, website analytics services, and AI service infrastructure. The native Noland Earthworks operations system is the working source of truth for clients, leads, quotes, jobs, invoices, deposits, and payment status. Jobber is not the default source of truth and should only be added for a documented operational purpose.

## Counsel Review Questions

| Question | Review needed before reliance |
| --- | --- |
| Tennessee privacy, record-retention, construction-contract, and consumer-protection requirements | Confirm notice obligations, retention periods, customer rights, and the effect of service areas outside the home county. |
| SMS consent, messaging flow, opt-out, carrier/TCPA/CTIA, and state requirements | Confirm that the actual text-message program, trigger conditions, disclosures, and records support the language used. |
| Email-subscription workflow | Confirm consent, sender identity, unsubscribe mechanism, and suppression handling before marketing sends. |
| Stripe deposits, invoices, refunds, cancellations, and payment plans | Align disclosure and signed proposal terms with actual configuration and accounting practice. |
| AI, storage, mapping, analytics, and provider data-processing terms | Confirm provider list, processing locations, vendor terms, cookie/consent approach, and any additional required disclosures. |
