/**
 * Formats text with custom formatting syntax
 * _underlined_ = underline
 * ___italic___ = italic
 * *bold* = bold
 * -strikethrough- = strikethrough
 * `quoted` = quote/inline code
 * ```code block``` = code block
 */
export function formatMessageText(text: string): string {
  // Escape HTML to prevent XSS attacks
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Code blocks (```code```) - must be processed first
  formatted = formatted.replace(
    /```([\s\S]*?)```/g,
    '<pre class="bg-gray-800 text-gray-100 p-2 rounded my-2 overflow-x-auto"><code>$1</code></pre>'
  );

  // Italic (___text___) - must be processed before underline
  formatted = formatted.replace(/___([^_]+)___/g, '<em>$1</em>');

  // Underline (_text_)
  formatted = formatted.replace(/_([^_]+)_/g, '<u>$1</u>');

  // Bold (*text*)
  formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

  // Strikethrough (-text-)
  formatted = formatted.replace(/-([^-]+)-/g, '<del>$1</del>');

  // Quoted/inline code (`text`)
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">$1</code>'
  );

  // Line breaks (convert \n to <br>)
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Returns a help text showing available formatting options
 */
export function getFormattingHelp(): string {
  return `
<strong>Text Formatting Guide:</strong><br><br>
<u>_Underline_</u> → Wrap text in single underscores<br>
<em>___Italic___</em> → Wrap text in three underscores<br>
<strong>*Bold*</strong> → Wrap text in asterisks<br>
<del>-Strikethrough-</del> → Wrap text in hyphens<br>
<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">\`Quoted/Code\`</code> → Wrap text in backticks<br><br>
<pre class="bg-gray-800 text-gray-100 p-2 rounded my-2">\`\`\`
Code block
Multiple lines
\`\`\`</pre>
<strong>Examples:</strong><br>
Type: _hello_ → <u>hello</u><br>
Type: ___world___ → <em>world</em><br>
Type: *important* → <strong>important</strong><br>
Type: -mistake- → <del>mistake</del><br>
Type: \`code\` → <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">code</code>
  `.trim();
}