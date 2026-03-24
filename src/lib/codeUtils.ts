export type EditorMode = 'single' | 'split' | 'react' | 'vue';

// ── 框架偵測 ─────────────────────────────────────────────────────────
export function detectFramework(code: string): EditorMode {
  // React
  if (
    /from\s+['"]react['"]/i.test(code) ||
    /import\s+React/i.test(code)
  ) return 'react';

  // Vue SFC: <template> + <script>
  if (
    /<template\b/i.test(code) && /<script\b/i.test(code)
  ) return 'vue';

  // Vue options/composition: import from 'vue' 或 createApp
  if (
    /from\s+['"]vue['"]/i.test(code) ||
    /Vue\.createApp|createApp\s*\(/i.test(code)
  ) return 'vue';

  return 'single';
}

// ── 將 React JSX 包裝成可在 iframe 中執行的完整 HTML ─────────────────
export function wrapReactForPreview(rawCode: string): string {
  let code = rawCode;

  // 擷取 React named imports → 轉為全域 React 解構
  const reactNamed: string[] = [];
  // 處理: import React, { useState, useEffect } from 'react'
  code = code.replace(/import\s+\w+\s*,\s*\{([^}]+)\}\s*from\s*['"]react['"]\s*;?\n?/g, (_, imports) => {
    reactNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()));
    return '';
  });
  // 處理: import { useState } from 'react'
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]react['"]\s*;?\n?/g, (_, imports) => {
    reactNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()));
    return '';
  });
  // 處理: import React from 'react'
  code = code.replace(/import\s+React[^'"]*from\s*['"]react['"]\s*;?\n?/g, '');
  code = code.replace(/import\s+(?:ReactDOM|\{[^}]*\})\s*from\s*['"]react-dom(?:\/client)?['"]\s*;?\n?/g, '');

  // 擷取 lucide-react imports → 轉為全域 LucideReact 解構
  const lucideNamed: string[] = [];
  // 處理: import { MapPin, Clock } from 'lucide-react' (可能跨多行)
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]\s*;?\n?/g, (_, imports) => {
    lucideNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean));
    return '';
  });

  // 移除剩餘所有 import
  code = code.replace(/^import\s+[^;]+;?\n?/gm, '');

  // 移除 export 關鍵字
  code = code.replace(/^export\s+default\s+(?=function|class)/gm, '');
  code = code.replace(/^export\s+default\s+\w+\s*;?\s*\n?/gm, '');
  code = code.replace(/^export\s+(?=function|class|const|let|var)/gm, '');

  // 找出根元件名稱
  const match = code.match(/^(?:function|class)\s+(\w+)/m) || code.match(/^const\s+(\w+)\s*=/m);
  const componentName = match?.[1] || 'App';

  // 建立解構行
  const destructures: string[] = [];
  const uniqueReact = [...new Set(reactNamed)].filter(Boolean);
  const uniqueLucide = [...new Set(lucideNamed)].filter(Boolean);
  if (uniqueReact.length > 0) destructures.push(`const { ${uniqueReact.join(', ')} } = React;`);
  if (uniqueLucide.length > 0) destructures.push(`const { ${uniqueLucide.join(', ')} } = LucideReact;`);

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>window.react = window.React;</script>
  <script src="https://unpkg.com/lucide-react/dist/umd/lucide-react.min.js"></script>
  <script>window.LucideReact = window.LucideReact || window.lucideReact || {};</script>
  <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${destructures.join('\n')}${destructures.length > 0 ? '\n\n' : ''}${code}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(${componentName})
);
  </script>
</body>
</html>`;
}

// ── 合併 HTML / CSS / JS 成完整文件 ──────────────────────────────────
export function mergeCode(html: string, css: string, js: string): string {
  const isComplete = /^\s*<!DOCTYPE|^\s*<html/i.test(html);
  if (isComplete && !css.trim() && !js.trim()) return html;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${css}
  </style>
</head>
<body>
${html}
  <script>
${js}
  </script>
</body>
</html>`;
}

// ── 將 Vue SFC / Options API 包裝成可在 iframe 中執行的完整 HTML ─────
export function wrapVueForPreview(rawCode: string): string {
  const isSFC = /<template\b/i.test(rawCode) && /<script\b/i.test(rawCode);

  if (isSFC) {
    // 擷取 <template>, <script>, <style>
    const templateMatch = rawCode.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
    const scriptMatch = rawCode.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
    const styleMatch = rawCode.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);

    const templateContent = templateMatch?.[1]?.trim() || '<div>No template</div>';
    let scriptContent = scriptMatch?.[1]?.trim() || '';
    const styleContent = styleMatch?.[1]?.trim() || '';

    // 移除 import 語句
    scriptContent = scriptContent.replace(/^import\s+[^;]+;?\n?/gm, '');
    // 將 export default 改為變數賦值
    scriptContent = scriptContent.replace(/export\s+default\s*/, 'const __component__ = ');

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <style>${styleContent}</style>
</head>
<body>
  <div id="app">${templateContent}</div>
  <script>
${scriptContent}
const app = Vue.createApp(typeof __component__ !== 'undefined' ? __component__ : {});
app.mount('#app');
  </script>
</body>
</html>`;
  }

  // Non-SFC: import { ref } from 'vue' 或 createApp 風格
  let code = rawCode;
  const vueNamed: string[] = [];
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]vue['"]\s*;?\n?/g, (_, imports) => {
    vueNamed.push(...imports.split(',').map((s: string) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean));
    return '';
  });
  code = code.replace(/import\s+[^;]*from\s*['"]vue['"]\s*;?\n?/g, '');
  code = code.replace(/^import\s+[^;]+;?\n?/gm, '');

  const destructures = vueNamed.length > 0
    ? `const { ${[...new Set(vueNamed)].join(', ')} } = Vue;\n`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
</head>
<body>
  <div id="app"></div>
  <script>
${destructures}${code}
  </script>
</body>
</html>`;
}

// ── 從 AI 回覆中提取程式碼區塊 ──────────────────────────────────────
export function extractCodeFromAIResponse(text: string): string | null {
  // Match ```html, ```tsx, ```jsx, ```vue, or plain ``` code blocks
  const codeBlockRegex = /```(?:html|tsx|jsx|vue|javascript|js|css)?\s*\n([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  return match ? match[1].trim() : null;
}

/**
 * Extract partial (in-progress) code from a streaming response where the closing
 * fence hasn't arrived yet. Returns null if no meaningful partial code found.
 */
export function extractPartialCode(text: string): string | null {
  // Look for opening fence that has no closing fence yet
  const fenceStart = text.search(/```(?:html|tsx|jsx|vue|javascript|js|css)?\s*\n/);
  if (fenceStart === -1) return null;
  const afterFence = text.slice(fenceStart).replace(/^```(?:html|tsx|jsx|vue|javascript|js|css)?\s*\n/, '');
  // If there's already a closing fence, extractCodeFromAIResponse handles it
  if (afterFence.includes('```')) return null;
  const partial = afterFence.trimEnd();
  // Only return if there's meaningful content (at least 30 chars)
  return partial.length >= 30 ? partial : null;
}

// ── 根據程式碼類型產生預覽用 HTML ────────────────────────────────────
export function generatePreviewDoc(code: string): string {
  if (!code) return '';
  const framework = detectFramework(code);
  if (framework === 'react') return wrapReactForPreview(code);
  if (framework === 'vue') return wrapVueForPreview(code);
  // For plain HTML, check if it's a complete document
  const isComplete = /^\s*<!DOCTYPE|^\s*<html/i.test(code);
  if (isComplete) return code;
  return mergeCode(code, '', '');
}
