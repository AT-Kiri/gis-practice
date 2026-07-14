/**
 * wiki-scan.js — 扫描项目代码，生成 wiki stub 页面
 *
 * 用法：node wiki-scan.js [projectRoot] [--dry-run]
 *
 * 扫描规则（7 种页面类型）：
 * - frontend/src/components/*.vue → pages/components/{kebab}.md (type: component)
 * - frontend/src/views/*.vue      → pages/views/{kebab}.md      (type: view)
 * - agent-backend/app/api/*.py    → pages/apis/{kebab}.md        (type: api)
 * - agent-backend/app/services/*.py → pages/services/{kebab}.md    (type: service)
 * - agent-backend/app/tools/*.py    → pages/services/{kebab}.md    (type: service)
 * - agent-backend/app/agent/*.py   → pages/components/{kebab}.md (type: component)
 * - agent-backend/app/schemas/*.py  → pages/entities/{kebab}.md   (type: entity)
 * - backend/.../controller/*Controller.java → pages/apis/{kebab}.md (type: api)
 * - backend/.../entity/*.java     → pages/entities/{kebab}.md   (type: entity)
 * - backend/.../service/*Service.java → pages/services/{kebab}.md (type: service)
 *
 * ⚠️ 废弃目录（扫描后自动删除）：
 * stores/ tools/ schemas/ decisions/ descriptions/
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
  {
    pattern: /^src[\\/]components[\\/](.+)\.vue$/,
    type: 'component',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^src[\\/]views[\\/](.+)\.vue$/,
    type: 'view',
    targetDir: 'views',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^src[\\/]stores[\\/](.+)\.js$/,
    type: 'service',
    targetDir: 'services',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]api[\\/](.+)\.py$/,
    type: 'api',
    targetDir: 'apis',
    getTitle: (name) => `${name} API`,
  },
  {
    pattern: /^app[\\/]services[\\/](.+)\.py$/,
    type: 'service',
    targetDir: 'services',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]tools[\\/](.+)\.py$/,
    type: 'service',
    targetDir: 'services',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]agent[\\/](.+)\.py$/,
    type: 'component',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]agent[\\/]nodes[\\/](.+)\.py$/,
    type: 'component',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]agent[\\/]sub_agents[\\/](.+)\.py$/,
    type: 'component',
    targetDir: 'components',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]schemas[\\/](.+)\.py$/,
    type: 'entity',
    targetDir: 'entities',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^app[\\/]config\.py$/,
    type: 'concept',
    targetDir: 'concepts',
    fixedName: 'app-config',
    getTitle: () => '应用配置',
  },
  {
    pattern: /^app[\\/]main\.py$/,
    type: 'component',
    targetDir: 'components',
    fixedName: 'fastapi-main',
    getTitle: () => 'FastAPI 主入口',
  },
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]controller[\\/](.+)Controller\.java$/,
    type: 'api',
    targetDir: 'apis',
    getTitle: (name) => `${name} API`,
  },
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]entity[\\/](.+)\.java$/,
    type: 'entity',
    targetDir: 'entities',
    getTitle: (name) => name.replace(/([A-Z])/g, ' $1').trim(),
  },
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]common[\\/]R\.java$/,
    type: 'entity',
    targetDir: 'entities',
    fixedName: 'response-wrapper',
    getTitle: () => '统一响应 R<T>',
  },
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]dto[\\/](.+)DTO\.java$/,
    type: 'entity',
    targetDir: 'entities',
    getTitle: (name) => `${name} DTO`,
  },
  {
    pattern: /^src[\\/]main[\\/]java[\\/].+[\\/]service[\\/](.+)Service\.java$/,
    type: 'service',
    targetDir: 'services',
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
  // BufferAnalysisModal → Buffer Analysis Modal
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
      // 支持固定名（如 response-wrapper）和捕获组名
      const rawName = rule.fixedName || match[1] || '';
      // 将路径分隔符替换为 -，然后每个部分转 kebab-case
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
  return `---
title: ${meta.title}
type: ${meta.type}
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

  // 确保目录存在（7 种页面类型）
  if (!dryRun) {
    const dirs = ['components', 'views', 'entities', 'apis', 'flows', 'concepts', 'services'];
    for (const d of dirs) {
      fs.mkdirSync(path.join(pagesDir, d), { recursive: true });
    }
  }

  // 扫描 frontend、backend 和 agent-backend
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
    // 计算相对路径（相对于 frontend 或 backend）
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

    // 跳过已存在
    if (fs.existsSync(targetFile)) {
      stats.skipped++;
      continue;
    }

    // 记录统计
    stats.rules[rule.targetDir] = (stats.rules[rule.targetDir] || 0) + 1;

    // 构建 meta
    const sourceRelative = filePath.replace(projectRoot + path.sep, '').replace(/\\/g, '/');
    const meta = {
      title,
      type: rule.type,
      date: today(),
      sourcePath: sourceRelative,
    };

    // 生成 frontmatter
    const content = generateFrontmatter(meta);

    if (!dryRun) {
      fs.writeFileSync(targetFile, content, 'utf-8');
    }

    stats.created++;
    console.log(`  ✓ ${rule.targetDir}/${name}.md ← ${sourceRelative}`);
  }

  // 清理废弃目录
  const DEPRECATED_DIRS = ['stores', 'tools', 'schemas', 'decisions', 'descriptions'];
  for (const d of DEPRECATED_DIRS) {
    const dirPath = path.join(pagesDir, d);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      if (files.length === 0) {
        if (!dryRun) {
          fs.rmdirSync(dirPath);
          console.log(`  🗑️  删除废弃目录: pages/${d}/`);
        }
      }
    }
  }

  // 输出统计
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
