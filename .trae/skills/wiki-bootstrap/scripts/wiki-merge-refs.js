/**
 * wiki-merge-refs.js — 将 auto.json 的 references 合并到 wiki 页面 frontmatter
 *
 * 用法：node wiki-merge-refs.js [projectRoot]
 *
 * 合并规则：
 * - 已存在的引用不重复添加
 * - 自动计算的引用标记来源为 auto
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || process.cwd();
const wikiDir = path.join(projectRoot, '.trae', 'wiki');
const autoJsonPath = path.join(wikiDir, 'references', 'auto.json');

// ─── 工具函数 ───────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { before: content, fm: {}, after: '' };
  return {
    before: content.slice(0, match.index + match[0].length),
    fm: match[1],
    after: content.slice(match.index + match[0].length),
  };
}

function parseFM(fmStr) {
  const fm = {};
  const lines = fmStr.split('\n');
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
        try {
          fm[key] = JSON.parse(val.replace(/'/g, '"'));
        } catch {
          fm[key] = [];
        }
        currentKey = null;
        currentArray = null;
      } else if (val === '') {
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

function serializeFM(fm) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(fm)) {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const v of val) {
          lines.push(`  - ${v}`);
        }
      }
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// ─── 主逻辑 ─────────────────────────────────────────

// 技术引用黑名单：这些路径之间的引用不表示业务关系，不应自动合并
const TECH_REF_BLACKLIST = new Set([
  'pages/services/map.md',      // Pinia store（map 状态管理）
  'pages/services/agent.md',    // Pinia store（agent 状态管理）
  'pages/services/session-store.md',
]);

function isBusinessReference(source, target) {
  // 排除已废弃目录
  if (target.startsWith('pages/stores/')) return false;
  // 排除黑名单
  if (TECH_REF_BLACKLIST.has(target)) return false;
  // 排除纯服务层内部引用（services/ → services/）
  if (source.startsWith('pages/services/') && target.startsWith('pages/services/')) return false;
  // 排除 concepts → concepts（概念间不建立图谱关系）
  if (source.startsWith('pages/concepts/') && target.startsWith('pages/concepts/')) return false;
  return true;
}

function main() {
  const auto = JSON.parse(fs.readFileSync(autoJsonPath, 'utf-8'));
  const refs = auto.references;

  let updated = 0;
  let skipped = 0;

  for (const [wikiPath, newRefs] of Object.entries(refs)) {
    const fullPath = path.join(wikiDir, wikiPath);
    if (!fs.existsSync(fullPath)) {
      console.log('  ✗ ' + wikiPath + ' (文件不存在)');
      skipped++;
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const parsed = parseFrontmatter(content);
    const fm = parseFM(parsed.fm);

    // 合并 references（过滤技术引用）
    const existing = new Set(fm.references || []);
    const merged = [...existing];
    let added = 0;

    for (const ref of newRefs) {
      if (!existing.has(ref) && isBusinessReference(wikiPath, ref)) {
        merged.push(ref);
        added++;
      }
    }

    if (added > 0) {
      fm.references = merged;
      const newContent = serializeFM(fm) + parsed.after;
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      console.log('  ✓ ' + wikiPath + ' (+' + added + ' 引用)');
      updated++;
    } else {
      console.log('  - ' + wikiPath + ' (无变化)');
      skipped++;
    }
  }

  console.log('\n合并完成：更新 ' + updated + ' 个，跳过 ' + skipped + ' 个');
}

if (require.main === module) {
  main();
}

module.exports = { main, parseFM, serializeFM };
