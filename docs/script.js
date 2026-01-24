// Elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const charCount = document.getElementById('charCount');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true
});

// Render markdown
function renderMarkdown() {
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
}

// Clear editor
function clearEditor() {
    editor.value = '';
    renderMarkdown();
    showToast('Editor cleared');
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

// Event listeners
editor.addEventListener('input', renderMarkdown);

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

// Initialize
renderMarkdown();
