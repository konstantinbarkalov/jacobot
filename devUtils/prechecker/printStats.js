const printStat = require('./printStat.js');

const inputs  = require('./inputs.js');

console.log('HELLO');

for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    console.log('');
    console.log('----------------');
    console.log('BOOK: (' + (i + 1) + ' OF ' + inputs.length + ') ' + input.name);
    printStat(input.path);
}
