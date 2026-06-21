import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(__dirname, '../src/content/artikel');

function htmlToMarkdown(html) {
  let text = html;

  // Replace images
  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    return `\n\n![](${src})\n\n`;
  });

  // Replace links
  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, content) => {
    return ` [${content.trim() || href}](${href}) `;
  });

  // Replace headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // Replace blockquotes
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    // Strip inner blockquote divs or classes if any
    const cleanContent = content.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1').replace(/<[^>]*>/g, '').trim();
    return '\n\n> ' + cleanContent.split('\n').map(l => l.trim()).join('\n> ') + '\n\n';
  });

  // Replace lists
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n\n$1\n\n');
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '\n\n$1\n\n');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');

  // Process bold/italic spans and tags recursively
  let changed = true;
  let loops = 0;
  while (changed && loops < 10) {
    const oldText = text;
    
    // Bold styles
    text = text.replace(/<span[^>]+style=["'][^"']*(font-weight:\s*bold|700)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '**$2**');
    // Italic styles
    text = text.replace(/<span[^>]+style=["'][^"']*(font-style:\s*italic)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, '*$2*');
    
    // Bold tags
    text = text.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
    // Italic tags
    text = text.replace(/<(i|em)[^>]*>([\s\S]*?)<\/\2>/gi, '*$2*');
    
    // Strip other spans
    text = text.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
    // Strip divs
    text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1');
    // Strip paragraphs
    text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');

    if (oldText === text) {
      changed = false;
    }
    loops++;
  }

  // Replace br tags
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Clean HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...');

  // Resolve multiple newlines
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

function cleanFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Split frontmatter and body
  const parts = fileContent.split('---');
  if (parts.length < 3) {
    console.log(`[Skip] ${path.basename(filePath)} - Format frontmatter tidak valid`);
    return;
  }
  
  const frontmatter = parts[1];
  // Reconstruct body from remaining parts in case body contains '---'
  const rawBody = parts.slice(2).join('---');
  
  const cleanedBody = htmlToMarkdown(rawBody);
  
  const newContent = `---${frontmatter}---

${cleanedBody}
`;

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`[Success] Cleaned ${path.basename(filePath)}`);
}

function run() {
  console.log('Memulai pembersihan berkas MDX dari tag HTML...');
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.mdx'));
  
  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    cleanFile(filePath);
  }
  
  console.log('Pembersihan selesai!');
}

run();
