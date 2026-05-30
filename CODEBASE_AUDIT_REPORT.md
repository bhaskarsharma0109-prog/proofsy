# Proofsy Codebase Audit Report

Date: 2026-05-30

Scope audited: `frontend/` Next.js App Router app, `backend/` Express/Mongoose API and worker, Docker/Compose, DigitalOcean/Render configs, CI workflow, env handling, tests, and project documentation.

## Executive Summary

Proofsy has a promising product shape, but it is not production-ready. The highest-risk problems are security and tenancy boundaries: certificate, user, stats, email, and recipient-portal APIs expose or mutate global data without authentication or organization scoping. The recipient portal is only localStorage email lookup, not authentication. JWT signing falls back to a hard-coded secret when `JWT_SECRET` is missing.

The implementation also has correctness and operational gaps: frontend lint fails, backend tests fail against the current schema, npm audit reports critical Next.js vulnerabilities, and production builds intentionally skip TypeScript and lint validation. Starter template assets are ignored from Docker/Git context even though seed records reference them, so clean deployments can create unusable templates.

### Validation Results

| Check | Result |
|---|---|
| `frontend: npm run lint` | Failed: 14 errors and 14 warnings, mainly `no-explicit-any` and unused imports. |
| `frontend: npx tsc --noEmit` | Passed. |
| `frontend: npm run build` | Passed with network access; fails in restricted/offline build because `next/font/google` fetches Inter. Build skips lint/type validation by config. |
| `backend: npm test` | Failed: 3 of 5 tests fail because tests create `Event` without required `organizationId`. |
| `frontend: npm audit --audit-level=moderate` | Failed audit: 1 critical direct `next` vulnerability group plus moderate advisories. Fix available: `next@15.5.18`. |
| `backend: npm audit --audit-level=moderate` | Failed audit: 3 moderate advisories, including `bull -> uuid`. |

## Scorecard

| Area | Score |
|---|---:|
| Production readiness | 32/100 |
| Maintainability | 52/100 |
| Security | 22/100 |
| Scalability | 38/100 |

## Top 10 Highest-Priority Fixes

1. Protect and tenant-scope all non-public API routes.
2. Replace recipient email-only "login" with a real recipient auth flow.
3. Remove the hard-coded JWT secret fallback and require production secrets.
4. Upgrade Next.js to a non-vulnerable version and unmask `npm audit` failures in CI.
5. Move `sanitize` after body parsing and add schema validation on all inputs.
6. Fix starter-template asset packaging so clean Docker/remote deployments can generate certificates.
7. Make frontend lint/type checks mandatory in builds and CI.
8. Repair backend tests to match the organization-scoped schema and add auth/tenancy regression tests.
9. Replace unbounded list endpoints with paginated, organization-scoped queries and aggregation.
10. Use a singleton Bull queue and batched worker processing.

## Findings

### PFSY-SEC-001

Severity: Critical

Category: Security

Location: `backend/src/routes/certificates.js:20-24`, `backend/src/routes/users.js:5-8`, `backend/src/controllers/certificateController.js:155-345`, `backend/src/controllers/userController.js:5-163`

Problem: Certificate and user APIs are public. They list all certificates, all users, all stats, individual certificate details, generate certificates for any event ID, and send emails for any event ID without `protect` or organization scoping.

Impact: Any unauthenticated caller can enumerate recipient PII, verification codes, PDF URLs, event history, and trigger certificate generation or email sends. This breaks multi-tenancy and can be abused for spam or data exfiltration.

Evidence:

```js
router.post("/generate", upload.single("file"), certificateController.generateCertificates);
router.post("/send-emails", certificateController.sendEmails);
router.get("/stats", certificateController.getStats);
router.get("/", certificateController.listCertificates);
router.get("/:id", certificateController.getCertificateById);
```

```js
router.post("/", userController.createUser);
router.get("/", userController.listUsers);
router.get("/:email/certificates", userController.getUserCertificates);
router.get("/:email", userController.getUserByEmail);
```

Recommended Fix:

1. Make only `/api/verify/:code` public.
2. Apply `protect` to admin certificate/user/stats/email routes.
3. Scope certificate queries through events belonging to `req.organizationId`.
4. Add regression tests proving one organization cannot read or mutate another organization's data.

Example Implementation:

```js
const { protect } = require("../middleware/auth");

router.post("/generate", protect, upload.single("file"), certificateController.generateCertificates);
router.post("/send-emails", protect, certificateController.sendEmails);
router.get("/stats", protect, certificateController.getStats);
router.get("/", protect, certificateController.listCertificates);
router.get("/:id", protect, certificateController.getCertificateById);
```

```js
const eventIds = await Event.find({ organizationId: req.organizationId }).distinct("_id");
const certificates = await Certificate.find({ eventId: { $in: eventIds } })
  .populate("userId")
  .populate("eventId")
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(offset);
```

Estimated Effort: 1-2 days.

### PFSY-SEC-002

Severity: Critical

Category: Security

Location: `frontend/src/lib/recipient-auth.ts:1-16`, `frontend/src/app/recipient/login/page.tsx:23-35`, `frontend/src/app/recipient/dashboard/page.tsx:18-39`, `backend/src/routes/users.js:7`

Problem: Recipient login is not authentication. The frontend asks for an email, calls a public endpoint, saves that email to localStorage, and then treats it as a signed-in recipient.

Impact: Anyone who knows or guesses a recipient email can view that recipient's certificate history, verification codes, and PDF links.

Evidence:

```ts
window.localStorage.setItem(RECIPIENT_EMAIL_KEY, email.toLowerCase());
```

```ts
const res = await api.getUserCertificates(normalizedEmail);
saveRecipientEmail(normalizedEmail);
router.push("/recipient/dashboard");
```

Recommended Fix:

1. Add recipient magic-link or one-time-code authentication.
2. Store a signed, httpOnly recipient session cookie.
3. Do not expose `/users/:email/certificates` publicly.
4. Require the authenticated recipient identity to match the requested email.

Example Implementation:

```js
router.post("/recipient/request-login", requestRecipientLoginCode);
router.post("/recipient/verify-login", verifyRecipientLoginCode);
router.get("/recipient/me/certificates", protectRecipient, getOwnCertificates);
```

Estimated Effort: 2-4 days.

### PFSY-SEC-003

Severity: Critical

Category: Security

Location: `backend/src/routes/auth.js:8-10`, `backend/src/middleware/auth.js:24-26`, `backend/src/utils/envValidator.js:9-17`

Problem: JWT signing and verification use a hard-coded fallback secret, and `JWT_SECRET` is not required by env validation.

Impact: Any production deployment missing `JWT_SECRET` accepts tokens signed with `proofsy_secret_key`, allowing account impersonation if an attacker can create or guess member IDs.

Evidence:

```js
return jwt.sign({ id }, process.env.JWT_SECRET || "proofsy_secret_key", {
```

```js
const decoded = jwt.verify(token, process.env.JWT_SECRET || "proofsy_secret_key");
```

Recommended Fix:

1. Require `JWT_SECRET` in all non-test environments.
2. Remove fallback secrets from signing and verification.
3. Rotate tokens after deploying the fix.
4. Do not return tokens in JSON if cookie auth is the chosen mechanism.

Example Implementation:

```js
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];
if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}
```

Estimated Effort: 30-60 minutes plus token rotation.

### PFSY-SEC-004

Severity: High

Category: Security

Location: `backend/src/server.js:24-32`, `backend/src/server.js:47-48`, `backend/src/middleware/sanitize.js:79-82`

Problem: The sanitizer is registered before JSON and URL-encoded body parsing, so `req.body` is usually empty when `sanitize` runs.

Impact: JSON request bodies are not sanitized for NoSQL operators or stored HTML. This weakens login/register/template/event hardening and makes the custom security middleware mostly ineffective for body payloads.

Evidence:

```js
app.use(sanitize);
...
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
```

Recommended Fix:

1. Parse bodies first.
2. Then run sanitize.
3. Add route-level Joi/Zod schemas so invalid shapes are rejected, not just stripped.

Example Implementation:

```js
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitize);
```

Estimated Effort: 30 minutes plus tests.

### PFSY-SEC-005

Severity: High

Category: Security

Location: `backend/src/server.js:26-30`, `backend/src/routes/auth.js:17-24`, `docker-compose.yml:38-45`

Problem: Cookie auth lacks CSRF protection. Production cookies use `sameSite: "none"` and CORS is driven by `CORS_ORIGIN`, but Docker sets `CORS_ORIGIN=true`, which becomes the string origin `"true"` rather than a boolean.

Impact: In one configuration the app can break cross-origin auth entirely; in another permissive configuration, state-changing cookie-auth routes are exposed to CSRF because there is no CSRF token check.

Evidence:

```js
origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
credentials: true,
```

```js
sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
```

Recommended Fix:

1. Use an explicit allowlist of frontend origins.
2. Add CSRF protection for cookie-auth writes.
3. Prefer `sameSite: "lax"` when frontend and backend share a site.
4. Validate env values so `"true"` is not treated as an origin.

Example Implementation:

```js
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Origin not allowed"));
  },
  credentials: true,
}));
```

Estimated Effort: 0.5-1 day.

### PFSY-SEC-006

Severity: Critical

Category: Security

Location: `frontend/package.json:12`, `frontend/next.config.ts:13-19`, `frontend npm audit`, `backend npm audit`

Problem: The frontend pins `next@15.1.3`, and npm audit reports a critical direct vulnerability group including RCE in the React flight protocol and an authorization bypass in Next.js middleware. The build config suppresses lint and TypeScript build failures.

Impact: A self-hosted Next app on a vulnerable version is exposed to framework-level attacks. CI currently would not block this because audit failures are masked and Next build skips validation.

Evidence:

```json
"next": "15.1.3"
```

```ts
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```

Audit evidence:

```text
next: critical
GHSA-9qr9-h5gf-34mp - RCE in React flight protocol
GHSA-f82v-jwr5-mffw - Authorization Bypass in Next.js Middleware
fixAvailable: next@15.5.18
```

Recommended Fix:

1. Upgrade `next` to at least `15.5.18`.
2. Align `eslint-config-next` to the installed Next major/minor.
3. Remove build ignores.
4. Make `npm audit --audit-level=high` fail CI.

Example Implementation:

```bash
npm install next@15.5.18 eslint-config-next@15.5.18
npm run lint
npx tsc --noEmit
npm run build
```

Estimated Effort: 0.5-1 day.

### PFSY-SEC-007

Severity: High

Category: Security

Location: `backend/src/server.js:55-56`, `nginx/nginx.conf:28-34`, `backend/src/controllers/certificateController.js:173-174`, `backend/src/controllers/userController.js:153-154`

Problem: Generated PDFs and uploaded templates are served publicly from `/storage`, and multiple public APIs disclose `pdfUrl`.

Impact: Anyone with a URL can download generated certificates. Combined with public listing endpoints, this becomes bulk PII/document exposure.

Evidence:

```js
app.use("/storage", express.static(path.join(__dirname, "../storage")));
```

```js
pdfUrl: c.pdfUrl,
```

Recommended Fix:

1. Keep public verification metadata separate from private document download.
2. Generate short-lived signed download URLs.
3. Require organization or recipient authorization before returning PDFs.
4. Avoid predictable storage paths based on verification codes.

Example Implementation:

```js
router.get("/certificates/:id/download", protect, async (req, res) => {
  const cert = await findScopedCertificate(req.params.id, req.organizationId);
  res.download(resolvePdfPath(cert.pdfStorageKey));
});
```

Estimated Effort: 1-3 days.

### PFSY-SEC-008

Severity: Medium

Category: Security

Location: `backend/src/routes/certificates.js:7-18`, `backend/src/routes/templates.js:7-20`, `backend/src/controllers/templateController.js:26-32`

Problem: File upload checks trust MIME type or extension and template files are later served from the app origin.

Impact: A crafted CSV, image, or PDF can consume resources or expose users to active PDF content. The upload routes also have no authentication for certificates.

Evidence:

```js
if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
```

```js
const allowed = [".png", ".jpg", ".jpeg", ".webp", ".pdf"];
```

Recommended Fix:

1. Authenticate uploads.
2. Verify file signatures where possible.
3. Scan or sandbox PDFs.
4. Store uploads outside the public static path and proxy authorized downloads.

Example Implementation:

```js
const ext = path.extname(file.originalname).toLowerCase();
if (ext !== ".csv" || file.mimetype !== "text/csv") {
  return cb(new AppError("Invalid CSV upload", 400));
}
```

Estimated Effort: 0.5-1.5 days.

### PFSY-SEC-009

Severity: Medium

Category: Security

Location: `backend/src/routes/auth.js:39-97`, `backend/src/models/TeamMember.js:23-31`

Problem: Registration and login have no password strength policy, account lockout, per-account throttling, email verification, or domain ownership verification for organizations.

Impact: Weak passwords and unlimited organization creation increase account takeover and tenant spoofing risk.

Evidence:

```js
if (!orgName || !name || !email || !password) {
```

```js
password: { type: String, required: true, select: false }
```

Recommended Fix:

1. Enforce minimum password length and breached-password checks.
2. Add login throttling by account and IP.
3. Verify organization owner email before activating the workspace.
4. Add audit logging for auth events.

Example Implementation:

```js
if (password.length < 12) {
  return res.status(400).json({ success: false, error: "Password must be at least 12 characters" });
}
```

Estimated Effort: 1 day.

### PFSY-SEC-010

Severity: Medium

Category: Security

Location: `backend/src/services/emailService.js:73-141`

Problem: Email HTML is built by interpolating recipient and event data without escaping. The body sanitizer does not reliably run on CSV/imported data.

Impact: Malicious recipient names or event names can inject HTML into outgoing emails. Many email clients sanitize, but this is still unsafe and can enable phishing or tracking markup.

Evidence:

```js
<p style="...">Hi <strong>${recipientName}</strong>,</p>
```

```js
<td style="...">${eventName}</td>
```

Recommended Fix:

1. Escape all dynamic HTML values.
2. Use a templating library that escapes by default.
3. Validate and length-limit event/recipient fields at input time.

Example Implementation:

```js
const escape = (value = "") =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
```

Estimated Effort: 30-60 minutes.

### PFSY-LOGIC-001

Severity: High

Category: Logic

Location: `backend/src/controllers/certificateController.js:101-109`, `backend/src/models/Certificate.js:15-20`, `PRODUCT.md:15-26`

Problem: The product promises secure, tamper-proof verification, but verification codes use only the first 8 characters of a UUID, about 32 bits of entropy, and the certificate PDF is not cryptographically signed.

Impact: Code collision risk rises with volume, verification is database-presence only, and generated PDFs can be copied or modified without an embedded signature.

Evidence:

```js
verificationCode: `CERT-${uuidv4().slice(0, 8).toUpperCase()}`,
```

Recommended Fix:

1. Use at least 128-bit random tokens or full UUIDs.
2. Add retry-on-duplicate handling.
3. Embed signed metadata in the QR code, such as HMAC or JWS.
4. Consider PDF digital signatures for high-integrity certificates.

Example Implementation:

```js
const token = crypto.randomBytes(16).toString("base64url");
const verificationCode = `CERT-${token}`;
```

Estimated Effort: 1-2 days.

### PFSY-LOGIC-002

Severity: High

Category: Logic

Location: `backend/src/models/User.js:10-16`, `backend/src/models/Certificate.js:5-14`, `backend/src/models/Event.js:19-23`, `backend/src/controllers/certificateController.js:24-28`

Problem: Only `Event` has `organizationId`; `User` and `Certificate` do not. Certificate generation finds an event by ID without checking tenant ownership.

Impact: Tenant scoping requires fragile joins everywhere. A caller with an event ID can add certificates to another tenant's event through the unprotected endpoint.

Evidence:

```js
const event = await Event.findById(eventId);
```

Recommended Fix:

1. Add `organizationId` to `Certificate`.
2. Decide whether `User` is global or tenant-scoped. If tenant-scoped, unique index should be `{ organizationId, email }`.
3. Query event with `{ _id: eventId, organizationId: req.organizationId }`.
4. Backfill existing records.

Example Implementation:

```js
const event = await Event.findOne({ _id: eventId, organizationId: req.organizationId });
if (!event) return res.status(404).json({ success: false, error: "Event not found" });
```

Estimated Effort: 2-4 days with migration.

### PFSY-BUG-001

Severity: High

Category: Bug

Location: `backend/src/controllers/templateController.js:204-290`, `backend/.dockerignore:3`, `.gitignore:28`, `backend/Dockerfile:11-13`

Problem: `seedStarterTemplates` creates template records pointing to files in `/storage/templates`, but `backend/storage/` is ignored by Git and excluded from Docker context. Local dev currently has those files, but a clean deployment will not.

Impact: Starter template previews and certificate generation can fail in production after seeding because background images are missing.

Evidence:

```js
backgroundUrl: "/storage/templates/elegant-gold.png",
```

```text
backend/.dockerignore:3 storage
.gitignore:28 backend/storage/
```

Recommended Fix:

1. Move seed assets into tracked source, for example `backend/src/templates/assets/starters/`.
2. Copy them into storage at startup or seed time.
3. Add a health check or seed test verifying every starter background exists.

Example Implementation:

```js
const source = path.join(__dirname, "../templates/assets/starters", fileName);
const target = path.join(TEMPLATES_DIR, fileName);
if (!fs.existsSync(target)) fs.copyFileSync(source, target);
```

Estimated Effort: 2-4 hours.

### PFSY-BUG-002

Severity: High

Category: Bug

Location: `backend/tests/api.test.js:91-153`, `backend/src/models/Event.js:19-23`

Problem: Backend tests are stale. They create events without the now-required `organizationId`, so 3 of 5 tests fail.

Impact: CI cannot validate the API, and the test suite no longer protects generation or verification behavior.

Evidence:

```js
const event = await Event.create({ name: "Test Event", date: new Date(), organizerName: "Acme" });
```

Test result:

```text
ValidationError: Event validation failed: organizationId: Path `organizationId` is required.
```

Recommended Fix:

1. Add an organization/member factory.
2. Authenticate protected requests in tests.
3. Add negative cross-tenant tests.

Example Implementation:

```js
const org = await Organization.create({ name: "Acme" });
const event = await Event.create({ name, date, organizerName, organizationId: org._id });
```

Estimated Effort: 0.5-1 day.

### PFSY-BUG-003

Severity: Medium

Category: Bug

Location: `backend/src/services/emailService.js:166-183`, `docker-compose.yml:43-49`

Problem: Email PDF URLs are built as `${BACKEND_URL}${cert.pdfUrl}`. Docker Compose sets `BACKEND_URL=http://localhost/api`, producing links like `http://localhost/api/storage/pdfs/...`, while nginx exposes storage at `/storage`.

Impact: Delivery emails can contain broken download links.

Evidence:

```js
pdfUrl: cert.pdfUrl ? `${backendUrl}${cert.pdfUrl}` : null,
```

```yaml
- BACKEND_URL=http://localhost/api
```

Recommended Fix:

1. Use one `PUBLIC_APP_URL` for public browser links.
2. Generate storage links as `${PUBLIC_APP_URL}${cert.pdfUrl}`.
3. Add an integration test for email link formatting.

Example Implementation:

```js
const publicUrl = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL;
pdfUrl: cert.pdfUrl ? `${publicUrl}${cert.pdfUrl}` : null;
```

Estimated Effort: 30 minutes.

### PFSY-BUG-004

Severity: High

Category: Bug

Location: `backend/src/routes/auth.js:53-65`

Problem: Registration creates an organization and then creates the owner member without a database transaction.

Impact: If member creation fails after organization creation, orphan organizations remain. This can happen under duplicate email races or transient database errors.

Evidence:

```js
const organization = await Organization.create({ name: orgName });
const member = await TeamMember.create({ organizationId: organization._id, ... });
```

Recommended Fix:

1. Wrap registration in a Mongoose session transaction.
2. Create supporting indexes before production.
3. Add a test that duplicate-member failure does not leave an organization.

Example Implementation:

```js
await mongoose.connection.transaction(async (session) => {
  const [organization] = await Organization.create([{ name: orgName }], { session });
  const [member] = await TeamMember.create([{ organizationId: organization._id, name, email, password, role: "owner" }], { session });
  sendTokenResponse(member, 201, res);
});
```

Estimated Effort: 0.5 day.

### PFSY-BUG-005

Severity: Medium

Category: Bug

Location: `backend/src/controllers/templateController.js:26-42`, `backend/src/controllers/templateController.js:130-135`

Problem: Template create parses `textLayers` and `qrCode` JSON strings, but template update directly assigns values. Create also moves the uploaded file before JSON parsing/validation completes.

Impact: Multipart update behavior is inconsistent, invalid JSON can leave orphaned files, and malformed layer data can reach Mongoose validation late.

Evidence:

```js
fs.renameSync(file.path, destPath);
textLayers: textLayers ? JSON.parse(textLayers) : [],
```

```js
if (textLayers) template.textLayers = textLayers;
if (qrCode) template.qrCode = qrCode;
```

Recommended Fix:

1. Normalize parsing in one helper.
2. Validate layer/QR payload before moving files.
3. Clean up temp files on all error paths.

Example Implementation:

```js
function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  return typeof value === "string" ? JSON.parse(value) : value;
}
```

Estimated Effort: 2-4 hours.

### PFSY-BUG-006

Severity: Medium

Category: Bug

Location: `frontend/src/components/CreateEventPage.tsx:109-114`, `frontend/src/app/events/[id]/add-recipients/page.tsx:67-72`

Problem: Manual recipient entry is converted to CSV through string concatenation without escaping commas, quotes, newlines, or spreadsheet formula prefixes.

Impact: Names such as `Doe, Jane` break columns. Malicious values can create spreadsheet formula injection when exported or re-opened.

Evidence:

```ts
const csvContent = "name,email\n" + recipients.map(r => `${r.name},${r.email}`).join("\n");
```

Recommended Fix:

1. Send JSON recipients to a JSON endpoint instead of round-tripping through CSV.
2. If CSV is kept, use a CSV serializer and formula escaping.

Example Implementation:

```ts
const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
const csvContent = ["name,email", ...recipients.map(r => `${escapeCsv(r.name)},${escapeCsv(r.email)}`)].join("\n");
```

Estimated Effort: 1-2 hours.

### PFSY-BUG-007

Severity: Medium

Category: Bug

Location: `frontend/src/app/page.tsx:198-202`, `frontend/src/app/page.tsx:86-88`

Problem: Dashboard event counts and delete-state updates match certificates to events by `eventName` instead of a stable `eventId`.

Impact: Events with the same name will show wrong counts and deleting one event can remove certificates from another event in the client state.

Evidence:

```ts
const eventCerts = certificates.filter((c) => c.eventName === e.name);
setCertificates((current) => current.filter((certificate) => certificate.eventName !== eventName));
```

Recommended Fix:

1. Include `eventId` in `CertificateData` returned by list endpoints.
2. Match and update state by ID.
3. Add duplicate event-name tests.

Example Implementation:

```ts
const eventCerts = certificates.filter((c) => c.eventId === e.id);
setCertificates((current) => current.filter((certificate) => certificate.eventId !== eventId));
```

Estimated Effort: 1-2 hours.

### PFSY-BUG-008

Severity: Medium

Category: Bug

Location: `frontend/src/app/credential-templates/page.tsx:58-59`, `frontend/src/app/credential-templates/page.tsx:89-91`, `frontend/src/lib/templates.ts:11-66`

Problem: The credential templates page has two overlapping search inputs and links legacy static template IDs such as `modern` to `/templates/modern`, while the backend expects Mongo ObjectIds.

Impact: The page looks interactive but navigates to invalid templates and has broken UI controls.

Evidence:

```tsx
<input type="text" placeholder="Search credential templa..." ... />
<input value={query} onChange={(event) => setQuery(event.target.value)} ... />
```

```tsx
<Link href={`/templates/${t.id}`}>
```

Recommended Fix:

1. Remove the legacy page or rewire it to `api.listTemplates()`.
2. Keep only one search input.
3. Ensure "Preview Template" links use real template IDs.

Example Implementation:

```tsx
const res = await api.listTemplates();
setTemplates(res.data ?? []);
```

Estimated Effort: 2-4 hours.

### PFSY-BUG-009

Severity: Medium

Category: Bug

Location: `frontend/src/lib/api.ts:39-48`

Problem: The API wrapper always calls `res.json()`.

Impact: Empty responses, non-JSON error pages, proxy errors, or HTML 500 responses are reported as generic network errors, hiding useful status information.

Evidence:

```ts
const json = await res.json();
if (!res.ok) {
  return { success: false, error: json.error || `HTTP ${res.status}` };
}
```

Recommended Fix:

1. Check content type before parsing JSON.
2. Preserve HTTP status and response text for diagnostics.

Example Implementation:

```ts
const contentType = res.headers.get("content-type") || "";
const body = contentType.includes("application/json") ? await res.json() : await res.text();
```

Estimated Effort: 30 minutes.

### PFSY-PERF-001

Severity: High

Category: Performance

Location: `backend/src/controllers/userController.js:5-45`, `backend/src/controllers/certificateController.js:155-181`, `backend/src/controllers/certificateController.js:256-345`

Problem: List and stats endpoints load unbounded collections into memory and perform multiple count queries. `listUsers` loads all users and all certificates, then computes totals in JavaScript.

Impact: The API and browser will slow or fail as certificate volume grows. This also makes global data exposure worse because every admin page fetches entire datasets.

Evidence:

```js
const users = await User.find().sort({ createdAt: -1 });
const certs = await Certificate.find().populate("eventId");
```

```js
const certificates = await Certificate.find().populate("userId").populate("eventId");
```

Recommended Fix:

1. Add pagination and filters to list endpoints.
2. Use Mongo aggregation for counts.
3. Always scope by organization.
4. Add compound indexes for common filters.

Example Implementation:

```js
Certificate.aggregate([
  { $match: { organizationId: req.organizationId } },
  { $group: { _id: "$userId", totalCertificates: { $sum: 1 } } },
]);
```

Estimated Effort: 1-3 days.

### PFSY-PERF-002

Severity: Medium

Category: Performance

Location: `backend/src/controllers/certificateController.js:122-128`

Problem: A new Bull `Queue` is created for every `/certificates/generate` request and never closed.

Impact: Repeated uploads can leak Redis connections and memory in the API process.

Evidence:

```js
const certQueue = new Queue("certificate-generation", REDIS_URL);
await certQueue.add({ eventId: event._id.toString() });
```

Recommended Fix:

1. Create a singleton queue module.
2. Reuse it across requests.
3. Close it during graceful shutdown.

Example Implementation:

```js
// services/certificateQueue.js
const Queue = require("bull");
module.exports = new Queue("certificate-generation", process.env.REDIS_URL);
```

Estimated Effort: 1 hour.

### PFSY-PERF-003

Severity: Medium

Category: Performance

Location: `backend/src/workers/certificateWorker.js:193-240`

Problem: The worker loads all pending certificates for an event at once and generates PDFs sequentially.

Impact: Large events can exhaust memory or take a very long time. A single slow font/image/PDF operation blocks all remaining certificates in that event.

Evidence:

```js
const pendingCerts = await Certificate.find({ eventId, status: "pending" }).populate("userId");
for (const cert of pendingCerts) {
```

Recommended Fix:

1. Process in batches or use a cursor.
2. Split certificate generation into per-certificate jobs.
3. Limit concurrency explicitly and track retries per certificate.

Example Implementation:

```js
for await (const cert of Certificate.find({ eventId, status: "pending" }).cursor()) {
  await generateOneCertificate(cert);
}
```

Estimated Effort: 1-2 days.

### PFSY-PERF-004

Severity: Medium

Category: Performance

Location: `frontend/src/components/Sidebar.tsx:143-160`, `frontend/src/app/page.tsx:31-35`, `frontend/src/app/analytics/page.tsx:53-57`

Problem: The Sidebar polls stats every 15 seconds, while pages also fetch stats, certificates, and events independently.

Impact: Navigation fans out duplicate API traffic. Since backend stats/list endpoints are unbounded, the frontend multiplies server load and browser memory use.

Evidence:

```ts
loadStats();
const timer = window.setInterval(loadStats, 15000);
```

```ts
const [eventsRes, certificatesRes, statsRes] = await Promise.all([
  api.listEvents(),
  api.listCertificates(),
  api.getStats(),
]);
```

Recommended Fix:

1. Centralize data fetching with React Query/SWR or a dashboard summary endpoint.
2. Use stale times instead of fixed global polling.
3. Add pagination before loading all certificates in the browser.

Example Implementation:

```ts
useQuery({ queryKey: ["stats"], queryFn: api.getStats, staleTime: 30000, refetchInterval: false });
```

Estimated Effort: 1 day.

### PFSY-ARCH-001

Severity: Medium

Category: Architecture

Location: `API_CONTRACT.md:15-54`, `backend/src/models/Event.js:1-39`, `backend/src/controllers/eventController.js:19-29`

Problem: The API contract says event IDs are UUID strings, but the backend uses Mongo ObjectIds. The contract also only covers a subset of implemented routes.

Impact: Frontend/backend behavior has drifted from documented requirements, making integration work and QA less reliable.

Evidence:

```md
"id": "string (uuid)"
```

```js
const event = await Event.create({ ... });
id: event._id,
```

Recommended Fix:

1. Update the contract to match current ObjectId behavior or add external UUID fields.
2. Generate OpenAPI from real routes.
3. Validate responses against schemas in tests.

Example Implementation:

```js
externalId: { type: String, default: () => crypto.randomUUID(), unique: true }
```

Estimated Effort: 0.5-1 day.

### PFSY-ARCH-002

Severity: Medium

Category: Architecture

Location: `frontend/src/app/automations/page.tsx:113-178`, `frontend/src/app/integrations/page.tsx:17-22`, `frontend/src/app/pathways/page.tsx:14-36`, `frontend/src/app/email-templates/page.tsx:118-183`

Problem: Automations, integrations, pathways, and email templates are local-only frontend state with no backend persistence or execution path.

Impact: Users can configure workflows that vanish on refresh and do not affect certificate generation. This creates product trust and revenue-risk issues if these are shown as real platform capabilities.

Evidence:

```ts
const [automations, setAutomations] = useState(starterAutomations);
```

```ts
const [connected, setConnected] = useState<Record<string, boolean>>({ Webhooks: true });
```

Recommended Fix:

1. Mark these as mock/demo if intentionally non-production.
2. Otherwise build backend models and APIs before exposing controls.
3. Add disabled states or "coming soon" copy for unavailable actions.

Example Implementation:

```ts
// Replace local mutation with API persistence.
await api.createAutomation({ name, steps });
```

Estimated Effort: 3-10 days depending on product scope.

### PFSY-ARCH-003

Severity: Low

Category: Architecture

Location: `frontend/package.json:13-15`, `backend/package.json:30-44`, `backend/src/utils/swagger.js:11-12`, `backend/src/templates/*.html`

Problem: There are unused or dead dependencies and modules. Examples: frontend `axios` and `qrcode`; backend `express-mongo-sanitize`, `xss-clean`, `hpp`, `joi`; `swagger.js` imports packages not installed; legacy HTML templates are not used by the current pdf-lib worker.

Impact: Extra dependencies increase audit noise, install time, and maintenance overhead. Importing `swagger.js` would crash unless missing packages are installed.

Evidence:

```js
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
```

Recommended Fix:

1. Remove unused dependencies and dead modules.
2. Or wire them deliberately with tests.
3. Add a dependency hygiene check such as `depcheck`.

Example Implementation:

```bash
npm uninstall axios qrcode
npm uninstall express-mongo-sanitize xss-clean hpp
```

Estimated Effort: 1-2 hours.

### PFSY-DEVOPS-001

Severity: High

Category: Architecture

Location: `frontend/next.config.ts:13-19`, `.github/workflows/ci-cd.yml:90-95`

Problem: The production build ignores ESLint and TypeScript errors. Lint currently fails, but `next build` still succeeds.

Impact: CI can ship code with known lint/type-safety issues. This undermines production quality gates.

Evidence:

```ts
eslint: {
  ignoreDuringBuilds: true,
},
typescript: {
  ignoreBuildErrors: true,
},
```

Recommended Fix:

1. Remove both ignore flags.
2. Add explicit `npm run lint` and `npx tsc --noEmit` to frontend CI.
3. Fix current lint errors.

Example Implementation:

```yaml
- run: npm ci
  working-directory: ./frontend
- run: npm run lint
  working-directory: ./frontend
- run: npx tsc --noEmit
  working-directory: ./frontend
```

Estimated Effort: 0.5 day.

### PFSY-DEVOPS-002

Severity: Medium

Category: Security

Location: `.github/workflows/ci-cd.yml:25-31`, `.github/workflows/ci-cd.yml:63-68`, `.github/workflows/ci-cd.yml:96-108`

Problem: CI uses `npm install` instead of `npm ci`, backend lint is a no-op because there is no backend lint script, and security audit steps use `|| true`.

Impact: CI is not deterministic and cannot block vulnerable dependencies or backend style regressions.

Evidence:

```yaml
run: npm install
...
run: npm audit --audit-level=high || true
```

Recommended Fix:

1. Use `npm ci`.
2. Add backend lint or remove the misleading job.
3. Remove `|| true` for high/critical audits.
4. Upload audit reports only after failing appropriately.

Example Implementation:

```yaml
- run: npm ci
- run: npm audit --audit-level=high
```

Estimated Effort: 1-2 hours.

### PFSY-DEVOPS-003

Severity: Medium

Category: Bug

Location: `backend/src/utils/logger.js:28-41`, `backend/Dockerfile:11-13`, `docker-compose.yml:57-58`

Problem: Winston writes to `logs/error.log` and `logs/combined.log`, but the Dockerfile creates and chowns only `uploads` and `storage`. Compose mounts `backend_logs` at `/usr/src/app/logs` while the process runs as `node`.

Impact: Production containers can hit logging write errors or lose logs if the mounted volume is not writable by the node user.

Evidence:

```js
new winston.transports.File({ filename: "logs/error.log" })
```

```dockerfile
RUN mkdir -p uploads storage/pdfs storage/templates storage/fonts \
    && chown -R node:node uploads storage
```

Recommended Fix:

1. Create and chown `logs` in the Dockerfile.
2. Prefer stdout/stderr in containers and rely on platform log collection.

Example Implementation:

```dockerfile
RUN mkdir -p uploads storage/pdfs storage/templates storage/fonts logs \
    && chown -R node:node uploads storage logs
```

Estimated Effort: 30 minutes.

### PFSY-DEVOPS-004

Severity: Medium

Category: Bug

Location: `.do/app.yaml:63-64`, `frontend/src/lib/api.ts:1-2`, `frontend/Dockerfile:10-14`

Problem: DigitalOcean sets `NEXT_PUBLIC_API_URL` to `${APP_URL}` instead of `${APP_URL}/api`, while the frontend appends paths such as `/events`. The Dockerfile also hardcodes `ENV NEXT_PUBLIC_API_URL=/api` at build time, so runtime app envs may not do what deploy config suggests.

Impact: Non-Docker builds can call wrong URLs like `/events`; Docker builds ignore deployment-specific API URL changes.

Evidence:

```yaml
- key: NEXT_PUBLIC_API_URL
  value: ${APP_URL}
```

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
```

Recommended Fix:

1. Standardize on relative `/api` behind the same origin, or explicitly set `${APP_URL}/api`.
2. Use Docker `ARG NEXT_PUBLIC_API_URL` if build-time override is needed.

Example Implementation:

```dockerfile
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

Estimated Effort: 1 hour.

### PFSY-DEVOPS-005

Severity: Medium

Category: Security

Location: `proofsy_key.pem`, `backend/.env`, `frontend/.env.local`, `.gitignore:16`, `.gitignore:24`

Problem: Local secret-bearing files exist in the repo tree. They are ignored and untracked, but still live beside the source. The `.pem` file is a private-key-shaped artifact and was unreadable to the audit process.

Impact: Secrets can be accidentally zipped, copied, backed up, or included in Docker contexts if ignore files change. The root contains zip artifacts too.

Evidence:

```text
git check-ignore:
.gitignore:16 *.pem proofsy_key.pem
.gitignore:24 .env backend/.env
frontend/.gitignore:34 .env* frontend/.env.local
```

Recommended Fix:

1. Move private keys and real env files outside the repo tree.
2. Keep only `.env.example` in source.
3. Add secret scanning to CI.

Example Implementation:

```bash
git secrets --scan
```

Estimated Effort: 30 minutes.

### PFSY-UX-001

Severity: Medium

Category: UX

Location: `frontend/src/components/Sidebar.tsx:183-404`, `frontend/src/app/certificates/page.tsx:98-145`, `frontend/src/app/events/[id]/page.tsx:152-214`, `frontend/src/app/recipients/page.tsx:221-254`

Problem: Admin layouts use a fixed 260px sidebar and wide tables without mobile alternatives or horizontal scroll wrappers.

Impact: On small screens, core workflows can overflow or become unusable.

Evidence:

```tsx
<aside className="w-[260px] ... min-h-screen shrink-0">
```

```tsx
<table className="w-full text-left">
```

Recommended Fix:

1. Add a responsive collapsible sidebar.
2. Wrap tables with `overflow-x-auto`.
3. Provide card/list layouts for mobile.

Example Implementation:

```tsx
<div className="overflow-x-auto">
  <table className="min-w-[760px] w-full text-left">
```

Estimated Effort: 1-2 days.

### PFSY-UX-002

Severity: Low

Category: UX

Location: `frontend/src/app/templates/new/page.tsx:24-27`, `frontend/src/app/templates/new/page.tsx:148-154`

Problem: Template upload preview creates object URLs without revoking them and renders PDF files using an `<img>`.

Impact: Replacing large files leaks memory during a session, and PDF previews appear broken.

Evidence:

```ts
setPreviewUrl(URL.createObjectURL(f));
```

```tsx
<img src={previewUrl} alt="Preview" ... />
```

Recommended Fix:

1. Revoke previous object URLs in `useEffect` cleanup.
2. Render PDF previews with `<object>` or a PDF placeholder.

Example Implementation:

```ts
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [previewUrl]);
```

Estimated Effort: 30 minutes.

## Quick Wins Under 30 Minutes

- Remove `JWT_SECRET` fallback and require it in env validation.
- Move `app.use(sanitize)` after `express.json()` and `express.urlencoded()`.
- Create/chown `logs` in the backend Dockerfile.
- Fix `BACKEND_URL`/public email download link formatting.
- Remove duplicate search input in `credential-templates/page.tsx`.
- Add `overflow-x-auto` wrappers around wide tables.
- Remove `|| true` from high-severity npm audit CI steps.
- Add backend `npm run lint` script or remove the no-op backend lint step.
- Fix owner role display in Sidebar: backend uses `owner`, frontend checks `root`.
- Revoke template preview object URLs.

## Refactoring Opportunities

- Introduce a shared authorization/query layer for organization-scoped resources.
- Add request/response schemas for every route and generate OpenAPI from them.
- Replace local-only feature pages with real domain modules or clearly gated demos.
- Consolidate API fetching with React Query/SWR and typed service functions.
- Split certificate generation into queueable per-certificate jobs.
- Move storage concerns behind a service that can support local disk, S3, signed URLs, and cleanup.
- Normalize IDs: either external UUIDs everywhere or ObjectIds documented everywhere.
- Add repository-level linting, dependency hygiene, and format scripts.

## Security Hardening Checklist

- Protect all admin routes with `protect`.
- Tenant-scope every query by `organizationId`.
- Add recipient magic-link/OTP auth.
- Require strong `JWT_SECRET` and rotate existing tokens.
- Add CSRF protection for cookie-auth write routes.
- Add schema validation and size limits per endpoint.
- Use signed URLs or authorized download routes for PDFs.
- Upgrade Next.js and fail CI on high/critical advisories.
- Add password policy, login throttling, email verification, and audit logs.
- Add secret scanning and keep real keys/envs outside the repo tree.

## Performance Optimization Checklist

- Paginate certificates, users, events, and recipient certificate lists.
- Replace JavaScript counting with Mongo aggregations.
- Add indexes for `organizationId`, `eventId`, `userId`, `status`, `createdAt`, and `verificationCode`.
- Use a singleton Bull queue instance.
- Split large generation jobs into per-certificate jobs.
- Batch or cursor worker reads.
- Cache dashboard stats with short TTLs.
- Avoid polling stats from every Sidebar instance.
- Add CSV row limits and streaming backpressure.
- Review bundle size after reducing all-client pages and unused dependencies.

## Technical Debt Report

Major debt themes:

- Auth and tenancy were added after the first API contract and are not consistently applied.
- Production checks are bypassed (`ignoreBuildErrors`, `ignoreDuringBuilds`, CI audit `|| true`).
- Several UI pages are prototypes with no backend persistence.
- Storage is local-disk oriented with public static serving and no signed URL model.
- Test coverage is thin and currently failing.
- Dependency surface is larger than the code uses.
- Docs and API contracts are stale relative to implementation.

## Prioritized Action Plan

| Order | Work | Effort | Blocks |
|---:|---|---:|---|
| 1 | Remove JWT fallback, require secrets, fix sanitizer order | 0.5 day | Auth hardening |
| 2 | Protect and tenant-scope certificate/user/stats/email routes | 1-2 days | Production security |
| 3 | Implement recipient auth | 2-4 days | Recipient portal launch |
| 4 | Upgrade Next.js and fix CI audit/lint gates | 0.5-1 day | Safe deploys |
| 5 | Repair backend tests with org/member factories | 0.5-1 day | Regression coverage |
| 6 | Package starter template assets correctly | 0.5 day | Certificate generation reliability |
| 7 | Paginate and aggregate list/stats endpoints | 1-3 days | Scale |
| 8 | Refactor queue creation and worker batching | 1-2 days | Bulk generation scale |
| 9 | Secure PDF/template downloads | 1-3 days | Data protection |
| 10 | Decide which prototype pages become real product modules | 1-2 days planning, implementation varies | Product clarity |

## Next.js + Node.js Special Attention

- App Router usage: Present, but nearly all application pages are client components. This is functional but limits SSR/data-loading benefits and increases client bundle pressure.
- Server Actions: None found.
- Next API Routes: None found.
- Middleware: None found, but the pinned Next version includes middleware-related advisories. Upgrade still matters.
- Authentication flows: Admin auth exists but has hard-coded secret fallback, CSRF gaps, weak env validation, and inconsistent route protection. Recipient auth is not real auth.
- Payment processing: None found.
- Webhooks: UI-only integrations mention webhooks, but no backend webhook implementation was found.
- Database transactions: Not used where needed, especially registration and event delete/certificate cleanup.
- Prisma schema: None found; backend uses Mongoose.
- TypeScript type safety: Frontend `tsc --noEmit` passes, but lint fails and build ignores type/lint validation.
- Environment variables: JWT secret not required, CORS parsing is fragile, public URL envs are inconsistent across Compose/DO/email.
- Rate limiting: Global `/api` limiter exists but is not enough for auth, upload, verification, or email abuse.
- File uploads: Express/multer uploads exist; certificate upload route is public, file validation is extension/MIME-based, and storage is local/public.
- RBAC permissions: `authorize` exists but is not used. Roles are only `owner` and `member`; frontend checks `root`.
- Subscription logic: Sidebar shows usage and upgrade UI, but no subscription enforcement, billing, quotas, or payment integration exists.
- Billing edge cases: No billing implementation found.
