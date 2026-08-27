# Operations Audit — External Evidence

## Authorization and workflow controls

The OWASP Authorization Cheat Sheet states that permission should be validated on every request, not only in the browser, and recommends deny-by-default authorization with unit and integration coverage for authorization rules.

The OWASP REST Security Cheat Sheet states that non-public REST services should enforce access control at each endpoint. It also advises that multi-step workflows must validate state transitions on the server side and not rely on frontend ordering.

Sources:

- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
