/**
 * wiki-scan.js — 扫描项目代码，生成 wiki stub 页面
 *
 * 用法：node wiki-scan.js [projectRoot] [--dry-run]
 *
 * 扫描规则（6 种页面类型）：
 * - frontend/src/components/*.vue → pages/components/{kebab}.md (type: component, tech: vue)
 * - frontend/src/views/*.vue      → pages/views/{kebab}.md      (type: view)
 * - frontend/src/stores/*.js       → pages/components/{kebab}.md (type: component, tech: store)
 * - agent-backend/app/api/*.py    → pages/apis/{kebab}.md        (type: api)
 * - agent-backend/app/services/*.py → pages/components/{kebab}.md (type: component, tech: python)
 * - agent-backend/app/tools/*.py    → pages/components/{kebab}.md (type: component, tech: python)
 * - agent-backend/app/agent/*.py   → pages/components/{kebab}.md (type: component, tech: fastapi)
 * - agent-backend/app/schemas/*.py  → pages/entities/{kebab}.md   (type: entity)
 * - backend/.../controller/*Controller.java → pages/apis/{kebab}.md (type: api)
 * - backend/.../entity/*.java     → pages/entities/{kebab}.md   (type: entity)
 * - backend/.../service/*Service.java → pages/components/{kebab}.md (type: component, tech: java)
 *
 * 注意：
 * - 跳过 node_modules/、dist/、.git/、.trae/
 * - 跳过已存在的 stub（不覆盖）
 * - type 不确定的标记为 draft，需人工确认
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || process.cwd();
const dryRun = process.argv.includes('--dry-run');
const wikiDir = path.join(projectRoot, '.trae', 'wiki');
const pagesDir = path.join(wikiDir, 'pages');

// ─── 配置 ───────────────────────────────────────────

const SCAN_RULES = [
  // Vue 组件
  {
    pattern: /^src[\\/]components[\\/](.+)\.vue$/,
    type: 'component',
    tech: 'vue',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // 路由页面
  {
    pattern: /^src[\\/]views[\\/](.+)\.vue$/,
    type: 'view',
    targetDir: 'views',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // Pinia Store
  {
    pattern: /^src[\\/]stores[\\/](.+)\.js$/,
    type: 'component',
    tech: 'store',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // FastAPI API
  {
    pattern: /^app[\\/]api[\\/](.+)\.py$/,
    type: 'api',
    targetDir: 'apis',
    getTitle: (name) => `${name} API`,
  },
  // Python 服务
  {
    pattern: /^app[\\/]services[\\/](.+)\.py$/,
    type: 'component',
    tech: 'python',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // Python 工具
  {
    pattern: /^app[\\/]tools[\\/](.+)\.py$/,
    type: 'component',
    tech: 'python',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // FastAPI Agent 核心
  {
    pattern: /^app[\\/]agent[\\/](.+)\.py$/,
    type: 'component',
    tech: 'fastapi',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]agent[\\/]nodes[\\/](.+)\.py$/,
    type: 'component',
    tech: 'fastapi',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]agent[\\/]sub_agents[\\/](.+)\.py$/,
    type: 'component',
    tech: 'fastapi',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // Schema → entity
  {
    pattern: /^app[\\/]schemas[\\/](.+)\.py$/,
    type: 'entity',
    targetDir: 'entities',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // 配置 → concept
  {
    pattern: /^app[\\/]config\.py$/,
    type: 'concept',
    targetDir: 'concepts',
    fixedName: 'app-config',
    getTitle: () => '应用配置',
  },
  // FastAPI 主入口
  {
    pattern: /^app[\\/]main\.py$/,
    type: 'component',
    tech: 'fastapi',
    targetDir: 'components',
    fixedName: 'fastapi-main',
    getTitle: () => 'FastAPI 主入口 main',
  },
  // Java Controller → api
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]controller[\\/](.+)Controller\.java$/,
    type: 'api',
    targetDir: 'apis',
    getTitle: (name) => `${name} API`,
  },
  // Java Entity → entity
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]entity[\\/](.+)\.java$/,
    type: 'entity',
    targetDir: 'entities',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  // Java 通用响应 → entity
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]common[\\/]R\.java$/,
    type: 'entity',
    targetDir: 'entities',
    fixedName: 'response-wrapper',
    getTitle: () => '统一响应 R<T>',
  },
  // Java DTO → entity
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]dto[\\/](.+)DTO\.java$/,
    type: 'entity',
    targetDir: 'entities',
    getTitle: (name) => `${name} DTO`,
  },
  // Java Service → component (tech: java)
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]service[\\/](.+)Service\.java$/,
    type: 'component',
    tech: 'java',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
];

const SKIP_DIRS = ['node_modules', 'dist', '.git', '.trae', 'build', 'target', '__tests__'];

// ─── 工具函数 ───────────────────────────────────────

function toKebabCase(str) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[-\s]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}

function toReadableTitle(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function findMatchingRule(filePath, relativePath) {
  for (const rule of SCAN_RULES) {
    const match = relativePath.match(rule.pattern);
    if (match) {
      const rawName = rule.fixedName || match[1] || '';
      const name = rule.fixedName || rawName.split(/[\\/]/).map(toKebabCase).join('-');
      return {
        rule,
        name,
        title: rule.getTitle(rawName),
      };
    }
  }
  return null;
}

function generateFrontmatter(meta) {
  let techLine = meta.tech ? `\ntech: ${meta.tech}` : '';
  return `---
title: ${meta.title}
type: ${meta.type}${techLine}
status: draft
created: ${meta.date}
updated: ${meta.date}
tags: []
references: []
related: []
source:
  - ${meta.sourcePath}
summary: （待补充）
---

# ${meta.title}

> 状态：draft — 待补充内容

## 基本信息

（待补充）

## 关联

（待补充）
`;
}

// ─── 主逻辑 ─────────────────────────────────────────

function main() {
  const stats = {
    created: 0,
    skipped: 0,
    rules: {},
    uncertain: [],
  };

  // 确保目录存在（6 种页面类型）
  if (!dryRun) {
    const dirs = ['components', 'views', 'entities', 'apis', 'flows', 'concepts'];
    for (const d of dirs) {
      fs.mkdirSync(path.join(pagesDir, d), { recursive: true });
    }
  }

  const scanDirs = [
    path.join(projectRoot, 'frontend'),
    path.join(projectRoot, 'backend'),
    path.join(projectRoot, 'agent-backend'),
  ];

  const allFiles = [];
  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) {
      walkDir(dir, allFiles);
    }
  }

  for (const filePath of allFiles) {
    let relativePath = '';
    if (filePath.includes(`${path.sep}frontend${path.sep}`)) {
      relativePath = filePath.split(`${path.sep}frontend${path.sep}`)[1];
    } else if (filePath.includes(`${path.sep}backend${path.sep}`)) {
      relativePath = filePath.split(`${path.sep}backend${path.sep}`)[1];
    }

    if (!relativePath) continue;

    const match = findMatchingRule(filePath, relativePath);
    if (!match) continue;

    const { rule, name, title } = match;
    const targetFile = path.join(pagesDir, rule.targetDir, `${name}.md`);

    if (fs.existsSync(targetFile)) {
      stats.skipped++;
      continue;
    }

    stats.rules[rule.targetDir] = (stats.rules[rule.targetDir] || 0) + 1;

    const sourceRelative = filePath.replace(projectRoot + path.sep, '').replace(/\\/g, '/');
    const meta = {
      title,
      type: rule.type,
      tech: rule.tech || null,
      date: today(),
      sourcePath: sourceRelative,
    };

    const content = generateFrontmatter(meta);

    if (!dryRun) {
      fs.writeFileSync(targetFile, content, 'utf-8');
    }

    stats.created++;
    console.log(`  ✓ ${rule.targetDir}/${name}.md ← ${sourceRelative}`);
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}扫描完成`);
  console.log(`  创建: ${stats.created}`);
  console.log(`  跳过（已存在）: ${stats.skipped}`);
  console.log('  分类统计:');
  for (const [dir, count] of Object.entries(stats.rules)) {
    console.log(`    ${dir}: ${count}`);
  }

  return stats;
}

// ─── 入口 ───────────────────────────────────────────

if (require.main === module) {
  main();
}

module.exports = { main, toKebabCase, toReadableTitle };
