# Security Specification — Maison Sorrel Persistent Text Layers

## 1. Data Invariants
- `/siteConfig/textLayers` is the single published configuration document storing `layers`, `updatedAt`, and `updatedBy`.
- Public visitors may read (`get`) `/siteConfig/textLayers` (public UI copy only, no PII) so edited text renders immediately across sessions and devices.
- Collection listing (`list`) on `/siteConfig` is denied (`false`).
- Writes (`create`, `update`) are strictly restricted to verified owner/admin authentication (`request.auth != null && request.auth.token.email_verified == true && request.auth.token.email == 'chitkaran@gmail.com'`).
- Every write must supply strictly allowlisted keys (`layers`, `updatedAt`, `updatedBy`), `layers` as a non-empty bounded list (`1..20` items) whose first element is a `map`, `updatedAt == request.time`, and `updatedBy == request.auth.uid`.
- Deletes are forbidden (`false`) to preserve site copy integrity.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. Unauthenticated `create` on `/siteConfig/textLayers` -> `PERMISSION_DENIED`
2. Unauthenticated `update` on `/siteConfig/textLayers` -> `PERMISSION_DENIED`
3. Unverified email admin token (`email_verified: false`) writing `/siteConfig/textLayers` -> `PERMISSION_DENIED`
4. Non-owner authenticated user (`other@example.com`) writing `/siteConfig/textLayers` -> `PERMISSION_DENIED`
5. Shadow field injection (`{ layers: [...], updatedAt: serverTimestamp(), updatedBy: uid, isAdmin: true }`) -> `PERMISSION_DENIED`
6. Spoofed `updatedBy` (`updatedBy: "someone-else"`) -> `PERMISSION_DENIED`
7. Client-forged `updatedAt` timestamp (not `request.time`) -> `PERMISSION_DENIED`
8. Empty `layers` array (`layers: []`) -> `PERMISSION_DENIED`
9. Oversized `layers` array (`layers.size() > 20`) -> `PERMISSION_DENIED`
10. Invalid `layers[0]` type (`layers: ["invalid"]`) -> `PERMISSION_DENIED`
11. Unrecognized document ID (`/siteConfig/otherDoc` or oversized ID) -> `PERMISSION_DENIED`
12. `list` query on `/siteConfig` or `delete` on `/siteConfig/textLayers` -> `PERMISSION_DENIED`
