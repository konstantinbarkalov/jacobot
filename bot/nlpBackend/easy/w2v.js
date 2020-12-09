const fs = require('fs');
const FloatDb = require('./floatDb.js');
class W2v {
    floatDb = new FloatDb();
    async preload() {
        await this.floatDb.preload();
        this.smartVectorSet = W2v.buildSmartVecotrSetFromFloatDb(this.floatDb);
    }
    findNearestsByLemma(referenceLemma, tag = 'NOUN', limit = 10, maxRank = Infinity, isReverse = false) {
        const referenceLemmaSmartVectorRecord = this.smartVectorSet.byTag[tag][referenceLemma];
        if (!referenceLemmaSmartVectorRecord) {
            return null;
        } else {
            return this.findNearestsBySmartVectorRecord(referenceLemmaSmartVectorRecord, limit, maxRank, isReverse);
        }
    }
    findNearestsBySmartVectorRecord(referenceLemmaSmartVectorRecord, limit = 10, maxRank = Infinity, isReverse = false) {
        const nearestSmartVectorRecords = this.smartVectorSet.byRank.filter(smartVectorRecord => (smartVectorRecord.lemma !== referenceLemmaSmartVectorRecord.lemma) && (smartVectorRecord.vocabularyIdx < maxRank)).map(smartVectorRecord => {
            const proximity = this.calcProximity(smartVectorRecord, referenceLemmaSmartVectorRecord);
            return {
                proximity,
                smartVectorRecord
            }
        });


        // let sortedNearestSmartVectorRecords;
        // if (isReverse) {
        //     sortedNearestSmartVectorRecords = nearestSmartVectorRecords.sort((a, b)=> { return a.proximity - b.proximity });
        // } else {
        //     sortedNearestSmartVectorRecords = nearestSmartVectorRecords.sort((a, b)=> { return b.proximity - a.proximity });
        // }
        // const unqueLemmaNearestSmartVectorRecords = Object.values(Object.fromEntries(sortedNearestSmartVectorRecords.reverse().map((sortedNearestSmartVectorRecord) => {
        //     return [sortedNearestSmartVectorRecord.smartVectorRecord.lemma, sortedNearestSmartVectorRecord];
        // }))).reverse();


        const nearestSmartVectorRecordsLemmaBinsMap = nearestSmartVectorRecords.reduce((nearestSmartVectorRecordsMap, nearestSmartVectorRecord) => {
            let bin = nearestSmartVectorRecordsMap[nearestSmartVectorRecord.smartVectorRecord.lemma] || [];
            bin.push(nearestSmartVectorRecord);
            nearestSmartVectorRecordsMap[nearestSmartVectorRecord.smartVectorRecord.lemma] = bin;
            return nearestSmartVectorRecordsMap;
        }, {});
        const nearestnearestSmartVectorRecordsLemmaBins = Object.values(nearestSmartVectorRecordsLemmaBinsMap);
        const unqueLemmaNearestSmartVectorRecords = nearestnearestSmartVectorRecordsLemmaBins.map(bin => {
            let sortedBinForLemma;
            if (isReverse) {
                sortedBinForLemma = bin.sort((a, b)=> { return a.proximity - b.proximity });
            } else {
                sortedBinForLemma = bin.sort((a, b)=> { return b.proximity - a.proximity });
            }
            return sortedBinForLemma[0];
        });

        let unqueLemmaSortedNearestSmartVectorRecords;
        if (isReverse) {
            unqueLemmaSortedNearestSmartVectorRecords = unqueLemmaNearestSmartVectorRecords.sort((a, b)=> { return a.proximity - b.proximity });
        } else {
            unqueLemmaSortedNearestSmartVectorRecords = unqueLemmaNearestSmartVectorRecords.sort((a, b)=> { return b.proximity - a.proximity });
        }

        unqueLemmaSortedNearestSmartVectorRecords.splice(limit);
        return unqueLemmaSortedNearestSmartVectorRecords;
    }
    calcProximity(smartVectorRecordA, smartVectorRecordB) {
        let sum = 0;
        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {
            const valueA = this.floatDb.data[smartVectorRecordA.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            const valueB = this.floatDb.data[smartVectorRecordB.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            sum += valueA * valueB;
        }
        return sum / smartVectorRecordA.magnitude / smartVectorRecordB.magnitude;
    }
    getRank(referenceWord, tag = 'NOUN') {
        const smartVectorRecordsOfTag = this.smartVectorSet.byTag[tag];
        if (smartVectorRecordsOfTag) {
            const smartVectorRecord = this.smartVectorSet.byTag[tag][referenceWord];
            if (smartVectorRecord) {
                return smartVectorRecord.vocabularyIdx;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    static buildSmartVecotrSetFromFloatDb(floatDb) {
        const smartVectorSet = floatDb.taggedLemmas.reduce((smartVectorSet, taggedLemma, taggedLemmaIdx) => {
            //const plainIdx = taggedLemmaIdx * floatDb.expectedVectorDim;
            const vector = floatDb.getVector(taggedLemmaIdx);
            const magnitudeSquare = vector.reduce((magnitude, value) => {return magnitude + value * value }, 0 );
            const magnitude = Math.sqrt(magnitudeSquare);
            const [lemma, tag] = taggedLemma.split('_');
            const vocabularyIdx = taggedLemmaIdx;
            const smartVectorRecord = {
                vocabularyIdx,
                lemma,
                tag,
                magnitude,
            }

            let smartVectorTagRecords = smartVectorSet.byTag[tag];
            if (!smartVectorTagRecords) {
                smartVectorTagRecords = {};
            }
            smartVectorTagRecords[lemma] = smartVectorRecord;

            let smartVectorWordRecords = smartVectorSet.byWord[lemma];
            if (!smartVectorWordRecords) {
                smartVectorWordRecords = {};
            }
            smartVectorWordRecords[tag] = smartVectorRecord;

            smartVectorSet.byTag[tag] = smartVectorTagRecords;
            smartVectorSet.byWord[lemma] = smartVectorWordRecords;
            smartVectorSet.byRank[vocabularyIdx] = smartVectorRecord;
            return smartVectorSet;

        }, {byTag: {}, byWord: {}, byRank: []});
        return smartVectorSet;
    }

}

module.exports = W2v;