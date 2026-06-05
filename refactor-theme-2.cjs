const fs = require('fs');
const path = require('path');

const map = {
  '#0d1117': 'var(--bg-primary)',
  '#111827': 'var(--bg-primary)',
  '#1a1e2b': 'var(--bg-primary)',
  '#1f2937': 'var(--bg-secondary)',
  '#374151': 'var(--border-color)',
  '#d1d5db': 'var(--text-primary)',
  '#9ca3af': 'var(--text-secondary)',
  '#1e53e5': 'var(--accent-color)',
  '#4f46e5': 'var(--accent-color)',
  '#4338ca': 'var(--accent-color)',
  '#8b5cf6': 'var(--accent-color)',
  '#a78bfa': 'var(--accent-color)'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      for (const [hex, variable] of Object.entries(map)) {
        const regex = new RegExp(hex.replace('(', '\\(').replace(')', '\\)'), 'gi');
        if (regex.test(content)) {
          content = content.replace(regex, variable);
          changed = true;
        }
      }

      // Also specifically fix color: #fff in Backtest.css to var(--text-primary)
      if (fullPath.endsWith('Backtest.css')) {
        if (content.includes('color: #fff;')) {
           // We only replace the H1 color, the button color should stay white. 
           // Actually, var(--text-primary) on buttons is bad.
           content = content.replace('color: #fff;', 'color: var(--text-primary);');
           changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory('./src');
console.log('Refactoring 2 complete!');
