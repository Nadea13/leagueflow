const fs = require('fs');
let content = fs.readFileSync('lint-results.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
const results = JSON.parse(content);

const errorCounts = {};
results.forEach(result => {
  result.messages.forEach(msg => {
    const ruleId = msg.ruleId || 'unknown';
    errorCounts[ruleId] = (errorCounts[ruleId] || 0) + 1;
  });
});

const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
let output = 'Error Summary:\n';
sortedErrors.forEach(([rule, count]) => {
  output += `${rule}: ${count}\n`;
});

// Also find specific files with severity 2 errors
output += '\nSevere Errors (Severity 2):\n';
results.forEach(result => {
  result.messages.forEach(msg => {
    if (msg.severity === 2) {
      output += `${result.filePath}:${msg.line}:${msg.column} - ${msg.ruleId}: ${msg.message}\n`;
    }
  });
});

fs.writeFileSync('lint-summary.txt', output);
console.log('Summary written to lint-summary.txt');
