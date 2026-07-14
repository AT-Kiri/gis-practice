/**
 * wiki-build.js — 从 wiki 页面生成静态 HTML 站点
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || process.cwd();
const wikiDir = path.join(projectRoot, '.trae', 'wiki');
const outputDir = path.join(wikiDir, 'wiki-site');

function walkPages(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPages(fullPath, fileList);
    } else if (entry.name.endsWith('.md') && entry.name !== 'INDEX.md' && entry.name !== 'LOG.md' && entry.name !== 'spec.md' && entry.name !== 'profile.md') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function parseFrontmatter(content) {
  const match = content.match(new RegExp('^---\\n([\\s\\S]*?)\\n---'));
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;
  for (const line of lines) {
    if (line.match(/^\s*-\s+(.+)$/)) {
      if (currentKey && currentArray) {
        const val = line.replace(/^\s*-\s+/, '').trim();
        if (val) currentArray.push(val);
      }
    } else if (line.match(/^(\w+):\s*(.*)$/)) {
      const key = RegExp.$1;
      const val = RegExp.$2.trim();
      if (val.startsWith('[')) {
        try { fm[key] = JSON.parse(val.replace(/'/g, '"')); } catch { fm[key] = []; }
        currentKey = null; currentArray = null;
      } else if (val === '') {
        fm[key] = []; currentKey = key; currentArray = fm[key];
      } else {
        fm[key] = val; currentKey = null; currentArray = null;
      }
    }
  }
  return fm;
}

function getMarkdownContent(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

/**
 * 标准化引用路径：确保 target 带 `pages/` 前缀
 * @param {string} ref - frontmatter 中的引用路径（如 "apis/rag-api.md" 或 "pages/apis/rag-api"）
 * @returns {string} - 标准化后的 ID（带 pages/ 前缀）
 */
function normalizeRef(ref) {
  // 统一去掉 .md 后缀
  let target = ref.replace(/\.md$/, '');
  // 如果已带 pages/ 前缀，直接使用；否则加上 pages/ 前缀
  return target.startsWith('pages/') ? target : 'pages/' + target;
}

function main() {
  const pages = walkPages(path.join(wikiDir, 'pages'));
  console.log('  扫描到 ' + pages.length + ' 个 wiki 页面');

  const typeConfig = {
    component: { label: '组件/实现', color: '#a78bfa', bg: '#4c1d95' },
    view:      { label: '页面', color: '#60a5fa', bg: '#1e3a8a' },
    entity:    { label: '实体', color: '#fb923c', bg: '#7c2d12' },
    api:       { label: '接口', color: '#34d399', bg: '#064e3b' },
    flow:      { label: '流程', color: '#22d3ee', bg: '#164e63' },
    concept:   { label: '概念', color: '#f472b6', bg: '#831843' },
  };

  const nodes = [];
  const edges = [];
  const pageData = {};

  // 第一遍：收集所有节点和页面数据
  for (const pagePath of pages) {
    const content = fs.readFileSync(pagePath, 'utf-8');
    const fm = parseFrontmatter(content);
    const md = getMarkdownContent(content);
    const relPath = path.relative(wikiDir, pagePath).replace(/\\/g, '/');
    const id = relPath.replace(/\.md$/, '');
    const title = fm.title || path.basename(pagePath, '.md');
    const type = fm.type || 'unknown';
    const status = fm.status || 'draft';
    const tags = fm.tags || [];
    const references = (fm.references || []).map(r => normalizeRef(r));
    const related = (fm.related || []).map(r => normalizeRef(r));
    const source = fm.source || [];
    const summary = fm.summary || '';
    nodes.push({ id, title, type, status, tags, summary, relPath });
    pageData[id] = { content: md, fm, references, related, source, type };
  }

  // 第二遍：构建边（此时已知道所有有效节点 ID）
  const nodeIds = new Set(nodes.map(n => n.id));
  let invalidRefCount = 0;
  for (const node of nodes) {
    const refs = pageData[node.id].references || [];
    const rels = pageData[node.id].related || [];
    for (const ref of refs) {
      const target = normalizeRef(ref);
      if (nodeIds.has(target)) {
        edges.push({ source: node.id, target, type: 'reference' });
      } else {
        invalidRefCount++;
        console.warn(`  ⚠ 引用跳过: ${node.id} -> ${target} (不存在)`);
      }
    }
    for (const rel of rels) {
      const target = normalizeRef(rel);
      if (nodeIds.has(target)) {
        edges.push({ source: node.id, target, type: 'related' });
      } else {
        invalidRefCount++;
        console.warn(`  ⚠ 关联跳过: ${node.id} -> ${target} (不存在)`);
      }
    }
  }

  if (invalidRefCount > 0) {
    console.log(`  ⚠ 共跳过 ${invalidRefCount} 个无效引用/关联`);
  }

  // 清理 pageData 中的无效引用/关联（避免前端展示断裂链接）
  for (const node of nodes) {
    if (pageData[node.id].references) {
      pageData[node.id].references = pageData[node.id].references.filter(r => nodeIds.has(r));
    }
    if (pageData[node.id].related) {
      pageData[node.id].related = pageData[node.id].related.filter(r => nodeIds.has(r));
    }
  }

  const html = generateHTML(nodes, edges, pageData, typeConfig);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputDir + '/index.html', html, 'utf-8');

  console.log('  输出: ' + outputDir);
  console.log('  节点: ' + nodes.length + ', 边: ' + edges.length);
}

function generateHTML(nodes, edges, pageData, typeConfig) {
  // JSON 序列化后，转义模板字面量定界符和插值占位符，
  // 避免嵌入外层模板字符串时被误解析
  const escapeForTemplate = (str) =>
    str.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  const nodesJson = escapeForTemplate(JSON.stringify(nodes));
  const edgesJson = escapeForTemplate(JSON.stringify(edges));
  const pageDataJson = escapeForTemplate(JSON.stringify(pageData));
  const typeConfigJson = escapeForTemplate(JSON.stringify(typeConfig));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>GIS-Practice Wiki</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7/dist/fuse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1e293b;color:#e2e8f0;height:100vh;display:flex;overflow:hidden}
.sidebar{width:320px;background:#0f172a;border-right:1px solid #334155;display:flex;flex-direction:column;transition:width .2s}
.sidebar.collapsed{width:0;overflow:hidden}
.sidebar-header{padding:16px;border-bottom:1px solid #334155}
.sidebar-header-row{display:flex;align-items:center;justify-content:space-between}
.sidebar-header h1{font-size:18px;color:#f1f5f9;margin-bottom:4px}
.sidebar-header p{font-size:11px;color:#64748b}
.sidebar-toggle{background:none;border:1px solid #475569;color:#94a3b8;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px}
.sidebar-toggle:hover{background:#334155;color:#e2e8f0}
.search-box{padding:12px 16px;border-bottom:1px solid #334155;position:relative}
.search-box input{width:100%;padding:10px 12px 10px 36px;background:#1e293b;border:1px solid #475569;border-radius:8px;color:#e2e8f0;font-size:14px}
.search-box input:focus{outline:none;border-color:#3b82f6}
.search-results{position:absolute;top:100%;left:16px;right:16px;background:#1e293b;border:1px solid #334155;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.3);z-index:100;max-height:300px;overflow-y:auto;display:none}
.search-results.active{display:block}
.search-result-item{padding:10px 12px;cursor:pointer;border-bottom:1px solid #334155;display:flex;align-items:center;gap:10px}
.search-result-item:hover{background:#334155}
.search-result-item .dot{width:8px;height:8px;border-radius:50%}
.nav-tree{flex:1;overflow-y:auto;padding:8px 0}
.nav-group{margin-bottom:8px}
.nav-group-title{padding:8px 16px 4px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px;cursor:pointer}
.nav-group-title:hover{color:#94a3b8}
.nav-group-arrow{font-size:8px;transition:transform .2s;display:inline-block}
.nav-group-title .count{color:#475569;font-weight:400}
.nav-item{padding:6px 16px 6px 24px;cursor:pointer;font-size:13px;color:#cbd5e1;border-left:3px solid transparent;transition:all .15s;display:flex;align-items:center;gap:8px}
.nav-item:hover{background:#334155;color:#f1f5f9}
.nav-item.active{background:#1e3a8a30;border-left-color:#3b82f6;color:#60a5fa}
.nav-item .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.toolbar{display:flex;align-items:center;gap:12px;padding:10px 20px;background:#0f172a;border-bottom:1px solid #334155}
.toolbar-btn{background:none;border:1px solid #475569;color:#94a3b8;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px}
.toolbar-btn:hover{background:#334155;color:#e2e8f0}
.toolbar-btn.active{background:#1e3a8a;border-color:#3b82f6;color:#60a5fa}
.toolbar-spacer{flex:1}
.sidebar-toggle-collapsed{position:fixed;top:12px;left:12px;z-index:100;width:36px;height:36px;border-radius:8px;background:rgba(30,41,59,.95);border:1px solid #334155;color:#94a3b8;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.sidebar-toggle-collapsed:hover{background:#334155;color:#e2e8f0}
.content{flex:1;overflow-y:auto;position:relative}
.page-view{padding:32px;max-width:900px;margin:0 auto}
.page-header{margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #334155}
.page-title{font-size:28px;font-weight:700;color:#f1f5f9;margin-bottom:12px}
.page-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.meta-tag{font-size:11px;padding:4px 10px;border-radius:12px;background:#334155;color:#94a3b8;font-weight:500}
.page-summary{color:#94a3b8;font-size:14px;margin-top:12px}
.markdown-body{line-height:1.8;color:#cbd5e1;font-size:15px}
.markdown-body h1{font-size:24px;color:#f1f5f9;margin:32px 0 16px;padding-bottom:8px;border-bottom:1px solid #334155}
.markdown-body h2{font-size:20px;color:#e2e8f0;margin:24px 0 12px}
.markdown-body h3{font-size:17px;color:#e2e8f0;margin:20px 0 10px}
.markdown-body p{margin:14px 0}
.markdown-body ul,.markdown-body ol{margin:14px 0;padding-left:24px}
.markdown-body li{margin:6px 0}
.markdown-body code{background:#1e293b;padding:3px 8px;border-radius:4px;font-size:13px;color:#f472b6;border:1px solid #334155}
.markdown-body pre{background:#0f172a;padding:20px;border-radius:8px;overflow-x:auto;margin:20px 0;border:1px solid #334155}
.markdown-body pre code{background:none;padding:0;color:#e2e8f0;border:none}
.markdown-body table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}
.markdown-body th,.markdown-body td{padding:10px 14px;border:1px solid #334155;text-align:left}
.markdown-body th{background:#1e293b;color:#f1f5f9;font-weight:600}
.markdown-body blockquote{border-left:3px solid #3b82f6;padding-left:16px;margin:20px 0;color:#94a3b8;font-style:italic}
.markdown-body a{color:#60a5fa;text-decoration:none}
.markdown-body a:hover{text-decoration:underline}
.markdown-body hr{border:none;border-top:1px solid #334155;margin:28px 0}
.refs-panel{margin-top:32px;padding-top:20px;border-top:1px solid #334155}
.refs-panel h3{font-size:13px;color:#64748b;margin-bottom:12px}
.ref-link{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;margin:4px;background:#1e293b;border:1px solid #334155;border-radius:16px;font-size:12px;color:#60a5fa;cursor:pointer}
.ref-link:hover{background:#334155}
.ref-link .dot{width:6px;height:6px;border-radius:50%}
.graph-view{position:absolute;top:0;left:0;right:0;bottom:0;background:#0f172a;display:none;overflow:hidden}
.graph-view.active{display:block}
.graph-svg{width:100%;height:100%;display:block}
.graph-controls{position:absolute;top:16px;left:16px;display:flex;flex-direction:column;gap:8px;z-index:10}
.graph-control-btn{width:36px;height:36px;border-radius:8px;background:rgba(30,41,59,.9);border:1px solid #334155;color:#94a3b8;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
.graph-control-btn:hover{background:#334155;color:#e2e8f0}
.graph-legend{position:absolute;bottom:16px;left:16px;background:rgba(15,23,42,.95);padding:14px 18px;border-radius:10px;font-size:12px;border:1px solid #334155;z-index:10}
.graph-legend h4{font-size:11px;color:#64748b;margin-bottom:8px}
.graph-legend-item{display:flex;align-items:center;gap:8px;margin:4px 0;color:#94a3b8}
.graph-legend-color{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.graph-node{cursor:pointer}
.graph-node circle{stroke:#0f172a;stroke-width:2px}
.graph-node text{font-size:11px;fill:#e2e8f0;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.graph-link{stroke-opacity:.3}
style</head>
<body>
<div class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-header-row">
      <div><h1>📚 GIS-Practice Wiki</h1><p>京津冀城市综合防灾应急管理项目</p></div>
      <button class="sidebar-toggle" id="sidebarToggle" title="收起侧栏">◀</button>
    </div>
  </div>
  <div class="search-box">
    <input type="text" id="searchInput" placeholder="搜索页面...">
    <div class="search-results" id="searchResults"></div>
  </div>
  <div class="nav-tree" id="navTree"></div>
</div>
<div class="main">
  <div class="toolbar">
    <button class="toolbar-btn active" id="pageTab" onclick="switchTab('page')">📄 页面</button>
    <button class="toolbar-btn" id="graphTab" onclick="switchTab('graph')">🕸️ 关联图谱</button>
    <div class="toolbar-spacer"></div>
    <button class="toolbar-btn sidebar-toggle-collapsed" id="sidebarExpandToggle" onclick="toggleSidebar()" title="展开侧栏" style="display:none;">☰</button>
  </div>
  <div class="content">
    <div class="page-view" id="pageView"></div>
    <div class="graph-view" id="graphView">
      <svg class="graph-svg" id="graphSvg"></svg>
      <div class="graph-controls">
        <button class="graph-control-btn" id="zoomIn">＋</button>
        <button class="graph-control-btn" id="zoomOut">－</button>
        <button class="graph-control-btn" id="zoomReset">⟳</button>
        <button class="graph-control-btn" id="toggleLabels">A</button>
      </div>
      <div class="graph-legend" id="graphLegend"></div>
    </div>
  </div>
</div>
<script>
const nodes = ${nodesJson};
const edges = ${edgesJson};
const pageData = ${pageDataJson};
const typeConfig = ${typeConfigJson};
let currentNodeId = null;
let fuse = null;
let simulation = null;
let graphTransform = d3.zoomIdentity;
let showLabels = true;

function init() {
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  initNav();
  initSearch();
  initGraphControls();
  showHome();
}

function showHome() {
  currentNodeId = null;
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
  var html = '';
  html += '<div class="page-header">';
  html += '<h1 class="page-title">🗺️ 京津冀城市综合防灾应急管理GIS 项目</h1>';
  html += '<div class="page-meta">';
  html += '<span class="meta-tag">总页面: ' + nodes.length + '</span>';
  html += '<span class="meta-tag">关联边: ' + edges.length + '</span>';
  html += '<span class="meta-tag">节点类型: ' + Object.keys(typeConfig).length + '</span>';
  html += '</div></div>';
  html += '<div class="markdown-body">';
  html += '<h2>📚 技术栈</h2>';
  html += '<table><thead><tr><th>层级</th><th>技术</th></tr></thead><tbody>';
  html += '<tr><td><strong>前端</strong></td><td>Vue 3 + Pinia + MapboxGL + Ant Design Vue</td></tr>';
  html += '<tr><td><strong>后端</strong></td><td>SpringBoot + MyBatis + SuperMap iServer 11i</td></tr>';
  html += '<tr><td><strong>AI Agent</strong></td><td>FastAPI + LangChain + DeepSeek LLM + FAISS</td></tr>';
  html += '<tr><td><strong>数据</strong></td><td>SuperMap iDesktopX 2025 + PostgreSQL</td></tr>';
  html += '<tr><td><strong>通信</strong></td><td>SSE (Server-Sent Events) + RESTful API</td></tr>';
  html += '</tbody></table>';
  html += '<h2>🏗️ 业务模块</h2>';
  html += '<pre>数字大屏 | 二维地图 | 三维洪水模拟 | 监测-预警-联动 | 地震指挥</pre>';
  html += '<h2>📊 节点统计</h2>';
  html += '<p>共 ' + nodes.length + ' 个页面，' + edges.length + ' 条关联边</p>';
  html += '</div>';
  document.getElementById('pageView').innerHTML = html;
}

function initNav() {
  var groups = {};
  nodes.forEach(function(n) { if (!groups[n.type]) groups[n.type] = []; groups[n.type].push(n); });
  var container = document.getElementById('navTree');
  container.innerHTML = '';
  var homeEl = document.createElement('div');
  homeEl.className = 'nav-item active';
  homeEl.dataset.id = 'home';
  homeEl.innerHTML = '🏠 项目总览';
  homeEl.onclick = function() { showHome(); };
  container.appendChild(homeEl);
  var collapsedGroups = JSON.parse(localStorage.getItem('wikiNavCollapsed') || '{}');
  Object.entries(groups).sort().forEach(function(ref) {
    var type = ref[0], items = ref[1];
    var cfg = typeConfig[type] || { label: type, color: '#94a3b8' };
    var groupEl = document.createElement('div');
    groupEl.className = 'nav-group';
    var isCollapsed = collapsedGroups[type] !== false;
    var titleEl = document.createElement('div');
    titleEl.className = 'nav-group-title';
    titleEl.innerHTML = '<span class="nav-group-arrow" style="transition:transform .2s;display:inline-block;' + (isCollapsed ? 'transform:rotate(-90deg)' : '') + '">▼</span><span class="dot" style="width:8px;height:8px;border-radius:50%;background:' + cfg.color + ';"></span> ' + cfg.label + ' <span class="count">(' + items.length + ')</span>';
    var itemsEl = document.createElement('div');
    itemsEl.className = 'nav-group-items';
    itemsEl.style.display = isCollapsed ? 'none' : 'block';
    titleEl.onclick = function() {
      var collapsed = itemsEl.style.display === 'none';
      itemsEl.style.display = collapsed ? 'block' : 'none';
      titleEl.querySelector('.nav-group-arrow').style.transform = collapsed ? '' : 'rotate(-90deg)';
      collapsedGroups[type] = !collapsed;
      localStorage.setItem('wikiNavCollapsed', JSON.stringify(collapsedGroups));
    };
    items.forEach(function(item) {
      var itemEl = document.createElement('div');
      itemEl.className = 'nav-item';
      itemEl.dataset.id = item.id;
      itemEl.innerHTML = '<span class="dot" style="width:6px;height:6px;border-radius:50%;background:' + cfg.color + ';"></span> ' + item.title;
      itemEl.onclick = function(e) { e.stopPropagation(); showPage(item.id); };
      itemsEl.appendChild(itemEl);
    });
    groupEl.appendChild(titleEl);
    groupEl.appendChild(itemsEl);
    container.appendChild(groupEl);
  });
}

function initSearch() {
  fuse = new Fuse(nodes, { keys: ['title', 'summary', 'tags'], threshold: 0.3 });
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  input.addEventListener('input', function(e) {
    var query = e.target.value.trim();
    if (!query) { results.classList.remove('active'); return; }
    var found = fuse.search(query).slice(0, 10);
    results.innerHTML = found.map(function(r) {
      var n = r.item;
      var cfg = typeConfig[n.type] || { color: '#94a3b8' };
      return '<div class="search-result-item" data-id="' + n.id + '"><span class="dot" style="background:' + cfg.color + '"></span><span>' + n.title + '</span></div>';
    }).join('');
    results.classList.toggle('active', found.length > 0);
  });
  results.addEventListener('click', function(e) {
    var item = e.target.closest('.search-result-item');
    if (item) { showPage(item.dataset.id); results.classList.remove('active'); }
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box')) results.classList.remove('active');
  });
}

function initGraphControls() {
  document.getElementById('zoomIn').onclick = function() { zoomBy(1.3); };
  document.getElementById('zoomOut').onclick = function() { zoomBy(0.7); };
  document.getElementById('zoomReset').onclick = resetZoom;
  document.getElementById('toggleLabels').onclick = toggleLabels;
  document.getElementById('sidebarToggle').onclick = toggleSidebar;
}

function zoomBy(factor) {
  var svg = d3.select('#graphSvg');
  var w = svg.attr('width'), h = svg.attr('height');
  var cx = w / 2, cy = h / 2;
  graphTransform = d3.zoomIdentity.translate(cx - (cx - graphTransform.x) * factor, cy - (cy - graphTransform.y) * factor).scale(graphTransform.k * factor);
  svg.select('g').transition().duration(300).attr('transform', graphTransform);
}

function resetZoom() {
  var svg = d3.select('#graphSvg');
  var w = svg.attr('width'), h = svg.attr('height');
  graphTransform = d3.zoomIdentity.translate(w * 0.15, h * 0.15).scale(0.7);
  svg.select('g').transition().duration(500).attr('transform', graphTransform);
}

function toggleLabels() {
  showLabels = !showLabels;
  d3.selectAll('.graph-node text').style('display', showLabels ? 'block' : 'none');
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var expandBtn = document.getElementById('sidebarExpandToggle');
  sidebar.classList.toggle('collapsed');
  expandBtn.style.display = sidebar.classList.contains('collapsed') ? 'flex' : 'none';
}

function showPage(id) {
  currentNodeId = id;
  var data = pageData[id];
  if (!data) return;
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.toggle('active', el.dataset.id === id); });
  var node = nodes.find(function(n) { return n.id === id; });
  var cfg = typeConfig[node.type] || { color: '#94a3b8' };
  var html = '';
  html += '<div class="page-header"><h1 class="page-title">' + node.title + '</h1>';
  html += '<div class="page-meta"><span class="meta-tag" style="background:' + cfg.bg + ';color:' + cfg.color + '">' + cfg.label + '</span><span class="meta-tag">状态: ' + node.status + '</span>';
  if (node.tags.length) html += '<span class="meta-tag">标签: ' + node.tags.join(', ') + '</span>';
  html += '</div><p class="page-summary">' + (node.summary || '') + '</p></div>';
  html += '<div class="markdown-body">' + marked.parse(data.content) + '</div>';
  if (data.references && data.references.length) {
    html += '<div class="refs-panel"><h3>被引用</h3>';
    data.references.forEach(function(r) {
      var rn = nodes.find(function(n) { return n.id === r.replace('.md', ''); });
      var rc = rn ? (typeConfig[rn.type] || { color: '#94a3b8' }) : { color: '#94a3b8' };
      var refId = r.replace('.md', '');
      var onclk = "showPage('" + refId + "')";
      html += '<span class="ref-link" onclick="' + onclk + '"><span class="dot" style="background:' + rc.color + '"></span>' + r + '</span>';
    });
    html += '</div>';
  }
  document.getElementById('pageView').innerHTML = html;
  mermaid.run({ querySelector: '.mermaid' });
}

function switchTab(tab) {
  var pageTab = document.getElementById('pageTab');
  var graphTab = document.getElementById('graphTab');
  var pageView = document.getElementById('pageView');
  var graphView = document.getElementById('graphView');
  if (tab === 'page') {
    pageTab.classList.add('active'); graphTab.classList.remove('active');
    pageView.style.display = 'block'; graphView.classList.remove('active');
  } else {
    pageTab.classList.remove('active'); graphTab.classList.add('active');
    pageView.style.display = 'none'; graphView.classList.add('active');
    requestAnimationFrame(function() { renderGraph(); });
  }
}

function renderGraph() {
  try {
    var svg = d3.select('#graphSvg');
    svg.selectAll('*').remove();
    var container = document.getElementById('graphView');
    var w = container.clientWidth || 1200;
    var h = container.clientHeight || 800;
    svg.attr('width', w).attr('height', h);
    var nodeIds = new Set(nodes.map(function(n) { return n.id; }));
    var validEdges = edges.filter(function(e) {
      var s = typeof e.source === 'string' ? e.source : e.source && e.source.id;
      var t = typeof e.target === 'string' ? e.target : e.target && e.target.id;
      return nodeIds.has(s) && nodeIds.has(t);
    });
    var degreeMap = {};
    nodes.forEach(function(n) { degreeMap[n.id] = 0; });
    validEdges.forEach(function(e) {
      var s = typeof e.source === 'string' ? e.source : e.source && e.source.id;
      var t = typeof e.target === 'string' ? e.target : e.target && e.target.id;
      degreeMap[s] = (degreeMap[s] || 0) + 1;
      degreeMap[t] = (degreeMap[t] || 0) + 1;
    });
    var isolatedNodes = nodes.filter(function(n) { return degreeMap[n.id] === 0; });
    var connectedNodes = nodes.filter(function(n) { return degreeMap[n.id] > 0; });
    isolatedNodes.forEach(function(n, i) {
      var angle = (i / isolatedNodes.length) * Math.PI * 2;
      var radius = Math.min(w, h) * 0.4;
      n.x = w / 2 + Math.cos(angle) * radius;
      n.y = h / 2 + Math.sin(angle) * radius;
      n.fx = n.x; n.fy = n.y;
    });
    simulation = d3.forceSimulation(connectedNodes)
      .force('link', d3.forceLink(validEdges).id(function(d) { return d.id; }).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400).distanceMax(500))
      .force('center', d3.forceCenter(w / 2, h / 2).strength(0.08))
      .force('collision', d3.forceCollide().radius(25))
      .alphaDecay(0.025);
    var g = svg.append('g');
    var zoom = d3.zoom().scaleExtent([0.1, 5]).on('zoom', function(event) { graphTransform = event.transform; g.attr('transform', event.transform); });
    svg.call(zoom);
    graphTransform = d3.zoomIdentity.translate(w * 0.15, h * 0.15).scale(0.7);
    svg.call(zoom.transform, graphTransform);
    var link = g.append('g').selectAll('line').data(validEdges).enter().append('line').attr('class', 'graph-link').attr('stroke', function(d) { return d.type === 'reference' ? '#3b82f6' : '#475569'; }).attr('stroke-width', 1);
    var allNodes = g.append('g').selectAll('g').data(nodes).enter().append('g').attr('class', 'graph-node')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended))
      .on('click', function(event, d) { if (d.id) { switchTab('page'); showPage(d.id); } });
    allNodes.append('circle').attr('r', function(d) { var deg = degreeMap[d.id] || 0; return 8 + Math.min(deg * 3, 20); }).attr('fill', function(d) { var cfg = typeConfig[d.type]; return cfg ? cfg.color : '#94a3b8'; }).attr('opacity', function(d) { return degreeMap[d.id] === 0 ? 0.3 : 1; });
    allNodes.append('text').attr('dx', function(d) { return 12 + Math.min(degreeMap[d.id] || 0, 10) * 2; }).attr('dy', 5).style('font-size', function(d) { return d.id && degreeMap[d.id] > 4 ? '13px' : '11px'; }).text(function(d) { return d.title.length > 10 ? d.title.slice(0, 10) + '...' : d.title; });
    allNodes.append('title').text(function(d) { return d.title + ' (' + (typeConfig[d.type] && typeConfig[d.type].label || d.type) + ')'; });
    simulation.on('tick', function() {
      link.attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; }).attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
      allNodes.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });
    function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; if (degreeMap[d.id] === 0) { d.fx = null; d.fy = null; } }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
    var legendEl = document.getElementById('graphLegend');
    legendEl.innerHTML = '<h4>节点类型</h4>' + Object.entries(typeConfig).map(function(ref) { var t = ref[0], cfg = ref[1]; var count = nodes.filter(function(n) { return n.type === t; }).length; return '<div class="graph-legend-item"><div class="graph-legend-color" style="background:' + cfg.color + '"></div><span>' + cfg.label + ' (' + count + ')</span></div>'; }).join('');
  } catch (e) { console.error('renderGraph error:', e); }
}

init();
window.addEventListener('resize', function() { if (document.getElementById('graphView').classList.contains('active')) renderGraph(); });
</script>
</body></html>`;
}

if (require.main === module) { main(); }
module.exports = { main };
