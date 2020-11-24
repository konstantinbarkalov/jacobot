function getSequencesStats(sequences) {
    const stats = {
        frequentWord: getSequencesStats_FrequentWord(sequences),
        biggestSequence: getSequencesStats_BiggestSequence(sequences),
        lengthRatio: getSequencesStats_LengthRatio(sequences),
    }
    return stats;
}

function getSequencesStats_FrequentWord(sequences) {
    const dictionary = {};
    for (let i = 0; i < sequences.length; i += 2) {
        const word = sequences[i];
        let wordCount = dictionary[word];
        if (!wordCount) {
            wordCount = 0;
        }
        wordCount++;
        dictionary[word] = wordCount;
    }
    const dictionaryAsArray = Object.entries(dictionary).map(([word, count]) => { return {count, word} });
    const sortedDictionary = dictionaryAsArray.sort((a, b) => { return b.count - a.count});
    const top10SortedDictionary = sortedDictionary.slice(0,100);
    return top10SortedDictionary;
}

function getSequencesStats_BiggestSequence(sequences) {

    const sequenceStats = sequences.map((sequence, idx) => { return {
        sequence,
        len: sequence.length,
        isGood: ((idx % 2) == 0),
    }});
    const goodSequenceStats = sequenceStats.filter(sequenceStat => sequenceStat.isGood === true );
    const badSequenceStats = sequenceStats.filter(sequenceStat => sequenceStat.isGood === false );

    const sortedGoodSequenceStats = goodSequenceStats.sort((a,b) => { return b.len - a.len});
    const sortedBadSequenceStats = badSequenceStats.sort((a,b) => { return b.len - a.len});

    const top10 = {
        good: sortedGoodSequenceStats.slice(0,100),
        bad: sortedBadSequenceStats.slice(0,100),
    }
    return top10;
}

function getSequencesStats_LengthRatio(sequences) {
    const sequenceStats = sequences.map((sequence, idx) => { return {
        sequence,
        len: sequence.length,
        isGood: ((idx % 2) == 0),
    }});
    const goodSequenceStats = sequenceStats.filter(sequenceStat => sequenceStat.isGood === true );
    const badSequenceStats = sequenceStats.filter(sequenceStat => sequenceStat.isGood === false );

    const goodSum = goodSequenceStats.reduce((goodSum, sequenceStat) => {
        goodSum = goodSum + sequenceStat.len;
        return goodSum;
    }, 0);

    const badSum = badSequenceStats.reduce((badSum, sequenceStat) => {
        badSum = badSum + sequenceStat.len;
        return badSum;
    }, 0);


    const ratioStat = {
        goodSum: goodSum,
        badSum: badSum,
        ratio: goodSum / badSum,
    }
    return ratioStat;
}
module.exports = getSequencesStats;



