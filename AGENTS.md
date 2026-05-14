# Markdown Reader Project

## Project Description

`markdown-reader` is a static, client-side web application hosted from the `docs/` directory.  
It provides a split-screen Markdown editor and live preview with:

- Markdown parsing and rendering in real time
- Drag-and-drop and file-picker support for local Markdown/TXT files
- Public GitHub/GitLab repository Markdown browsing
- Mermaid diagram rendering inside Markdown
- PDF export of rendered content

Main app files:

- `docs/index.html`
- `docs/styles.css`
- `docs/script.js`

## Commands to Launch the App

From the project root:

```bash
python3 serve.py
```

Alternative (basic static server):

```bash
python3 -m http.server 8000 --directory docs
```

Open:

```text
http://localhost:8000
```

## Libraries Used

The website loads these external libraries/services from CDNs:

- `marked` (12.0.0) — Markdown parsing
- `DOMPurify` (3.2.4) — HTML sanitization for rendered Markdown
- `html2pdf.js` (0.10.1) — PDF export
- `mermaid` (11.12.0) — Diagram rendering
- Google Fonts (`JetBrains Mono`, `Literata`) — Typography
- Google Analytics (`gtag.js`, property `G-60HZ1JT1F6`) — Usage analytics

## Feature Rationale

The following notes document what was added and why, so future contributors
can quickly understand the intent behind these capabilities.

- **WebMCP tool exposure in `docs/script.js`**  
  **Description:** Adds a `navigator.modelContext` integration and registers
  editor tools (`markdown.get_content`, `markdown.set_content`,
  `markdown.clear_editor`, `markdown.get_preview_html`, `markdown.export_pdf`,
  `markdown.open_repository`, `markdown.open_repository_file`).  
  **Reason:** Lets AI agents interact with the app through a structured tool
  interface instead of brittle DOM automation.

- **Content negotiation + markdown output in `serve.py`**  
  **Description:** Adds a custom request handler that serves `text/markdown`
  for HTML routes when `Accept: text/markdown` is requested, including an
  `x-markdown-tokens` estimate header.  
  **Reason:** Provides a machine-friendly representation of pages for agents
  and automation workflows.

- **Discovery `Link` headers in `serve.py` and `docs/_headers`**  
  **Description:** Adds discovery relations (`api-catalog`, `service-desc`,
  `service-doc`, `authorization_server`, `describedby`, etc.) on homepage
  responses and static hosting headers.  
  **Reason:** Makes service capabilities discoverable through standard HTTP
  metadata in both local and deployed environments.

- **Agent/service metadata under `docs/.well-known/*`**  
  **Description:** Adds `agent.json`, `service-desc.json`, `api-catalog`,
  `api-catalog.json`, `agent-skills/index.json`, and
  `mcp/server-card.json`.  
  **Reason:** Publishes standardized discovery documents so external clients
  can identify the site, available capabilities, and protocol metadata.

- **OAuth metadata and placeholder endpoints (`docs/.well-known/*`, `docs/oauth/*`)**  
  **Description:** Adds authorization server metadata, protected resource
  metadata, JWKS placeholder, plus static `/oauth/authorize` and `/oauth/token`
  responses that return explicit "not implemented" errors.  
  **Reason:** Declares protocol expectations for compatibility while clearly
  signaling that this static app does not issue tokens.

- **Service docs and health endpoint (`docs/api.html`, `docs/health.json`)**  
  **Description:** Adds a human-readable API/discovery page and a static
  health status document (`status: pass`).  
  **Reason:** Provides quick operational checks and a single landing page for
  discovery resources.

- **Crawler signaling in `docs/robots.txt`**  
  **Description:** Adds `Content-Signal: ai-train=no, search=yes, ai-input=no`.  
  **Reason:** Communicates indexing and AI usage preferences to crawlers.

- **Repository hygiene updates (`.gitignore`, removed legacy docs)**  
  **Description:** Ignores `__pycache__` and removes
  `CLAUDE_AGENT_INSTRUCTIONS.md` / `PLAN.md` from tracked content.  
  **Reason:** Reduces local noise and replaces one-off planning artifacts with
  a durable project-facing summary in `AGENTS.md`.
