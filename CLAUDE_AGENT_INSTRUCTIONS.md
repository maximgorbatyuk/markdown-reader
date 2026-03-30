# Claude Agent Instructions: Implement MarkdownReader.org

## Overview

Create a client-side Markdown reader web application. This is a single HTML file with no build process, no server, and no frameworks. Everything runs in the user's browser.

---

## Requirements

### Core Features

1. **Split-pane interface**
   - Left panel: Markdown editor (textarea)
   - Right panel: Live rendered preview

2. **Input methods**
   - Manual typing in the textarea
   - Paste content directly
   - Drag & drop `.md`, `.markdown`, or `.txt` files
   - File picker button to browse local files

3. **PDF Export**
   - Export the rendered Markdown as a downloadable PDF
   - Must work entirely client-side (no server)

4. **No server required**
   - Single HTML file
   - All processing happens in the browser
   - Can be opened directly with `file://` protocol

---

## Technical Specifications

### Dependencies (load from CDN)

```html
<!-- Markdown parser -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js"></script>

<!-- PDF generation -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

### File Structure

```
markdown-reader.html    # Single file containing HTML, CSS, and JavaScript
```

### Key Implementation Details

#### 1. Markdown Rendering

```javascript
// Configure marked.js
marked.setOptions({
    breaks: true,  // Convert \n to <br>
    gfm: true      // GitHub Flavored Markdown
});

// Render function
function renderMarkdown() {
    const text = editor.value.trim();
    if (text) {
        preview.innerHTML = marked.parse(text);
    }
}

// Trigger on input
editor.addEventListener('input', renderMarkdown);
```

#### 2. Drag & Drop

```javascript
// Show drop zone on drag
['dragenter', 'dragover'].forEach(event => {
    editorPanel.addEventListener(event, (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });
});

// Hide drop zone and handle file
editorPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

// Read file content
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        editor.value = e.target.result;
        renderMarkdown();
    };
    reader.readAsText(file);
}
```

#### 3. PDF Export

```javascript
async function exportPDF() {
    // Create temporary container with rendered markdown
    const container = document.createElement('div');
    container.innerHTML = marked.parse(editor.value);
    
    // Apply print-friendly inline styles
    // ... style each element for PDF output
    
    document.body.appendChild(container);
    
    // Generate PDF
    const options = {
        margin: 15,
        filename: 'markdown-export.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(options).from(container).save();
    document.body.removeChild(container);
}
```

#### 4. File Input

```html
<input type="file" id="fileInput" accept=".md,.markdown,.txt" hidden>
<button onclick="document.getElementById('fileInput').click()">Open File</button>
```

```javascript
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});
```

---

## UI/UX Guidelines

### Layout

- **Header**: Logo, action buttons (Open File, Clear, Export PDF)
- **Main**: Two-column grid (editor | preview)
- **Responsive**: Stack panels vertically on mobile (< 900px)

### Styling Suggestions

- Clean, readable typography (consider serif for preview, monospace for editor)
- Subtle color palette with an accent color for headings/links
- Smooth transitions for interactive elements
- Visual feedback for drag & drop (highlight drop zone)
- Toast notifications for actions (file loaded, PDF exported, errors)

### Markdown Preview Styles

Style these elements in the preview:

- `h1` - `h6`: Hierarchical sizing, accent color for h2
- `code`: Monospace font, subtle background
- `pre`: Dark background, light text, rounded corners
- `blockquote`: Left border accent, italic, muted color
- `table`: Bordered cells, header background
- `a`: Accent color, underline on hover
- `ul/ol`: Styled markers, proper indentation

---

## Testing Checklist

- [ ] Typing in editor updates preview in real-time
- [ ] Pasting content works correctly
- [ ] Drag & drop accepts .md, .markdown, .txt files
- [ ] Drag & drop rejects other file types with error message
- [ ] File picker opens and loads selected file
- [ ] Clear button empties editor and preview
- [ ] Export PDF downloads a properly formatted PDF
- [ ] Export button is disabled when editor is empty
- [ ] Works offline (after initial CDN load)
- [ ] Works when opened directly as file:// URL
- [ ] Responsive layout works on mobile screens

---

## Example Markdown for Testing

```markdown
# Welcome to MarkdownReader.org

This is a **client-side** Markdown reader with *live preview*.

## Features

- Type or paste Markdown
- Drag & drop files
- Export to PDF

### Code Example

```javascript
console.log('Hello, Markdown!');
```

> This is a blockquote for emphasis.

| Feature | Status |
|---------|--------|
| Editor  | ✅     |
| Preview | ✅     |
| PDF     | ✅     |

---

Made with ❤️ using vanilla JavaScript.
```

---

## Deployment

No deployment needed! Simply:

1. Save the HTML file anywhere on the laptop
2. Double-click to open in default browser
3. Or right-click → Open with → Choose browser

The application is completely self-contained and works offline after the first load (CDN scripts are cached by the browser).

---

## Optional Enhancements

If time permits, consider adding:

- [ ] Dark mode toggle
- [ ] Local storage to persist content between sessions
- [ ] Keyboard shortcuts (Ctrl+S to export, Ctrl+O to open)
- [ ] Word/line count display
- [ ] Syntax highlighting for code blocks (add highlight.js)
- [ ] Custom filename for PDF export
- [ ] Print stylesheet for browser print function
