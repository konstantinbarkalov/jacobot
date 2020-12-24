const fs = require('fs');
const VectorRecord = require('./vectorRecord.js');
class VectorRecordSetForLemma {
    byTag = {};
    topRanked = null;
    constructor(byTag) {
        this.byTag = byTag;
        this.topRanked = Object.values(this.byTag).sort((a, b) => a.vocabularyIdx - b.vocabularyIdx)[0];
    }
}
class VectorRecordSet {
    byLemma = {};
    constructor(floatDb) {
        const vectorRecordsbyLemma = {}; // temporary container to fill VectorRecordSetForLemma later (because byTag dictionary must be fully filled before VectorRecordSetForLemma initialization)
        floatDb.taggedLemmas.forEach((taggedLemma, taggedLemmaIdx) => {
            const vocabularyIdx = taggedLemmaIdx;
            const [lemma, tag] = taggedLemma.split('_');
            let magnitudeSquare = 0;
            for (let i = 0; i < floatDb.expectedVectorDim; i++) {
                const referenceValue = floatDb.data[vocabularyIdx * floatDb.expectedVectorDim + i];
                magnitudeSquare += referenceValue * referenceValue;
            }
            const magnitude = Math.sqrt(magnitudeSquare);
            const vectorRecord = new VectorRecord(vocabularyIdx, lemma, tag, magnitude);

            let vectorRecordsForLemmaByTag = vectorRecordsbyLemma[lemma];
            if (!vectorRecordsForLemmaByTag) {
                vectorRecordsForLemmaByTag = {};
            }
            vectorRecordsForLemmaByTag[tag] = vectorRecord;
            vectorRecordsbyLemma[lemma] = vectorRecordsForLemmaByTag;
        });

        this.byLemma = Object.fromEntries(Object.entries(vectorRecordsbyLemma).map(([lemma, vectorRecordsForLemmaByTag]) => [lemma, new VectorRecordSetForLemma(vectorRecordsForLemmaByTag)] ));
    }
}

module.exports = VectorRecordSet;