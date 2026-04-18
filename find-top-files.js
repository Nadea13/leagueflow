const fs = require('fs');
let content = fs.readFileSync('lint-results.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
const results = JSON.parse(content);

const filesWithErrors = results
  .map(r => ({ filePath: r.filePath, count: r.messages.length }))
  .sort((a, b) => b.count - a.count);

console.log('Top files with errors:');
filesWithErrors.slice(0, 10).forEach(f => console.log(`${f.filePath}: ${f.count}`));
