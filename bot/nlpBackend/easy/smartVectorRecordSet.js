const fs = require('fs');
const SmartVectorRecord = require('./smartVectorRecord.js');
class SmartVectorRecordSet {
    byTag = {};
    byLemma = {};
    minVocabularyIdxByLemma = {};
    constructor(floatDb) {
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
            let smartVectorRecordTagRecords = this.byTag[tag];
            if (!smartVectorRecordTagRecords) {
                smartVectorRecordTagRecords = {};
            }
            smartVectorRecordTagRecords[lemma] = smartVectorRecord;

            let smartVectorRecordWordRecords = this.byLemma[lemma];
            if (!smartVectorRecordWordRecords) {
                smartVectorRecordWordRecords = {};
            }
            smartVectorRecordWordRecords[tag] = smartVectorRecord;

            this.byTag[tag] = smartVectorRecordTagRecords;
            this.byLemma[lemma] = smartVectorRecordWordRecords;
        });

        this.minVocabularyIdxByLemma = Object.fromEntries(Object.entries(this.byLemma).map(([lemma, smartVectorRecordsForLemmaByTag]) => {
            return [lemma, Object.values(smartVectorRecordsForLemmaByTag).reduce((minVocabularyIdx, smartVectorRecord) => { return Math.min(minVocabularyIdx, smartVectorRecord.vocabularyIdx); }, Infinity)];
        }));
        return this;
    }
}

module.exports = SmartVectorRecordSet;