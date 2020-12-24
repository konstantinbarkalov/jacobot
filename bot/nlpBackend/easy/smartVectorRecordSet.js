const fs = require('fs');
const SmartVectorRecord = require('./smartVectorRecord.js');
class SmartVectorRecordSetForLemma {
    byTag = {};
    topRanked = null;
    constructor(byTag) {
        this.byTag = byTag;
        this.topRanked = Object.values(this.byTag).sort((a, b) => a.vocabularyIdx - b.vocabularyIdx)[0];
    }
}
class SmartVectorRecordSet {
    byLemma = {};
    constructor(floatDb) {
        const smartVectorRecordsbyLemma = {}; // temporary container to fill SmartVectorRecordSetForLemma later (because byTag dictionary must be fully filled before SmartVectorRecordSetForLemma initialization)
        floatDb.taggedLemmas.forEach((taggedLemma, taggedLemmaIdx) => {
            const vocabularyIdx = taggedLemmaIdx;
            const [lemma, tag] = taggedLemma.split('_');
            let magnitudeSquare = 0;
            for (let i = 0; i < floatDb.expectedVectorDim; i++) {
                const referenceValue = floatDb.data[vocabularyIdx * floatDb.expectedVectorDim + i];
                magnitudeSquare += referenceValue * referenceValue;
            }
            const magnitude = Math.sqrt(magnitudeSquare);
            const smartVectorRecord = new SmartVectorRecord(vocabularyIdx, lemma, tag, magnitude);

            let smartVectorRecordsForLemmaByTag = smartVectorRecordsbyLemma[lemma];
            if (!smartVectorRecordsForLemmaByTag) {
                smartVectorRecordsForLemmaByTag = {};
            }
            smartVectorRecordsForLemmaByTag[tag] = smartVectorRecord;
            smartVectorRecordsbyLemma[lemma] = smartVectorRecordsForLemmaByTag;
        });

        this.byLemma = Object.fromEntries(Object.entries(smartVectorRecordsbyLemma).map(([lemma, smartVectorRecordsForLemmaByTag]) => [lemma, new SmartVectorRecordSetForLemma(smartVectorRecordsForLemmaByTag)] ));
    }
}

module.exports = SmartVectorRecordSet;