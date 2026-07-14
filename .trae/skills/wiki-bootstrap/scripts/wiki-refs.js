/**
 * wiki-refs.js — 解析 wiki 页面的 source 字段，计算 import 反推引用关系
 *
 * 用法：node wiki-refs.js [projectRoot]
 *
 * 逻辑：
 * 1. 扫描 pages/ 下所有 wiki 页面
 * 2. 读取每个页面的 frontmatter source 字段
 * 3. 解析 source 文件中的 import 语句
 * 4. 将 import 路径映射回 wiki 页面路径
 * 5. 输出 references/auto.json
 *
 * 输出格式：
 * {
 *   "generated": "YYYY-MM-DD",
 *   "references": {
 *     "pages/components/Foo.md": [
 *       "pages/views/Home.md",
 *       "pages/components/Bar.md"
 *     ]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || process.cwd();
const wikiDir = path.join(projectRoot, '.trae', 'wiki');
const pagesDir = path.join(wikiDir, 'pages');

// ─── 忽略的 import ───────────────────────────────────

const IGNORED_IMPORTS = [
  'vue',
  'vue-router',
  'pinia',
  '@supermap',
  '@supermap/iclient-mapboxgl',
  '@supermap/vue-iclient-mapboxgl',
  'ant-design-vue',
  'axios',
  'element-plus',
  '@ant-design',
  'lodash',
  'dayjs',
  'echarts',
  'mapbox-gl',
  'ol',
  'springframework',
  'java.',
  'javax.',
  'com.fasterxml',
  'org.slf4j',
  'lombok',
  'mybatis',
  'baomidou',
];

// ─── 工具函数 ───────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function walkPages(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPages(fullPath, fileList);
    } else if (entry.name.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s+(.+)$/)) {
      // 数组项
      if (currentKey && currentArray) {
        const val = line.replace(/^\s*-\s+/, '').trim();
        if (val) currentArray.push(val);
      }
    } else if (line.match(/^(\w+):\s*(.*)$/)) {
      const key = RegExp.$1;
      const val = RegExp.$2.trim();
      if (val.startsWith('[')) {
        // 行内数组
        try {
          fm[key] = JSON.parse(val.replace(/'/g, '"'));
        } catch {
          fm[key] = [];
        }
        currentKey = null;
        currentArray = null;
      } else if (val === '') {
        // 可能是数组开始
        fm[key] = [];
        currentKey = key;
        currentArray = fm[key];
      } else {
        fm[key] = val;
        currentKey = null;
        currentArray = null;
      }
    }
  }
  return fm;
}

function extractImportsFromFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  const imports = [];

  if (ext === '.vue' || ext === '.js') {
    // Vue/JS: import X from 'Y' 或 import { X } from 'Y'
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      imports.push(m[1]);
    }
  } else if (ext === '.java') {
    // Java: import com.xxx.yyy.ClassName;
    const importRegex = /import\s+([\w.]+);/g;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      imports.push(m[1]);
    }
  }

  return imports;
}

function shouldIgnoreImport(importPath) {
  for (const prefix of IGNORED_IMPORTS) {
    if (importPath.startsWith(prefix)) return true;
  }
  return false;
}

function resolveImportToWikiPath(importPath, sourceFile) {
  // 尝试将 import 路径映射到 wiki 页面路径
  // 例如：
  //   ../components/SmMapViewer.vue → pages/components/sm-map-viewer.md
  //   @/components/SmMapViewer.vue → pages/components/sm-map-viewer.md
  //   ./WeatherPanel.vue → pages/components/weather-panel.md

  // 只处理相对路径和 @/ 开头的路径
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return null;
  }

  // 解析相对路径
  const sourceDir = path.dirname(sourceFile);
  let resolvedPath = '';

  if (importPath.startsWith('@/')) {
    // @/ 映射到 frontend/src/
    resolvedPath = path.join(projectRoot, 'frontend', 'src', importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    resolvedPath = path.resolve(sourceDir, importPath);
  } else {
    return null;
  }

  // 检查文件是否存在（尝试加扩展名）
  const extensions = ['.vue', '.js', '.java', '.ts'];
  let actualPath = null;
  for (const ext of extensions) {
    if (fs.existsSync(resolvedPath + ext)) {
      actualPath = resolvedPath + ext;
      break;
    }
  }
  if (!actualPath && fs.existsSync(resolvedPath)) {
    actualPath = resolvedPath;
  }
  if (!actualPath) return null;

  // 将文件路径映射到 wiki 页面路径
  const relativeToProject = path.relative(projectRoot, actualPath).replace(/\\/g, '/');

  // 匹配到 wiki 页面
  const wikiPathMap = [
    { pattern: /^frontend\/src\/components\/(.+)\.vue$/, target: 'pages/components/' },
    { pattern: /^frontend\/src\/views\/(.+)\.vue$/, target: 'pages/views/' },
    { pattern: /^frontend\/src\/stores\/(.+)\.js$/, target: 'pages/components/' },
    { pattern: /^agent-backend\/app\/api\/(.+)\.py$/, target: 'pages/apis/' },
    { pattern: /^agent-backend\/app\/services\/(.+)\.py$/, target: 'pages/components/' },
    { pattern: /^agent-backend\/app\/tools\/(.+)\.py$/, target: 'pages/components/' },
    { pattern: /^agent-backend\/app\/agent\/(.+)\.py$/, target: 'pages/components/' },
    { pattern: /^agent-backend\/app\/agent\/nodes\/(.+)\.py$/, target: 'pages/components/' },
    { pattern: /^agent-backend\/app\/agent\/sub_agents\/(.+)\.py$/, target: 'pages/components/' },
    { pattern: /^agent-backend\/app\/schemas\/(.+)\.py$/, target: 'pages/entities/' },
    { pattern: /^agent-backend\/app\/config\.py$/, target: 'pages/concepts/app-config.md' },
    { pattern: /^agent-backend\/app\/main\.py$/, target: 'pages/components/fastapi-main.md' },
    { pattern: /^backend\/src\/main\/java\/com\/gis\/emergency\/controller\/(.+)Controller\.java$/, target: 'pages/apis/' },
    { pattern: /^backend\/src\/main\/java\/com\/gis\/emergency\/entity\/(.+)\.java$/, target: 'pages/entities/' },
    { pattern: /^backend\/src\/main\/java\/com\/gis\/emergency\/common\/R\.java$/, target: 'pages/entities/response-wrapper.md' },
    { pattern: /^backend\/src\/main\/java\/com\/gis\/emergency\/service\/(.+)Service\.java$/, target: 'pages/components/' },
  ];

  for (const map of wikiPathMap) {
    const match = relativeToProject.match(map.pattern);
    if (match) {
      const name = toKebabCase(match[1].replace(/\//g, '-'));
      if (map.target.endsWith('.md')) {
        return map.target;
      }
      return map.target + name + '.md';
    }
  }

  return null;
}

function toKebabCase(str) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[-\s]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}

// ─── 主逻辑 ─────────────────────────────────────────

function main() {
  const references = {};

  // 1. 扫描所有 wiki 页面
  const wikiPages = walkPages(pagesDir);
  console.log(`  扫描到 ${wikiPages.length} 个 wiki 页面`);

  // 2. 建立 wiki 页面路径集合（用于快速查找）
  const wikiPageSet = new Set(
    wikiPages.map((p) => path.relative(wikiDir, p).replace(/\\/g, '/'))
  );

  // 3. 遍历每个 wiki 页面
  for (const wikiFile of wikiPages) {
    const content = fs.readFileSync(wikiFile, 'utf-8');
    const fm = parseFrontmatter(content);
    const sources = Array.isArray(fm.source) ? fm.source : (fm.source ? [fm.source] : []);

    if (sources.length === 0) continue;

    const wikiRelPath = path.relative(wikiDir, wikiFile).replace(/\\/g, '/');
    const refs = new Set();

    for (const source of sources) {
      // 解析 source 文件路径
      const sourceFile = path.join(projectRoot, source);
      if (!fs.existsSync(sourceFile)) continue;

      // 提取 import
      const imports = extractImportsFromFile(sourceFile);

      for (const imp of imports) {
        if (shouldIgnoreImport(imp)) continue;

        // 将 import 映射到 wiki 页面
        const wikiPath = resolveImportToWikiPath(imp, sourceFile);
        if (wikiPath && wikiPageSet.has(wikiPath) && wikiPath !== wikiRelPath) {
          refs.add(wikiPath);
        }
      }
    }

    if (refs.size > 0) {
      references[wikiRelPath] = Array.from(refs);
    }
  }

  // 4. 输出 auto.json
  const output = {
    generated: today(),
    references,
  };

  const outputPath = path.join(wikiDir, 'references', 'auto.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`  输出: ${path.relative(projectRoot, outputPath)}`);
  console.log(`  引用关系: ${Object.keys(references).length} 个页面`);

  return output;
}

// ─── 入口 ───────────────────────────────────────────

if (require.main === module) {
  main();
}

module.exports = { main, parseFrontmatter, extractImportsFromFile, resolveImportToWikiPath };
