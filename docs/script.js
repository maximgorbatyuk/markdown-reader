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

// Render markdown to a sanitized HTML string. DOMPurify strips <script>, inline
// event handlers, and javascript:/data: URLs from untrusted markdown sources
// (pasted content, repos opened via the toolbar) before it touches the DOM.
function renderMarkdownSafe(text) {
    const html = marked.parse(text);
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html);
    }
    return html;
}

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
        preview.innerHTML = renderMarkdownSafe(text);
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
        container.innerHTML = renderMarkdownSafe(text);

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
const editorPanelEl = document.querySelector('.editor-panel');

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
    const editorRect = editorPanelEl.getBoundingClientRect();
    const mainRect = mainEl.getBoundingClientRect();
    const repoMode = document.body.classList.contains('repo-loaded');
    const treeWidth = repoMode && treePanel && !treePanel.hidden
        ? treePanel.getBoundingClientRect().width
        : 0;
    const splitArea = mainRect.width - treeWidth;
    const offset = e.clientX - editorRect.left;
    const percentage = (offset / splitArea) * 100;
    const clamped = Math.min(Math.max(percentage, 20), 80);
    if (repoMode) {
        mainEl.style.gridTemplateColumns = `${treeWidth}px ${clamped}% 6px 1fr`;
    } else {
        mainEl.style.gridTemplateColumns = `${clamped}% 6px 1fr`;
    }
});

window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    splitter.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
});

// ----- Repository browsing -----

const MARKDOWN_EXT_RE = /\.(md|markdown|mdown|mkd)$/i;

const repoModal = document.getElementById('repoModal');
const repoModalForm = document.getElementById('repoModalForm');
const repoUrlInput = document.getElementById('repoUrlInput');
const repoModalError = document.getElementById('repoModalError');
const repoCancelBtn = document.getElementById('repoCancelBtn');
const repoLoadBtn = document.getElementById('repoLoadBtn');
const repoLoadLabel = repoLoadBtn ? repoLoadBtn.querySelector('.repo-load-label') : null;
const treePanel = document.getElementById('treePanel');
const treeContent = document.getElementById('treeContent');
const treeRepoLabel = document.getElementById('treeRepoLabel');
const closeRepoBtn = document.getElementById('closeRepoBtn');

let currentRepo = null;
let inFlightLoad = null;

function openRepoModal() {
    if (!repoModal) return;
    setRepoModalError('');
    setRepoModalLoading(false);
    if (typeof repoModal.showModal === 'function') {
        repoModal.showModal();
    } else {
        repoModal.setAttribute('open', '');
    }
    setTimeout(() => repoUrlInput && repoUrlInput.focus(), 0);
    gtag('event', 'open_repo_modal', { event_category: 'toolbar' });
}

function closeRepoModal() {
    if (!repoModal) return;
    if (typeof repoModal.close === 'function') {
        repoModal.close();
    } else {
        repoModal.removeAttribute('open');
    }
}

function setRepoModalError(message) {
    if (!repoModalError) return;
    if (message) {
        repoModalError.textContent = message;
        repoModalError.hidden = false;
    } else {
        repoModalError.textContent = '';
        repoModalError.hidden = true;
    }
}

function setRepoModalLoading(loading) {
    if (!repoModal || !repoLoadLabel) return;
    repoModal.classList.toggle('loading', loading);
    repoLoadLabel.textContent = loading ? 'Loading…' : 'Load';
    if (repoLoadBtn) repoLoadBtn.disabled = loading;
    if (repoUrlInput) repoUrlInput.disabled = loading;
}

// Parse a GitHub or GitLab URL into { host, owner, repo, branch?, projectPath? }.
// projectPath is the URL-encoded full namespace path used by the GitLab API.
function parseRepoUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl.trim());
    } catch (e) {
        throw new Error('Enter a valid URL (https://github.com/owner/repo or https://gitlab.com/group/project).');
    }

    const host = url.hostname.toLowerCase();
    let path = url.pathname.replace(/^\/+|\/+$/g, '');
    if (path.endsWith('.git')) path = path.slice(0, -4);
    if (!path) throw new Error('URL is missing the repository path.');

    if (host === 'github.com' || host === 'www.github.com') {
        const segments = path.split('/');
        if (segments.length < 2) throw new Error('GitHub URL must include owner and repo (e.g. github.com/owner/repo).');
        const [owner, repo, kind, ...rest] = segments;
        let branch;
        if ((kind === 'tree' || kind === 'blob') && rest.length > 0) {
            branch = rest[0];
        }
        return { host: 'github', owner, repo, branch };
    }

    if (host === 'gitlab.com' || host === 'www.gitlab.com') {
        // GitLab path may be: group/(subgroup/...)?project[/-/tree/branch/...]
        let projectPath = path;
        let branch;
        const dashIdx = path.indexOf('/-/');
        if (dashIdx !== -1) {
            projectPath = path.slice(0, dashIdx);
            const after = path.slice(dashIdx + 3).split('/');
            if ((after[0] === 'tree' || after[0] === 'blob') && after.length > 1) {
                branch = after[1];
            }
        }
        const segments = projectPath.split('/');
        if (segments.length < 2) throw new Error('GitLab URL must include namespace and project.');
        const repo = segments[segments.length - 1];
        const owner = segments.slice(0, -1).join('/');
        return { host: 'gitlab', owner, repo, branch, projectPath };
    }

    throw new Error('Only github.com and gitlab.com URLs are supported.');
}

async function fetchJson(url, errorContext, signal) {
    let res;
    try {
        res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        throw new Error(`Network error while ${errorContext}.`);
    }
    if (res.status === 404) throw new Error('Repository not found or not public.');
    if (res.status === 403) throw new Error('Rate limit reached. Try again later.');
    if (!res.ok) throw new Error(`Request failed (${res.status}) while ${errorContext}.`);
    return res.json();
}

// Encode each path segment but keep `/` as a separator so refs like
// "release/2.0" stay valid in URL paths.
function encodePathSegments(s) {
    return s.split('/').map(encodeURIComponent).join('/');
}

async function fetchGitHubRepo(parsed, signal) {
    let branch = parsed.branch;
    if (!branch) {
        const meta = await fetchJson(
            `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
            'fetching repository metadata',
            signal
        );
        branch = meta.default_branch;
        if (!branch) throw new Error('Could not detect default branch.');
    }
    const tree = await fetchJson(
        `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/git/trees/${encodePathSegments(branch)}?recursive=1`,
        'fetching repository tree',
        signal
    );
    const files = (tree.tree || [])
        .filter(entry => entry.type === 'blob' && MARKDOWN_EXT_RE.test(entry.path))
        .map(entry => ({ path: entry.path }));
    return {
        host: 'github',
        owner: parsed.owner,
        repo: parsed.repo,
        branch,
        files,
        truncated: !!tree.truncated,
        rawBase: `https://raw.githubusercontent.com/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/${encodePathSegments(branch)}`
    };
}

async function fetchGitLabRepo(parsed, signal) {
    const encodedProject = encodeURIComponent(parsed.projectPath);
    const meta = await fetchJson(
        `https://gitlab.com/api/v4/projects/${encodedProject}`,
        'fetching repository metadata',
        signal
    );
    const branch = parsed.branch || meta.default_branch;
    if (!branch) throw new Error('Could not detect default branch.');
    const projectId = meta.id;

    const files = [];
    let page = 1;
    let truncated = false;
    const MAX_PAGES = 20;
    while (true) {
        const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=100&page=${page}`;
        let res;
        try {
            res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
        } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            throw new Error('Network error while fetching repository tree.');
        }
        if (!res.ok) throw new Error(`Request failed (${res.status}) while fetching repository tree.`);
        const batch = await res.json();
        for (const entry of batch) {
            if (entry.type === 'blob' && MARKDOWN_EXT_RE.test(entry.path)) {
                files.push({ path: entry.path });
            }
        }
        const nextPage = res.headers.get('x-next-page');
        if (!nextPage) break;
        page = parseInt(nextPage, 10);
        if (page > MAX_PAGES) { truncated = true; break; }
    }

    return {
        host: 'gitlab',
        owner: parsed.owner,
        repo: parsed.repo,
        branch,
        projectId,
        files,
        truncated,
        rawBase: `https://gitlab.com/api/v4/projects/${projectId}/repository/files`
    };
}

function rawUrlForFile(repo, path) {
    if (repo.host === 'github') {
        const encoded = path.split('/').map(encodeURIComponent).join('/');
        return `${repo.rawBase}/${encoded}`;
    }
    return `${repo.rawBase}/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(repo.branch)}`;
}

// Build a nested tree from flat path list. Folders sort first, then files,
// each alphabetically. Each node: {name, type: 'folder'|'file', path?, children?}.
function buildFileTree(files) {
    const root = { name: '', type: 'folder', children: new Map() };
    for (const file of files) {
        const parts = file.path.split('/');
        let node = root;
        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            const isFile = i === parts.length - 1;
            if (!node.children.has(name)) {
                node.children.set(name, isFile
                    ? { name, type: 'file', path: file.path }
                    : { name, type: 'folder', children: new Map() });
            }
            node = node.children.get(name);
        }
    }
    function sort(node) {
        if (node.type !== 'folder') return node;
        const children = Array.from(node.children.values()).sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return { ...node, children: children.map(sort) };
    }
    return sort(root);
}

function renderTree(repo) {
    treeContent.innerHTML = '';
    if (!repo.files.length) {
        const empty = document.createElement('div');
        empty.className = 'tree-empty';
        empty.textContent = 'No Markdown files in this repository.';
        treeContent.appendChild(empty);
        return;
    }
    const root = buildFileTree(repo.files);
    for (const child of root.children) {
        treeContent.appendChild(renderTreeNode(child));
    }
}

function renderTreeNode(node) {
    const el = document.createElement('div');
    el.className = `tree-node tree-${node.type}`;
    const row = document.createElement('div');
    row.className = 'tree-row';
    row.setAttribute('role', 'treeitem');
    row.tabIndex = 0;

    if (node.type === 'folder') {
        const caret = document.createElement('span');
        caret.className = 'tree-caret';
        caret.textContent = '▾';
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = '📁';
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.name;
        row.append(caret, icon, label);
        row.addEventListener('click', () => el.classList.toggle('collapsed'));
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.classList.toggle('collapsed');
            }
        });
        el.appendChild(row);
        const children = document.createElement('div');
        children.className = 'tree-children';
        for (const child of node.children) {
            children.appendChild(renderTreeNode(child));
        }
        el.appendChild(children);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'tree-caret';
        spacer.textContent = '';
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = '📄';
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.name;
        row.append(spacer, icon, label);
        el.dataset.path = node.path;
        const handler = () => loadRepoFile(node.path);
        row.addEventListener('click', handler);
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler();
            }
        });
        el.appendChild(row);
    }
    return el;
}

async function loadRepoFile(path) {
    if (!currentRepo) return;
    const url = rawUrlForFile(currentRepo, path);
    let text;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status}).`);
        text = await res.text();
    } catch (e) {
        showToast(`Could not load ${path}`);
        return;
    }
    editor.value = text;
    renderMarkdown();
    setActiveFile(path);
    gtag('event', 'open_repo_file', { event_category: 'repo', event_label: path });
}

function setActiveFile(path) {
    treeContent.querySelectorAll('.tree-file.active').forEach(el => el.classList.remove('active'));
    if (!path) return;
    const escaped = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(path) : path.replace(/"/g, '\\"');
    const target = treeContent.querySelector(`.tree-file[data-path="${escaped}"]`);
    if (target) {
        target.classList.add('active');
        // Expand all parent folders.
        let parent = target.parentElement;
        while (parent && parent !== treeContent) {
            if (parent.classList.contains('tree-folder')) {
                parent.classList.remove('collapsed');
            }
            parent = parent.parentElement;
        }
        target.scrollIntoView({ block: 'nearest' });
    }
}

function pickReadme(files) {
    if (!files.length) return null;
    const rootReadme = files.find(f => /^readme\.(md|markdown|mdown|mkd)$/i.test(f.path));
    if (rootReadme) return rootReadme.path;
    const anyReadme = files.find(f => /(^|\/)readme\.(md|markdown|mdown|mkd)$/i.test(f.path));
    if (anyReadme) return anyReadme.path;
    return files[0].path;
}

function showRepoPanel(repo) {
    currentRepo = repo;
    document.body.classList.add('repo-loaded');
    treePanel.hidden = false;
    treeRepoLabel.textContent = `${repo.owner}/${repo.repo}`;
    treeRepoLabel.title = `${repo.owner}/${repo.repo} @ ${repo.branch}`;
    mainEl.style.gridTemplateColumns = '';
    renderTree(repo);
}

function closeRepo() {
    cancelInFlightLoad();
    currentRepo = null;
    document.body.classList.remove('repo-loaded');
    treePanel.hidden = true;
    treeContent.innerHTML = '';
    mainEl.style.gridTemplateColumns = '';
    gtag('event', 'close_repo', { event_category: 'repo' });
}

async function handleRepoSubmit(rawUrl) {
    if (inFlightLoad) return;
    setRepoModalError('');
    let parsed;
    try {
        parsed = parseRepoUrl(rawUrl);
    } catch (e) {
        setRepoModalError(e.message);
        return;
    }
    const controller = new AbortController();
    inFlightLoad = controller;
    setRepoModalLoading(true);
    try {
        const repo = parsed.host === 'github'
            ? await fetchGitHubRepo(parsed, controller.signal)
            : await fetchGitLabRepo(parsed, controller.signal);
        if (controller.signal.aborted) return;
        showRepoPanel(repo);
        closeRepoModal();
        gtag('event', 'load_repo', {
            event_category: 'repo',
            event_label: repo.host,
            value: repo.files.length
        });
        if (repo.truncated) {
            showToast('Repository is large; showing partial file list.');
        } else if (!repo.files.length) {
            showToast('No Markdown files found in this repository.');
        }
        const readme = pickReadme(repo.files);
        if (readme) {
            await loadRepoFile(readme);
        }
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        setRepoModalError(e.message || 'Failed to load repository.');
    } finally {
        if (inFlightLoad === controller) inFlightLoad = null;
        setRepoModalLoading(false);
    }
}

function cancelInFlightLoad() {
    if (inFlightLoad) {
        inFlightLoad.abort();
        inFlightLoad = null;
    }
}

if (repoModalForm) {
    repoModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = repoUrlInput.value;
        if (value) handleRepoSubmit(value);
    });
}
if (repoCancelBtn) {
    repoCancelBtn.addEventListener('click', () => {
        cancelInFlightLoad();
        closeRepoModal();
    });
}
if (repoModal) {
    // Close on backdrop click.
    repoModal.addEventListener('click', (e) => {
        if (e.target === repoModal) {
            cancelInFlightLoad();
            closeRepoModal();
        }
    });
    // ESC key dispatches a 'cancel' event before closing the dialog.
    repoModal.addEventListener('cancel', () => cancelInFlightLoad());
}
if (closeRepoBtn) {
    closeRepoBtn.addEventListener('click', () => closeRepo());
}

// Initialize
renderMarkdown();
