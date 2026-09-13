# 0003. Content Moderation Pipeline and Binary Visibility Architecture

**Status**: Accepted

## Context
Pagepod allows arbitrary user-uploaded HTML documents and multi-file zip packages. This exposes the platform to legal, compliance, and abuse risks including pornography, graphic gore/violence, phishing credential harvesting, and sensitive political/geopolitical controversies. Furthermore, previous `unlisted` visibility offered no authentication barrier, acting as an unmonitored attack vector for public link dissemination.

## Decision
1. **Binary Visibility Model**: Deprecate and remove `unlisted` visibility. All projects are strictly partitioned into:
   - `public`: Accessible to all visitors, indexed on Explore showcases, subject to automated multi-tier compliance gates.
   - `private`: Accessible exclusively to the authenticated creator; platform administrators cannot view or peek at private project raw endpoints.
2. **Dual-Core Multimodal Ingestion**:
   - **DOM Text & Heuristic Filter**: Extracts visible DOM text and scans against high-performance local redline dictionaries (Aho-Corasick/DFA for political/geopolitical redlines and phishing password patterns) plus asynchronous OpenAI Moderation classification.
   - **Visual Snapshot Audit**: Reuses the pre-existing 1280x720 headless Chromium poster screenshot (`renderProjectScreenshot`) for visual content moderation, completely avoiding costly, slow unpacking and recursive scanning of hundreds of individual zip images.
3. **Asynchronous Soft-Release Lifecycle**:
   - Projects commit immediately with `reviewStatus: 'pending'`.
   - Creators can preview and test their own projects with zero latency.
   - External anonymous requests to `/raw/[slug]` receive `403 Forbidden: Under Review` until automated moderation promotes status to `approved`.
4. **Tiered Remediation & In-App Notification**:
   - **Critical Violations (S-Tier)**: CSAM, extreme pornography, graphic gore, or phishing landing pages trigger immediate `rejected` status. The raw endpoint cuts off execution with HTTP `451 Unavailable For Legal Reasons`.
   - **Geopolitical & Political Disputes (A-Tier)**: System automatically triggers a **remedial downgrade to `private`** mode. The project remains functional for the creator, but its public distribution is halted.
   - **In-App Notification**: Automated audit incidents dispatch records into the `notifications` table, alerting the creator inside their workspace with violation details and a formal appeal path.
