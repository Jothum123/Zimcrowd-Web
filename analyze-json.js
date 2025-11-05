const fs = require('fs');

const content = fs.readFileSync('finance-guru.json', 'utf8');

let openBraces = 0;
let openBrackets = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') openBraces--;
    if (content[i] === '[') openBrackets++;
    if (content[i] === ']') openBrackets--;
}

console.log('Unclosed braces {:', openBraces);
console.log('Unclosed brackets [:', openBrackets);
console.log('\nLast 200 chars:');
console.log(content.substring(content.length - 200));
console.log('\nMissing closing for:', 
    '{'.repeat(openBraces) + 
    ']'.repeat(openBrackets));
