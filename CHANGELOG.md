# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-08

### Added

- **Open Repository** — new toolbar button that loads any public GitHub or
  GitLab repository and lists its Markdown files in a collapsible tree
  sidebar.
  - Accepts URLs like `https://github.com/owner/repo` or
    `https://gitlab.com/group/subgroup/project`, with optional
    `/tree/{branch}/...`, trailing `.git`, and branch names containing `/`.
  - Folders are grouped above files, alphabetical at each level. Clicking a
    file loads its raw content into the editor and live preview.
  - Auto-opens the repository's `README.md` (any case, root-first) after
    loading.
  - 3-pane layout: tree | editor | preview. Splitter remains draggable
    between editor and preview; tree column stays a fixed 260px. Mobile
    stacks the tree above the editor.
  - Close-repo button restores the original 2-pane layout without losing
    editor content.
  - Cancel / backdrop / Esc abort in-flight fetches cleanly so a slow load
    can't render a panel after dismissal.
  - Surfaces friendly errors for invalid URLs, private/missing repos, rate
    limits, and partial trees on very large repositories.

### Security

- Markdown output is now sanitized with **DOMPurify** before it touches the
  DOM. `<script>` tags, inline event handlers (`onerror`, `onclick`, …),
  `javascript:` URLs, and `<iframe>` injections in both pasted content and
  repo-loaded content are stripped. Legitimate markdown (headings, lists,
  links, code blocks, Mermaid diagrams) renders unchanged.

## [1.0.0] - 2026-01-24

### Added

- Split-pane interface with editor on the left and live preview on the right
- Real-time Markdown rendering using marked.js
- Multiple input methods:
  - Type or paste Markdown directly in the editor
  - Drag & drop `.md`, `.markdown`, or `.txt` files
  - File picker button to browse local files
- PDF export functionality using html2pdf.js
- Character count display
- Toast notifications for user feedback
- Responsive design for desktop and mobile devices
- Footer with project links and author information
- Clean, warm design with Literata and JetBrains Mono fonts
