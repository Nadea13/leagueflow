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
console.log('Error Summary:');
sortedErrors.forEach(([rule, count]) => {
  console.log(`${rule}: ${count}`);
});
