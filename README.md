# Markdown Reader

A client-side Markdown reader web application with live preview and PDF export.

**Live Demo:** https://mgorbatyuk.dev/markdown-reader/

## Features

- **Split-pane interface** — Editor on the left, live preview on the right
- **Multiple input methods:**
  - Type or paste Markdown directly
  - Drag & drop `.md`, `.markdown`, or `.txt` files
  - File picker button to browse local files
- **PDF Export** — Download your rendered Markdown as a PDF
- **Fully client-side** — No server required, all processing happens in the browser
- **Responsive design** — Works on desktop and mobile devices

## Running Locally

### Option 1: Python Server (Recommended)

```bash
# Clone the repository
git clone https://github.com/maximgorbatyuk/markdown-reader.git
cd markdown-reader

# Run the server (opens browser automatically)
python3 serve.py
```

The application will be available at `http://localhost:8000`

Press `Ctrl+C` to stop the server.

### Option 2: Other HTTP Servers

Any local HTTP server will work:

```bash
# Using Python's built-in module directly
python3 -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
markdown-reader/
├── docs/               # Application files (served by GitHub Pages)
│   ├── index.html      # Main HTML file
│   ├── styles.css      # All styles
│   └── script.js       # Application logic
├── serve.py            # Local development server
├── README.md           # This file
└── PLAN.md             # Implementation plan
```

## Dependencies

All dependencies are loaded from CDN:

| Library | Version | Purpose |
|---------|---------|---------|
| [marked.js](https://marked.js.org/) | 12.0.0 | Markdown parsing |
| [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) | 0.10.1 | PDF generation |
| [Google Fonts](https://fonts.google.com/) | — | JetBrains Mono & Literata fonts |

## Usage

1. **Write Markdown** — Type or paste your Markdown content in the editor panel
2. **Preview** — See the rendered output in real-time on the right panel
3. **Load Files** — Drag & drop a file onto the editor or click "Open File"
4. **Export PDF** — Click "Export PDF" to download a formatted PDF
5. **Clear** — Click "Clear" to reset the editor

## Browser Support

Works in all modern browsers:
- Chrome / Edge (Chromium)
- Firefox
- Safari

## License

MIT
