const fs = require('fs');
const path = require('path');

const th = JSON.parse(fs.readFileSync('./messages/th.json', 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const allKeys = new Set(getKeys(th));

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (['node_modules', '.next', '.git', 'playwright-report', 'scripts'].includes(item)) continue;
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(tsx|ts|jsx|js)$/.test(item)) {
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = walk('.');
const missing = [];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');

  // Match: const t = useTranslations() OR const t = useTranslations("Namespace")
  const hookRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:['"]([^'"]*)['"])?\s*\)/g;
  let hookMatch;
  const instances = {};

  while ((hookMatch = hookRegex.exec(content)) !== null) {
    instances[hookMatch[1]] = hookMatch[2] || '';
  }

  for (const [varName, namespace] of Object.entries(instances)) {
    // 1. Literal string calls: t('foo') or t("foo")
    const callRegex = new RegExp(`\\b${varName}\\(\\s*['"]([^'"]+)['"]`, 'g');
    let callMatch;
    while ((callMatch = callRegex.exec(content)) !== null) {
      const key = callMatch[1];
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!allKeys.has(fullKey)) {
        missing.push({ file, varName, namespace, key, fullKey, type: 'literal' });
      }
    }

    // 2. String concatenation calls: e.g. t('prefix_' + val) or t("prefix_" + val)
    const concatRegex = new RegExp(`\\b${varName}\\(\\s*['"]([^'"]*?)['"]\\s*\\+`, 'g');
    let concatMatch;
    while ((concatMatch = concatRegex.exec(content)) !== null) {
      missing.push({ file, varName, namespace, prefix: concatMatch[1], type: 'concatenation' });
    }

    // 3. Template literal calls: e.g. t(`prefix_${val}`)
    const templateRegex = new RegExp(`\\b${varName}\\(\\s*\`([^$\`]*?)\\$\\{`, 'g');
    let templateMatch;
    while ((templateMatch = templateRegex.exec(content)) !== null) {
      missing.push({ file, varName, namespace, prefix: templateMatch[1], type: 'template_literal' });
    }

    // 4. Dynamic variable calls: e.g. t(variable)
    const varCallRegex = new RegExp(`\\b${varName}\\(\\s*([a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)?)\\s*(?:,|\\))`, 'g');
    let varCallMatch;
    while ((varCallMatch = varCallRegex.exec(content)) !== null) {
      const passedVar = varCallMatch[1];
      if (!['true', 'false', 'null', 'undefined'].includes(passedVar)) {
        missing.push({ file, varName, namespace, passedVar, type: 'variable' });
      }
    }
  }
}

console.log('--- Missing / Dynamic Translation Summary ---');
console.log('Literals missing:', missing.filter(m => m.type === 'literal').length);
console.log(JSON.stringify(missing.filter(m => m.type === 'literal'), null, 2));

console.log('Concatenations:', missing.filter(m => m.type === 'concatenation').length);
console.log(JSON.stringify(missing.filter(m => m.type === 'concatenation'), null, 2));

console.log('Template literals:', missing.filter(m => m.type === 'template_literal').length);
console.log(JSON.stringify(missing.filter(m => m.type === 'template_literal'), null, 2));

console.log('Dynamic variable calls:', missing.filter(m => m.type === 'variable').length);
console.log(JSON.stringify(missing.filter(m => m.type === 'variable'), null, 2));
