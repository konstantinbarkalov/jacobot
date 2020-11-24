const fs = require('fs');
const textToSequences = require('./textToSequences.js');
const getSequencesStats = require('./getSequencesStats.js');


function printStat(path) {
    const text = fs.readFileSync(path).toString();

    const sequences = textToSequences(text);
    const sequencesStats = getSequencesStats(sequences);

    //console.log(sequences);

    console.log('FREQUENT WORD');
    console.log(sequencesStats.frequentWord);


    console.log('BIGGEST SEQUENCE');
    console.log('GOOD');
    console.log(sequencesStats.biggestSequence.good);
    console.log('BAD');
    console.log(sequencesStats.biggestSequence.bad);


    console.log('LENGTH RATIO');
    console.log(sequencesStats.lengthRatio);

}

module.exports = printStat;