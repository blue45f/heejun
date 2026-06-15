import os
import markdown
import re
import json

docs_dir = "/Users/hjunkim/WebstormProjects/heejun/public/개발가이드"
output_dir = docs_dir

# 3-Column Layout CSS
COMMON_CSS = """
:root {
    --bg-color: #060913;
    --card-bg: rgba(13, 20, 38, 0.7);
    --border-color: rgba(255, 255, 255, 0.06);
    --sidebar-bg: rgba(9, 13, 26, 0.85);
    
    --text-primary: #f8fafc;
    --text-secondary: #e2e8f0; /* 밝아짐 (가독성 향상) */
    --text-muted: #94a3b8; /* 밝아짐 (가독성 향상) */
    
    --accent-color: #6366f1;
    --accent-light: #93c5fd; /* 밝아짐 */
    --accent-gradient: linear-gradient(135deg, #8b5cf6, #3b82f6);
    
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    
    --left-sidebar-width: 320px;
    --right-sidebar-width: 250px;
}

* {
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif;
    background-color: var(--bg-color);
    color: var(--text-primary);
    margin: 0;
    padding: 0;
    line-height: 1.8;
    background-image: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
                      radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
    background-attachment: fixed;
    overflow-x: hidden;
}

.layout {
    display: flex;
    min-height: 100vh;
}

/* LEFT SIDEBAR: Document List & Search */
.left-sidebar {
    width: var(--left-sidebar-width);
    border-right: 1px solid var(--border-color);
    background: var(--sidebar-bg);
    backdrop-filter: blur(20px);
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    padding: 24px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    margin-bottom: 20px;
}

.sidebar-logo-text {
    font-size: 1.15rem;
    font-weight: 800;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 15px;
    letter-spacing: -0.02em;
}

.search-container {
    position: relative;
    margin-bottom: 15px;
}

.search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 10px 14px 10px 34px;
    color: var(--text-primary);
    font-size: 0.88rem;
    outline: none;
    transition: all 0.2s;
}

.search-input:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    background: rgba(255, 255, 255, 0.06);
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
}

.doc-list {
    list-style: none;
    padding: 0;
    margin: 0;
    flex-grow: 1;
    overflow-y: auto;
}

.doc-item {
    margin-bottom: 3px;
}

.doc-link {
    display: flex;
    align-items: center;
    padding: 9px 12px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.88rem;
    border-radius: 8px;
    transition: all 0.2s;
    font-weight: 500;
}

.doc-link:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.04);
}

.doc-link.active {
    color: #fff;
    background: rgba(99, 102, 241, 0.16);
    border-left: 3px solid var(--accent-color);
    font-weight: 600;
}

.doc-number {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    color: var(--accent-light);
    margin-right: 8px;
    opacity: 0.8;
}

/* RIGHT SIDEBAR: Current Document TOC */
.right-sidebar {
    width: var(--right-sidebar-width);
    border-left: 1px solid var(--border-color);
    background: var(--bg-color);
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    z-index: 10;
    padding: 30px 20px;
    overflow-y: auto;
}

.toc-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
}

.toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border-left: 1px solid var(--border-color);
}

.toc-item {
    margin-bottom: 2px;
}

.toc-link {
    display: block;
    padding: 6px 16px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    transition: all 0.2s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-left: 2px solid transparent;
    margin-left: -1px;
}

.toc-link:hover {
    color: #fff;
}

.toc-link.active {
    color: var(--accent-light);
    border-left-color: var(--accent-color);
    font-weight: 600;
}

.toc-link.level-3 {
    padding-left: 28px;
    font-size: 0.8rem;
}

/* MIDDLE MAIN CONTENT */
.main-content {
    margin-left: var(--left-sidebar-width);
    margin-right: var(--right-sidebar-width);
    flex-grow: 1;
    padding: 50px 60px;
    min-width: 0;
}

.content-container {
    max-width: 900px;
    margin: 0 auto;
}

.content-wrapper {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    backdrop-filter: blur(16px);
    border-radius: 20px;
    padding: 50px;
    box-shadow: 0 15px 40px -15px rgba(0, 0, 0, 0.7);
}

/* RESPONSIVE LAYOUT */
@media (max-width: 1280px) {
    .right-sidebar {
        display: none;
    }
    .main-content {
        margin-right: 0;
    }
}

@media (max-width: 960px) {
    .left-sidebar {
        display: none;
    }
    .main-content {
        margin-left: 0;
        padding: 30px 20px;
    }
}

/* TYPOGRAPHY IN BODY */
h1 {
    font-size: 2.3rem;
    font-weight: 800;
    margin: 0 0 15px 0;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.3;
}

h2 {
    font-size: 1.65rem;
    font-weight: 700;
    margin-top: 50px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 12px;
    color: #f1f5f9;
    scroll-margin-top: 30px;
}

h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 35px;
    margin-bottom: 15px;
    color: #e2e8f0;
    scroll-margin-top: 30px;
}

p {
    margin-top: 0;
    margin-bottom: 24px;
    color: #e2e8f0; /* 밝아짐 (가독성 향상) */
}

a {
    color: #60a5fa; /* 더 높은 명도 대비의 하늘색으로 변경 */
    text-decoration: none;
    transition: color 0.2s;
}

a:hover {
    color: #93c5fd;
    text-decoration: underline;
}

/* Styled Table element */
.table-responsive {
    width: 100%;
    overflow-x: auto;
    margin: 30px 0;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.01);
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
    text-align: left;
}

th, td {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color);
}

th {
    background-color: rgba(255, 255, 255, 0.025);
    color: #fff;
    font-weight: 600;
    border-bottom: 2px solid var(--border-color);
}

td {
    color: #f1f5f9; /* 더 밝은 색으로 갱신 (가독성 향상) */
}

tr:nth-child(even) td {
    background-color: rgba(255, 255, 255, 0.01);
}

tr:hover td {
    background-color: rgba(99, 102, 241, 0.04);
    color: #fff;
}

/* Badges for code keywords */
code {
    font-family: 'Fira Code', Consolas, Monaco, monospace;
    background-color: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 3px 6px;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #c7d2fe;
}

pre {
    background-color: #030611;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
    margin: 30px 0;
}

pre code {
    background-color: transparent;
    border: none;
    padding: 0;
    border-radius: 0;
    color: #e2e8f0;
    font-size: 0.88rem;
}

/* Blockquotes */
blockquote {
    border-left: 4px solid var(--accent-color);
    background-color: rgba(99, 102, 241, 0.03);
    margin: 30px 0;
    padding: 16px 24px;
    border-radius: 0 12px 12px 0;
}

blockquote p {
    margin: 0;
    color: #94a3b8;
    font-style: italic;
}

/* Lists */
ul, ol {
    margin-bottom: 24px;
    padding-left: 28px;
    color: #cbd5e1;
}

li {
    margin-bottom: 8px;
}

/* Alerts custom classes */
.alert {
    padding: 18px 24px;
    border-radius: 12px;
    margin: 30px 0;
    border-left: 4px solid;
    font-size: 0.95rem;
}

.alert-note {
    background: rgba(59, 130, 246, 0.08);
    border-color: #3b82f6;
    color: #dbeafe;
}

.alert-warning {
    background: rgba(245, 158, 11, 0.08);
    border-color: var(--warning-color);
    color: #fef3c7;
}

.alert-danger {
    background: rgba(239, 68, 68, 0.08);
    border-color: var(--danger-color);
    color: #fee2e2;
}

.alert-tip {
    background: rgba(16, 185, 129, 0.08);
    border-color: var(--success-color);
    color: #ecfdf5;
}

/* Mermaid graph card wrapping */
.mermaid {
    background: #030611 !important;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    margin: 30px 0;
    display: flex;
    justify-content: center;
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: var(--bg-color);
}

::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
}

/* Mermaid contrast adjustments for light background nodes */
.mermaid .node:has(rect[style*="fill"]),
.mermaid .node:has(polygon[style*="fill"]),
.mermaid .node:has(circle[style*="fill"]),
.mermaid .node:has(ellipse[style*="fill"]),
.mermaid .node:has(path[style*="fill"]),
.mermaid .node[style*="fill"] {
    /* Fallback styles if needed */
}

.mermaid .node:has(rect[style*="fill"]) text,
.mermaid .node:has(rect[style*="fill"]) .label,
.mermaid .node:has(rect[style*="fill"]) .label *,
.mermaid .node:has(rect[style*="fill"]) foreignObject div,
.mermaid .node:has(polygon[style*="fill"]) text,
.mermaid .node:has(polygon[style*="fill"]) .label,
.mermaid .node:has(polygon[style*="fill"]) .label *,
.mermaid .node:has(polygon[style*="fill"]) foreignObject div,
.mermaid .node:has(circle[style*="fill"]) text,
.mermaid .node:has(circle[style*="fill"]) .label,
.mermaid .node:has(circle[style*="fill"]) .label *,
.mermaid .node:has(circle[style*="fill"]) foreignObject div,
.mermaid .node:has(path[style*="fill"]) text,
.mermaid .node:has(path[style*="fill"]) .label,
.mermaid .node:has(path[style*="fill"]) .label *,
.mermaid .node:has(path[style*="fill"]) foreignObject div,
.mermaid .node[style*="fill"] text,
.mermaid .node[style*="fill"] .label,
.mermaid .node[style*="fill"] .label *,
.mermaid .node[style*="fill"] foreignObject div {
    color: #0b0f19 !important;
    fill: #0b0f19 !important;
}

"""

# JavaScript to handle TOC and Document list filtering
JS_TOC_AND_SEARCH = """
document.addEventListener("DOMContentLoaded", function() {
    // 1. Generate TOC Dynamically
    const headers = document.querySelectorAll(".content-wrapper h2, .content-wrapper h3");
    const tocList = document.getElementById("toc-list");
    
    if (tocList && headers.length > 0) {
        headers.forEach((header, index) => {
            if (!header.id) {
                header.id = "header-" + index;
            }
            
            const li = document.createElement("li");
            li.className = "toc-item";
            
            const a = document.createElement("a");
            a.href = "#" + header.id;
            a.className = "toc-link";
            if (header.tagName.toLowerCase() === "h3") {
                a.classList.add("level-3");
            }
            
            // Clean up text
            let text = header.textContent.trim();
            a.textContent = text;
            
            li.appendChild(a);
            tocList.appendChild(li);
        });
        
        // TOC Scroll Offset
        document.querySelectorAll('.toc-link').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 30,
                        behavior: 'smooth'
                    });
                    
                    document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
        
        // Active item highlighting on scroll
        window.addEventListener("scroll", function() {
            let currentActive = "";
            headers.forEach(header => {
                const top = header.offsetTop;
                if (window.scrollY >= top - 120) {
                    currentActive = "#" + header.id;
                }
            });
            
            if (currentActive) {
                document.querySelectorAll(".toc-link").forEach(link => {
                    if (link.getAttribute("href") === currentActive) {
                        link.classList.add("active");
                    } else {
                        link.classList.remove("active");
                    }
                });
            }
        });
    }
    
    // 2. Search Input Filtering for Left Sidebar
    const searchInput = document.getElementById("search-input");
    const docItems = document.querySelectorAll(".doc-item");
    
    if (searchInput) {
        searchInput.addEventListener("input", function(e) {
            const query = e.target.value.toLowerCase().trim();
            
            docItems.forEach(item => {
                const titleText = item.querySelector(".doc-title").textContent.toLowerCase();
                const numText = item.querySelector(".doc-number").textContent.toLowerCase();
                
                if (titleText.includes(query) || numText.includes(query)) {
                    item.style.display = "";
                } else {
                    item.style.display = "none";
                }
            });
        });
    }
    
    // 3. Adjust Mermaid Node Text Contrast Dynamically
    function adjustMermaidContrast() {
        const nodes = document.querySelectorAll('.mermaid .node');
        nodes.forEach(node => {
            const bgEl = node.querySelector('rect, polygon, circle, ellipse, path');
            if (!bgEl) return;
            
            const fill = bgEl.style.fill || bgEl.getAttribute('fill');
            if (fill && fill !== 'none' && fill !== 'transparent') {
                let isLight = true;
                
                // Check RGB format
                const rgb = fill.match(/\\d+/g);
                if (rgb && rgb.length >= 3) {
                    const r = parseInt(rgb[0]);
                    const g = parseInt(rgb[1]);
                    const b = parseInt(rgb[2]);
                    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                    isLight = yiq > 128;
                } else if (fill.startsWith('#')) {
                    // Check Hex format
                    let hex = fill.slice(1);
                    if (hex.length === 3) {
                        hex = hex.split('').map(c => c + c).join('');
                    }
                    if (hex.length === 6) {
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                        isLight = yiq > 128;
                    }
                }
                
                if (isLight) {
                    const labels = node.querySelectorAll('text, .label, .label *, foreignObject div, foreignObject span');
                    labels.forEach(label => {
                        label.style.setProperty('color', '#0b0f19', 'important');
                        label.style.setProperty('fill', '#0b0f19', 'important');
                    });
                }
            }
        });
    }

    // Observe DOM changes to catch async Mermaid rendering
    const observer = new MutationObserver((mutations) => {
        let shouldAdjust = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList.contains('mermaid') || node.querySelector('.mermaid') || node.tagName.toLowerCase() === 'svg') {
                            shouldAdjust = true;
                        }
                    }
                });
            }
        });
        if (shouldAdjust) {
            adjustMermaidContrast();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', () => {
        adjustMermaidContrast();
        setTimeout(adjustMermaidContrast, 300);
        setTimeout(adjustMermaidContrast, 800);
        setTimeout(adjustMermaidContrast, 1500);
    });
});
"""

def make_html_layout(title, body_content, doc_list, current_filename):
    # Left Sidebar content
    sidebar_links = []
    for doc in doc_list:
        is_active = "active" if doc["filename"] == current_filename else ""
        sidebar_links.append(f"""
        <li class="doc-item">
            <a href="{doc['html_filename']}" class="doc-link {is_active}">
                <span class="doc-number">{doc['number']}</span>
                <span class="doc-title">{doc['title']}</span>
            </a>
        </li>
        """)
    sidebar_links_html = "\\n".join(sidebar_links)
    
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap">
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        {COMMON_CSS}
    </style>
</head>
<body>
    <div class="layout">
        <!-- LEFT SIDEBAR -->
        <aside class="left-sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo-text">AI-First 개발 표준 가이드</div>
                <div class="search-container">
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="search-input" class="search-input" placeholder="가이드 검색...">
                </div>
            </div>
            <ul class="doc-list">
                {sidebar_links_html}
            </ul>
        </aside>

        <!-- MIDDLE CONTENT -->
        <main class="main-content">
            <div class="content-container">
                <div class="content-wrapper">
                    {body_content}
                </div>
            </div>
        </main>

        <!-- RIGHT SIDEBAR (TOC) -->
        <aside class="right-sidebar">
            <div class="toc-title">이 페이지 목차</div>
            <ul class="toc-list" id="toc-list">
                <!-- Javascript will build items -->
            </ul>
        </aside>
    </div>

    <!-- Initialization Scripts -->
    <script>
        {JS_TOC_AND_SEARCH}
        
        // Initialize Mermaid
        mermaid.initialize({{
            startOnLoad: true,
            theme: 'dark',
            themeVariables: {{
                background: '#030611',
                primaryColor: '#6366f1',
                primaryTextColor: '#f8fafc',
                lineColor: '#64748b'
            }}
        }});
    </script>
</body>
</html>
"""

def parse_alert_blocks(html_content):
    # Match blockquotes with [!NOTE] style markers
    pattern = r'<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](.*?)</p>\s*</blockquote>'
    
    def replacer(match):
        alert_type = match.group(1).lower()
        if alert_type == 'caution' or alert_type == 'warning':
            alert_class = 'warning'
        elif alert_type == 'important':
            alert_class = 'danger'
        elif alert_type == 'tip':
            alert_class = 'tip'
        else:
            alert_class = 'note'
            
        content = match.group(2).strip()
        content = re.sub(r'^<br\s*/?>', '', content).strip()
        
        emoji_map = {
            'note': 'ℹ️',
            'tip': '💡',
            'warning': '⚠️',
            'danger': '🚨'
        }
        emoji = emoji_map.get(alert_class, 'ℹ️')
        
        return f'<div class="alert alert-{alert_class}"><strong>{emoji} {match.group(1)}</strong><div style="margin-top: 8px;">{content}</div></div>'
        
    return re.sub(pattern, replacer, html_content, flags=re.DOTALL)

def wrap_tables_in_div(html_content):
    return re.sub(r'(<table>.*?</table>)', r'<div class="table-responsive">\1</div>', html_content, flags=re.DOTALL)

def format_mermaid_blocks(html_content):
    # Convert <pre><code class="language-mermaid">...</code></pre> to <div class="mermaid">...</div>
    pattern = r'<pre><code class="language-mermaid">(.*?)</code></pre>'
    
    def replacer(match):
        # Keep html entities intact inside code block to prevent html syntax errors.
        # Mermaid JS natively parses html entities inside graph nodes.
        code_text = match.group(1)
        return f'<pre class="mermaid">{code_text.strip()}</pre>'
        
    return re.sub(pattern, replacer, html_content, flags=re.DOTALL)

def get_h1_title(md_text, filename):
    # Extract first H1 text as clean title
    h1_match = re.search(r'^#\s+(.+)$', md_text, re.MULTILINE)
    if h1_match:
        return h1_match.group(1).strip()
        
    # Fallback title from filename
    # E.g. "01_TypeScript_심화_가이드.md" -> "TypeScript 심화 가이드"
    clean_name = re.sub(r'^\d+_(.+)\.md$', r'\1', filename)
    clean_name = clean_name.replace('_', ' ')
    return clean_name

def build_guides():
    # 1. Collect all md files and sort
    files = sorted([f for f in os.listdir(docs_dir) if f.endswith(".md")])
    
    doc_list = []
    for f in files:
        md_path = os.path.join(docs_dir, f)
        with open(md_path, 'r', encoding='utf-8') as file_obj:
            content = file_obj.read()
            
        title = get_h1_title(content, f)
        
        # Parse document numbering
        # E.g. "00_종합_가이드_목차.md" -> "00"
        num_match = re.match(r'^(\d+)', f)
        number = num_match.group(1) if num_match else "00"
        
        # Clean title (remove number prefix if it's already in the h1)
        # E.g. "0. 먼저 알고 가기" -> "먼저 알고 가기" or "00. 종합 목차"
        title = re.sub(r'^\d+\.\s*', '', title)
        
        html_filename = f.replace(".md", ".html")
        
        doc_list.append({
            "filename": f,
            "html_filename": html_filename,
            "number": number,
            "title": title
        })
        
    print(f"Collected {len(doc_list)} guides. Starting conversion...")
    
    # 2. Convert each file
    for doc in doc_list:
        md_path = os.path.join(docs_dir, doc["filename"])
        html_path = os.path.join(output_dir, doc["html_filename"])
        
        with open(md_path, 'r', encoding='utf-8') as f:
            md_text = f.read()
            
        # Parse to html
        html_body = markdown.markdown(md_text, extensions=['tables', 'fenced_code', 'toc'])
        
        # Post-processings
        html_body = parse_alert_blocks(html_body)
        html_body = wrap_tables_in_div(html_body)
        html_body = format_mermaid_blocks(html_body)
        
        # Wrap into standard layout
        full_html = make_html_layout(
            title=f"{doc['number']}. {doc['title']} - 프론트엔드 개발 가이드",
            body_content=html_body,
            doc_list=doc_list,
            current_filename=doc["filename"]
        )
        
        with open(html_path, 'w', encoding='utf-8') as out_f:
            out_f.write(full_html)
            
        print(f"Converted: {doc['filename']} -> {doc['html_filename']}")
        
    # 3. Create index.html pointing to 00_종합_가이드_목차.html
    index_path = os.path.join(output_dir, "index.html")
    index_content = """<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=00_종합_가이드_목차.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="00_종합_가이드_목차.html">00_종합_가이드_목차.html</a>...</p>
</body>
</html>
"""
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)
        
    print("Successfully built index.html redirection.")

if __name__ == "__main__":
    build_guides()
