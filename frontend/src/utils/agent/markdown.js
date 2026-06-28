/**
 * Markdown 渲染工具
 * 基于 markdown-it，安全配置：禁用原始 HTML、启用 linkify
 * 用于 Agent 消息气泡的 Markdown 格式渲染（标题/列表/加粗/代码块等）
 */
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,      // 禁用 HTML 标签（防 XSS）
  breaks: true,     // 单换行符转 <br>
  linkify: true,    // 自动识别链接
  typographer: false,
})

// 安全：限制链接协议（仅允许 http/https/mailto）
const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const href = tokens[idx].attrGet('href') || ''
  if (!/^(https?:|mailto:)/i.test(href)) {
    tokens[idx].attrSet('href', '#')
  }
  // 新窗口打开
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/**
 * 将 Markdown 文本渲染为 HTML
 * @param {string} text - Markdown 原文
 * @returns {string} 安全的 HTML
 */
export function renderMarkdown(text) {
  if (!text) return ''
  try {
    return md.render(text)
  } catch (e) {
    console.warn('markdown render error:', e)
    return text
  }
}
