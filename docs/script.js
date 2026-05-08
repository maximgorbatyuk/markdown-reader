// Elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const charCount = document.getElementById('charCount');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true
});

// Configure mermaid
if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        suppressErrorRendering: true,
        // Native SVG <text> instead of foreignObject so SVGs can be rasterized
        // for PDF export (browsers don't render foreignObject when SVG is loaded
        // via <img>).
        flowchart: { htmlLabels: false }
    });
}

const MERMAID_FENCE_RE = /```mermaid/;

// Replace mermaid code blocks inside `container` with rendered SVG. Errors
// surface as a red banner instead of the original source.
async function renderMermaidBlocks(container, idPrefix, isStale) {
    const codeBlocks = Array.from(container.querySelectorAll('pre > code.language-mermaid'));
    if (!codeBlocks.length || typeof mermaid === 'undefined') return 0;

    let rendered = 0;
    for (let i = 0; i < codeBlocks.length; i++) {
        if (isStale && isStale()) return rendered;
        const code = codeBlocks[i];
        const pre = code.parentElement;
        if (!pre || !pre.parentElement) continue;
        const source = code.textContent;
        const wrapper = document.createElement('div');
        try {
            const { svg } = await mermaid.render(`${idPrefix}-${i}`, source);
            wrapper.className = 'mermaid';
            wrapper.innerHTML = svg;
        } catch (err) {
            wrapper.className = 'mermaid-error';
            wrapper.textContent = `Mermaid error: ${(err && err.message) || 'Invalid diagram syntax'}`;
        }
        if (isStale && isStale()) return rendered;
        pre.replaceWith(wrapper);
        rendered++;
    }
    return rendered;
}

// Convert each rendered .mermaid SVG inside `container` to a PNG <img> with
// explicit pixel dimensions. html2canvas struggles with intrinsic-sized SVGs,
// especially across page boundaries, so for PDF we rasterize to a fixed size
// that fits the A4 content area.
async function rasterizeMermaidSvgs(container) {
    const wrappers = Array.from(container.querySelectorAll('.mermaid'));
    const PDF_MAX_WIDTH_PX = 600;
    for (const wrapper of wrappers) {
        const svg = wrapper.querySelector('svg');
        if (!svg) continue;
        try {
            const vb = svg.viewBox && svg.viewBox.baseVal;
            const wAttr = parseFloat(svg.getAttribute('width')) || 0;
            const hAttr = parseFloat(svg.getAttribute('height')) || 0;
            const intrinsicW = (vb && vb.width) || wAttr || 800;
            const intrinsicH = (vb && vb.height) || hAttr || 600;

            if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('width', String(intrinsicW));
            svg.setAttribute('height', String(intrinsicH));

            const svgString = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const loaded = await new Promise((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = url;
            });

            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(intrinsicW * scale);
            canvas.height = Math.round(intrinsicH * scale);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(loaded, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            const dataUrl = canvas.toDataURL('image/png');
            const displayWidth = Math.min(intrinsicW, PDF_MAX_WIDTH_PX);
            const displayHeight = intrinsicH * (displayWidth / intrinsicW);

            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.cssText = `display: block; margin: 12px auto; width: ${displayWidth}px; height: ${displayHeight}px;`;
            wrapper.innerHTML = '';
            wrapper.appendChild(img);
        } catch (err) {
            console.warn('Mermaid SVG rasterization failed; leaving SVG inline.', err);
        }
    }
}

// Render markdown
let renderToken = 0;
async function renderMarkdown() {
    const myToken = ++renderToken;
    const text = editor.value.trim();

    if (text) {
        preview.innerHTML = marked.parse(text);
        exportBtn.disabled = false;
    } else {
        preview.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-text">Your preview will appear here</div>
                <div class="empty-state-hint">Start typing Markdown in the editor</div>
            </div>
        `;
        exportBtn.disabled = true;
    }

    // Update character count
    charCount.textContent = `${text.length.toLocaleString()} characters`;

    if (text) {
        const count = await renderMermaidBlocks(
            preview,
            `mermaid-preview-${myToken}`,
            () => myToken !== renderToken
        );
        if (count > 0 && myToken === renderToken) {
            gtag('event', 'render_mermaid', { event_category: 'preview', count });
        }
    }
}

// Clear editor
function clearEditor() {
    editor.value = '';
    renderMarkdown();
    showToast('Editor cleared');
    gtag('event', 'clear_editor', { event_category: 'toolbar' });
}

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Handle file reading
function handleFile(file) {
    const validTypes = ['.md', '.markdown', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.some(ext => fileName.endsWith(ext));

    if (!isValid) {
        showToast('Please drop a Markdown file (.md, .markdown, .txt)');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        editor.value = e.target.result;
        renderMarkdown();
        showToast(`Loaded: ${file.name}`);
        gtag('event', 'open_file', { event_category: 'toolbar', event_label: file.name });
    };
    reader.onerror = () => {
        showToast('Error reading file');
    };
    reader.readAsText(file);
}

// Export to PDF
async function exportPDF() {
    const text = editor.value.trim();
    if (!text) return;

    gtag('event', 'export_pdf', { event_category: 'toolbar' });
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<span class="icon">⏳</span><span>Exporting...</span>';

    try {
        // Create a temporary container for PDF
        const container = document.createElement('div');
        container.innerHTML = marked.parse(text);

        // Apply print-friendly styles with full isolation
        container.style.cssText = `
            all: initial;
            font-family: Georgia, serif;
            font-size: 12pt;
            padding: 20px;
            max-width: 100%;
            line-height: 1.6;
            color: #1a1a1a;
            background: #ffffff;
            display: block;
        `;

        // Helper function to apply styles (resets inheritance first)
        const applyStyles = (selector, styles) => {
            container.querySelectorAll(selector).forEach(el => {
                el.style.cssText = 'all: unset; display: block; ' + styles;
            });
        };

        // Style elements for PDF with explicit colors (no CSS variables or modern color functions)
        applyStyles('h1', 'font-family: Georgia, serif; font-size: 24pt; font-weight: bold; margin-bottom: 16px; border-bottom: 2px solid #dddddd; padding-bottom: 8px; color: #1a1a1a;');
        applyStyles('h2', 'font-family: Georgia, serif; font-size: 18pt; font-weight: bold; margin-top: 24px; margin-bottom: 12px; color: #c45d35;');
        applyStyles('h3', 'font-family: Georgia, serif; font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #1a1a1a;');
        applyStyles('h4', 'font-family: Georgia, serif; font-size: 12pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: #1a1a1a;');
        applyStyles('h5', 'font-family: Georgia, serif; font-size: 11pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px; color: #1a1a1a;');
        applyStyles('h6', 'font-family: Georgia, serif; font-size: 10pt; font-weight: bold; margin-top: 12px; margin-bottom: 4px; color: #1a1a1a;');
        applyStyles('p', 'font-family: Georgia, serif; font-size: 12pt; margin-bottom: 12px; color: #1a1a1a;');
        applyStyles('ul', 'font-family: Georgia, serif; font-size: 12pt; margin-bottom: 12px; padding-left: 24px; color: #1a1a1a;');
        applyStyles('ol', 'font-family: Georgia, serif; font-size: 12pt; margin-bottom: 12px; padding-left: 24px; color: #1a1a1a;');
        applyStyles('li', 'font-family: Georgia, serif; font-size: 12pt; margin-bottom: 4px; color: #1a1a1a; display: list-item;');
        applyStyles('blockquote', 'font-family: Georgia, serif; border-left: 4px solid #c45d35; padding-left: 16px; margin: 16px 0; font-style: italic; color: #666666;');
        applyStyles('hr', 'border: none; border-top: 1px solid #dddddd; margin: 24px 0;');

        // Code elements
        container.querySelectorAll('code').forEach(el => {
            el.style.cssText = 'all: unset; font-family: Courier, monospace; font-size: 10pt; background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; color: #1a1a1a;';
        });
        container.querySelectorAll('pre').forEach(el => {
            el.style.cssText = 'all: unset; display: block; font-family: Courier, monospace; background-color: #2d2a26; color: #e8e6e1; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 10pt; margin: 16px 0; white-space: pre-wrap; word-wrap: break-word;';
        });
        container.querySelectorAll('pre code').forEach(el => {
            el.style.cssText = 'all: unset; font-family: Courier, monospace; background-color: transparent; padding: 0; color: #e8e6e1; font-size: 10pt;';
        });

        // Links
        container.querySelectorAll('a').forEach(el => {
            el.style.cssText = 'all: unset; color: #c45d35; text-decoration: underline; cursor: pointer;';
        });

        // Tables
        container.querySelectorAll('table').forEach(el => {
            el.style.cssText = 'all: unset; display: table; border-collapse: collapse; width: 100%; margin: 16px 0; font-family: Georgia, serif; font-size: 11pt;';
        });
        container.querySelectorAll('thead').forEach(el => {
            el.style.cssText = 'all: unset; display: table-header-group;';
        });
        container.querySelectorAll('tbody').forEach(el => {
            el.style.cssText = 'all: unset; display: table-row-group;';
        });
        container.querySelectorAll('tr').forEach(el => {
            el.style.cssText = 'all: unset; display: table-row;';
        });
        container.querySelectorAll('th').forEach(el => {
            el.style.cssText = 'all: unset; display: table-cell; border: 1px solid #dddddd; padding: 8px 12px; text-align: left; background-color: #f5f5f5; font-weight: bold; color: #1a1a1a;';
        });
        container.querySelectorAll('td').forEach(el => {
            el.style.cssText = 'all: unset; display: table-cell; border: 1px solid #dddddd; padding: 8px 12px; text-align: left; color: #1a1a1a;';
        });

        // Images
        container.querySelectorAll('img').forEach(el => {
            el.style.cssText = 'all: unset; max-width: 100%; height: auto; display: block; margin: 12px 0;';
        });

        // Strong and em
        container.querySelectorAll('strong').forEach(el => {
            el.style.cssText = 'all: unset; font-weight: bold;';
        });
        container.querySelectorAll('em').forEach(el => {
            el.style.cssText = 'all: unset; font-style: italic;';
        });

        // Render mermaid then rasterize SVGs to PNG with fixed dimensions
        // so html2pdf places them predictably on the A4 page.
        await renderMermaidBlocks(container, `mermaid-pdf-${Date.now()}`);
        await rasterizeMermaidSvgs(container);
        container.querySelectorAll('.mermaid').forEach(el => {
            el.style.cssText = 'all: unset; display: block; text-align: center; margin: 16px 0; page-break-inside: avoid;';
        });
        container.querySelectorAll('.mermaid-error').forEach(el => {
            el.style.cssText = 'all: unset; display: block; font-family: Courier, monospace; color: #b00020; background-color: #fdecea; border: 1px solid #f5c2c0; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 10pt;';
        });

        document.body.appendChild(container);

        const opt = {
            margin: [15, 15, 15, 15],
            filename: 'markdown-export.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                backgroundColor: '#ffffff',
                // Sanitize colors in cloned document to avoid unsupported color functions
                onclone: (clonedDoc) => {
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        const computed = window.getComputedStyle(el);
                        // Force simple colors to avoid color() function issues
                        if (computed.color) {
                            el.style.color = el.style.color || '#1a1a1a';
                        }
                        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                            el.style.backgroundColor = el.style.backgroundColor || '#ffffff';
                        }
                    });
                }
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: 'avoid-all' }
        };

        await html2pdf().set(opt).from(container).save();

        document.body.removeChild(container);
        showToast('PDF exported successfully!');
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Error exporting PDF');
    } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<span class="icon">📄</span><span>Export PDF</span>';
    }
}

// Event listeners — debounce only when mermaid blocks are present, since
// SVG generation is heavier than plain markdown parsing.
let inputDebounceTimer = null;
editor.addEventListener('input', () => {
    if (inputDebounceTimer) {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = null;
    }
    if (MERMAID_FENCE_RE.test(editor.value)) {
        inputDebounceTimer = setTimeout(renderMarkdown, 150);
    } else {
        renderMarkdown();
    }
});

// File input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = ''; // Reset for same file selection
});

// Drag and drop
const editorPanel = document.querySelector('.editor-panel');

['dragenter', 'dragover'].forEach(event => {
    editorPanel.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('active');
    });
});

['dragleave', 'drop'].forEach(event => {
    editorPanel.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('active');
    });
});

editorPanel.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Prevent default drag behavior on window
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    window.addEventListener(event, (e) => {
        e.preventDefault();
    });
});

// Draggable splitter
const splitter = document.getElementById('splitter');
const mainEl = document.querySelector('main');

let isDragging = false;

splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    splitter.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const mainRect = mainEl.getBoundingClientRect();
    const offset = e.clientX - mainRect.left;
    const totalWidth = mainRect.width;
    const percentage = (offset / totalWidth) * 100;
    const clamped = Math.min(Math.max(percentage, 20), 80);
    mainEl.style.gridTemplateColumns = `${clamped}% 6px 1fr`;
});

window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    splitter.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
});

// Initialize
renderMarkdown();
