const fs = require('fs');

const filesToFix = [
  'src/components/dashboard/OrderBook.jsx',
  'src/components/dashboard/OrderPanel.jsx',
  'src/components/dashboard/Header.jsx'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/color:\s*"#fff"/g, 'color: "var(--text-primary)"');
    content = content.replace(/color:\s*'#fff'/g, "color: 'var(--text-primary)'");
    content = content.replace(/\? "#fff"/g, '? "var(--text-primary)"');
    content = content.replace(/\?\? "#fff"/g, '?? "var(--text-primary)"');
    
    // Replace hardcoded dark backgrounds in Dashboard that might be missed
    content = content.replace(/#111827/gi, 'var(--bg-primary)');
    content = content.replace(/#1A1E2B/gi, 'var(--bg-primary)');
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed Dashboard text colors');
