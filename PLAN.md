# Implementation Plan: MarkdownReader.org

## Feasibility Assessment

**Status: FEASIBLE**

All requirements can be implemented using:
- Standard HTML5, CSS3, and vanilla JavaScript
- Two CDN libraries: marked.js (Markdown parsing) and html2pdf.js (PDF export)
- Native browser APIs for file handling and drag/drop

---

## Implementation Steps

### Phase 1: HTML Structure

1. Create the base HTML document with proper meta tags and CDN script imports
2. Define the layout structure:
   - Header with logo and action buttons (Open File, Clear, Export PDF)
   - Main container with two-panel grid (editor and preview)
   - Hidden file input element
   - Drop zone overlay for drag/drop visual feedback
   - Toast notification container

### Phase 2: CSS Styling

1. **Layout styles**
   - CSS Grid for the main two-column layout
   - Flexbox for header and button alignment
   - Responsive breakpoint at 900px for mobile (stack vertically)

2. **Component styles**
   - Editor textarea: monospace font, full height, subtle border
   - Preview panel: readable serif/sans-serif font, proper padding
   - Buttons: consistent styling with hover states
   - Drop zone: overlay with dashed border, transition effects

3. **Markdown preview styles**
   - Typography hierarchy for h1-h6
   - Code blocks with dark background
   - Blockquotes with left border accent
   - Tables with borders and header background
   - Links with accent color
   - Lists with proper indentation

4. **Utility styles**
   - Toast notifications (success, error states)
   - Transitions and animations
   - Disabled button states

### Phase 3: JavaScript Functionality

1. **Core rendering**
   - Configure marked.js with GFM and line breaks enabled
   - Create `renderMarkdown()` function
   - Attach input event listener for live preview

2. **File handling**
   - Implement `handleFile()` function using FileReader API
   - File type validation (.md, .markdown, .txt)
   - Wire up file input change event

3. **Drag and drop**
   - Add dragenter/dragover listeners to show drop zone
   - Add dragleave listener to hide drop zone
   - Add drop listener to handle file
   - Prevent default browser behavior

4. **PDF export**
   - Create `exportPDF()` async function
   - Generate temporary styled container
   - Apply print-friendly inline styles
   - Configure html2pdf options (A4, margins, quality)
   - Download generated PDF

5. **UI interactions**
   - Clear button: empty editor and preview
   - Export button: disabled state when editor is empty
   - Toast notifications for feedback

### Phase 4: Polish and Testing

1. Test all input methods:
   - Manual typing
   - Paste content
   - Drag and drop files
   - File picker

2. Test edge cases:
   - Empty content handling
   - Invalid file types
   - Large files

3. Test PDF export with various Markdown content

4. Test responsive layout on different screen sizes

5. Verify file:// protocol works correctly

---

## File Output

Single file: `markdown-reader.html`

---

## Estimated Structure

```
markdown-reader.html
├── <!DOCTYPE html>
├── <head>
│   ├── Meta tags (charset, viewport)
│   ├── <title>
│   ├── <style> (all CSS)
│   └── CDN scripts (marked.js, html2pdf.js)
├── <body>
│   ├── <header>
│   │   ├── Logo/title
│   │   └── Action buttons
│   ├── <main>
│   │   ├── Editor panel (textarea + drop zone)
│   │   └── Preview panel
│   ├── <input type="file"> (hidden)
│   ├── Toast container
│   └── <script> (all JavaScript)
```

---

## Optional Enhancements (if time permits)

- [ ] Dark mode toggle
- [ ] LocalStorage persistence
- [ ] Keyboard shortcuts (Ctrl+S, Ctrl+O)
- [ ] Word/line count
- [ ] Syntax highlighting with highlight.js
- [ ] Custom PDF filename

---

## Dependencies

| Library | Version | Purpose | CDN URL |
|---------|---------|---------|---------|
| marked.js | 12.0.0 | Markdown parsing | cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js |
| html2pdf.js | 0.10.1 | PDF generation | cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js |

---

## Success Criteria

- [ ] Single HTML file, no build process required
- [ ] Works when opened with file:// protocol
- [ ] Live Markdown preview on typing
- [ ] Drag & drop file loading
- [ ] File picker button works
- [ ] PDF export generates downloadable file
- [ ] Responsive layout (desktop and mobile)
- [ ] Clear visual feedback for all actions
