const fs = require('fs');

try {
    const content = fs.readFileSync('finance-guru.json', 'utf8');
    console.log('File length:', content.length);
    console.log('Character at 19835:', content.charAt(19835), '(code:', content.charCodeAt(19835), ')');
    console.log('Context around 19835:');
    console.log(content.substring(19800, 19870));
    
    JSON.parse(content);
    console.log('\nJSON is valid!');
} catch (e) {
    console.log('\nJSON Error:', e.message);
    console.log('Position:', e.message.match(/position (\d+)/)?.[1]);
}
