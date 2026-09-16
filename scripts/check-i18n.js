/**
 * check-i18n.js
 * Tool to verify key parity between th.json and en.json,
 * and optionally scan the codebase for useTranslations calls.
 */

const fs = require('fs');
const path = require('path');

const thPath = path.join(__dirname, '../messages/th.json');
const enPath = path.join(__dirname, '../messages/en.json');

const th = JSON.parse(fs.readFileSync(thPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

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

const thKeys = new Set(getKeys(th));
const enKeys = new Set(getKeys(en));

const missingInEn = [...thKeys].filter(k => !enKeys.has(k));
const missingInTh = [...enKeys].filter(k => !thKeys.has(k));

console.log('🔍 Checking i18n Translation Consistency...\n');
console.log(`📊 Total Thai keys:    ${thKeys.size}`);
console.log(`📊 Total English keys: ${enKeys.size}\n`);

let hasError = false;

if (missingInEn.length > 0) {
    hasError = true;
    console.error(`❌ Missing in en.json (${missingInEn.length} keys):`);
    missingInEn.forEach(k => console.error(`   - ${k}`));
    console.log('');
}

if (missingInTh.length > 0) {
    hasError = true;
    console.error(`❌ Missing in th.json (${missingInTh.length} keys):`);
    missingInTh.forEach(k => console.error(`   - ${k}`));
    console.log('');
}

if (!hasError) {
    console.log('✅ All keys in th.json and en.json match perfectly!');
    process.exit(0);
} else {
    process.exit(1);
}
