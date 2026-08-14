# AI Prompt Fix: Read Every Requested Web Quote Item

The prompt must not rely on the primary `service` field alone. The public quote form should submit a structured list such as `serviceBreakdown`, and the AI prompt should treat that list as the authoritative scope.

## Required Request Payload

```ts
serviceBreakdown: [
  {
    service: "forestry-mulching",
    label: "Forestry Mulching",
    lowCents: 650000,
    highCents: 1200000,
    measurement: "1.00 acre",
    calculation: "1 acre × preliminary range"
  },
  {
    service: "trail-cutting",
    label: "Trail Cutting",
    lowCents: 528000,
    highCents: 1056000,
    measurement: "2,640 linear feet",
    calculation: "2,640 linear feet × preliminary range"
  }
]
```

## Prompt Block to Add

```text
MULTI-SERVICE WEB QUOTE RULES:
- The request may include a primary service plus one or more additional services. Read every bullet under "Structured preliminary service estimates"; each bullet is a requested scope item, not optional background information.
- When structured estimates are present, treat their service names, measurements, and low/high ranges as authoritative. Do not drop, rename, or merge a service into the primary request.
- The ballparkRange must reflect the combined project range across every structured service item. Never calculate it from only the primary service.
- For two or more requested services, your summary and draftResponse must name every requested service in plain language.
- Do not invent a new service, measurement, rate, or discount.
```

## Resulting AI Context

```text
Structured preliminary service estimates (every bullet below is a requested scope item and must remain in the combined AI estimate):
- Forestry Mulching: $6,500 – $12,000 (1.00 acre)
- Trail Cutting: $5,280 – $10,560 (2,640 linear feet)
```

The editable quote draft should **not** wait for the AI to recreate those numbers. It should create one native quote line item from each structured service record, then use the AI for qualification, scope wording, follow-up language, and the combined-range explanation. This keeps the itemization deterministic while the AI remains useful for judgment and communication.
