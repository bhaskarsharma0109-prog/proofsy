Created At: 2026-05-31T10:58:50Z
Completed At: 2026-05-31T10:58:50Z
File Path: `file:///C:/Users/bhask/.gemini/antigravity/brain/c768bf7e-d1ce-4b3c-9228-c10243b41d9b/implementation_plan.md`
Total Lines: 157
Total Bytes: 7996
Showing lines 1 to 157
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: # Proofsy SaaS Production Roadmap (Indian College Focus) 🎓🇮🇳
2: 
3: This roadmap adapts the Proofsy SaaS architecture to target the **Indian Higher Education (Colleges, Universities, and Student Clubs) market**, optimizing monetization, delivery, and onboarding for Indian startups.
4: 
5: ---
6: 
7: ## Phase 1: High-Concurrency Reliability & Spiky Workload Resilience
8: **Goal:** Handle the massive, concentrated certificate generation spikes common at the end of Indian college fests, technical symposiums, and webinars (often 2,000+ simultaneous participants).
9: 
10: ### Proposed Changes
11: - **Database Schema Updates:**
12:   - Add unique index on `Certificate` schema: `{ eventId: 1, userId: 1 }` to enforce database-level duplicate prevention.
13:   - Add fields to `Certificate` schema:
14:     ```javascript
15:     attemptsCount: { type: Number, default: 0 },
16:     errorLog: { type: String, default: "" },
17:     idempotencyKey: { type: String, unique: true, sparse: true }
18:     ```
19: - **Spike-Resilient Queue & Rate Limiter:**
20:   - Configure Redis Bull queue with throttled concurrency limits (e.g. 5 jobs/sec per worker) to prevent API server thrashing and server memory overflow.
21:   - Implement automatic recovery of stalled/failed jobs with an exponential backoff retry configuration.
22: - **Verification API:**
23:   - Create endpoint `POST /api/certificates/:id/retry` to manually trigger worker reprocessing for a failed job.
24: 
25: ---
26: 
27: ## Phase 2: Multi-Tenancy & Workspace Separation (Colleges 
<truncated 5150 bytes>
pp numbers.
114: - **Webhook Subscriptions:**
115:   - Implement webhook callbacks for automated institutional integrations.
116: 
117: ---
118: 
119: ## Phase 8: College Audit Logs & Dean Compliance Ledger
120: **Goal:** Track actions for compliance and accountability (crucial for institutional audits).
121: 
122: ### Proposed Changes
123: - **Audit Logging System:**
124:   - Create `AuditLog` schema tracking modifications: who issued certificates, who modified event templates, and who revoked a certificate.
125: - **Faculty Compliance Panel:**
126:   - Expose a read-only compliance history ledger under college workspace settings.
127: 
128: ---
129: 
130: ## Phase 9: Multi-Environment Production Hardening
131: **Goal:** Harden configurations, separate credentials, and optimize server deployment.
132: 
133: ### Proposed Changes
134: - Set up configurations for `.env.development`, `.env.staging`, and `.env.production`.
135: - Integrate AWS S3 or Google Cloud Storage client in worker storage wrapper to save PDFs to cloud buckets.
136: - Implement Winston structured JSON log formats.
137: 
138: ---
139: 
140: ## Phase 10: Interactive College Analytics & Dashboards
141: **Goal:** Provide HODs, Deans, and Student Leads insights into participation levels.
142: 
143: ### Proposed Changes
144: - **Analytics Schema & Visualizations:**
145:   - Log verification scan events (timestamp, geography, user agent).
146:   - Build dashboard graphs showing: total certificates generated over time, email open rates, verification QR scans, active event distributions.
147: 
148: ---
149: 
150: ## Verification Plan
151: 
152: ### Stage 1: Local Test Scripts
153: - Write E2E mock scripts verifying Razorpay webhook signature parsing, high-concurrency worker load handling, and WhatsApp webhook triggers.
154: 
155: ### Stage 2: Sandbox Deployment
156: - Build and verify local node services using `start-local.ps1` with the Indian startup config presets.
157: 
The above content shows the entire, complete file contents of the requested file.
