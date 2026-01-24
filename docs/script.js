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
        container.className = 'pdf-export';
        container.innerHTML = marked.parse(text);

        // Apply print-friendly styles
        container.style.cssText = `
            font-family: Georgia, serif;
            padding: 20px;
            max-width: 100%;
            line-height: 1.6;
            color: #1a1a1a;
        `;

        // Style elements for PDF
        container.querySelectorAll('h1').forEach(el => {
            el.style.cssText = 'font-size: 24pt; margin-bottom: 16px; border-bottom: 2px solid #ddd; padding-bottom: 8px;';
        });
        container.querySelectorAll('h2').forEach(el => {
            el.style.cssText = 'font-size: 18pt; margin-top: 24px; margin-bottom: 12px; color: #c45d35;';
        });
        container.querySelectorAll('h3').forEach(el => {
            el.style.cssText = 'font-size: 14pt; margin-top: 20px; margin-bottom: 10px;';
        });
        container.querySelectorAll('code').forEach(el => {
            el.style.cssText = 'font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 10pt;';
        });
        container.querySelectorAll('pre').forEach(el => {
            el.style.cssText = 'background: #2d2a26; color: #e8e6e1; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 10pt;';
        });
        container.querySelectorAll('pre code').forEach(el => {
            el.style.cssText = 'background: none; padding: 0; color: inherit;';
        });
        container.querySelectorAll('blockquote').forEach(el => {
            el.style.cssText = 'border-left: 4px solid #c45d35; padding-left: 16px; margin: 16px 0; font-style: italic; color: #666;';
        });
        container.querySelectorAll('a').forEach(el => {
            el.style.cssText = 'color: #c45d35;';
        });
        container.querySelectorAll('table').forEach(el => {
            el.style.cssText = 'border-collapse: collapse; width: 100%; margin: 16px 0;';
        });
        container.querySelectorAll('th, td').forEach(el => {
            el.style.cssText = 'border: 1px solid #ddd; padding: 8px 12px; text-align: left;';
        });
        container.querySelectorAll('th').forEach(el => {
            el.style.cssText += 'background: #f5f5f5; font-weight: bold;';
        });

        document.body.appendChild(container);

        const opt = {
            margin: [15, 15, 15, 15],
            filename: 'markdown-export.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
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
