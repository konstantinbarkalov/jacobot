const printStat = require('./printStat.js');

const booksDirPath = '../../data/books';
const inputs  = require(booksDirPath + '/' + 'books.json');

console.log('HELLO');

for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    console.log('');
    console.log('----------------');
    console.log('BOOK: (' + (i + 1) + ' OF ' + inputs.length + ') ' + input.name);
    printStat(booksDirPath + '/' + input.originalTextPath);
}
