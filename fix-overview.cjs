const fs = require('fs');
let c = fs.readFileSync('src/components/tradingModals/Overview.jsx', 'utf8');
c = c.replace(/color:\s*"#fff"/g, 'color: "var(--text-primary)"');
fs.writeFileSync('src/components/tradingModals/Overview.jsx', c);
console.log('Fixed Overview.jsx text color');
