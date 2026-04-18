const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('lint-results.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
const results = JSON.parse(content);

const filesToFix = {};

results.forEach(result => {
  const filePath = result.filePath;
  result.messages.forEach(msg => {
    if (msg.ruleId === '@typescript-eslint/no-unused-vars') {
      if (!filesToFix[filePath]) filesToFix[filePath] = [];
      filesToFix[filePath].push(msg);
    }
  });
});

Object.entries(filesToFix).forEach(([filePath, messages]) => {
  if (!fs.existsSync(filePath)) return;
  
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let lines = fileContent.split(/\r?\n/);
  
  // Sort messages in reverse order of line and column to avoid displacement issues
  messages.sort((a, b) => b.line - a.line || b.column - a.column);
  
  messages.forEach(msg => {
    const lineIndex = msg.line - 1;
    const line = lines[lineIndex];
    if (!line) return;
    
    // Extract the variable name from the message or the source
    // ESLint messages usually look like "'varName' is defined but never used."
    const match = msg.message.match(/'([^']+)'/);
    if (match) {
      const varName = match[1];
      // Only prefix if it's not already prefixed
      if (!varName.startsWith('_')) {
        // Find the variable name at the column position
        // column is 1-indexed
        const colIndex = msg.column - 1;
        const before = line.substring(0, colIndex);
        const after = line.substring(colIndex);
        
        // Ensure we are actually looking at the variable name
        if (after.startsWith(varName)) {
           lines[lineIndex] = before + '_' + after;
           console.log(`Prefixed ${varName} in ${path.basename(filePath)}:${msg.line}`);
        }
      }
    }
  });
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
});
