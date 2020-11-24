const fs = require('fs');
class W2v {
    dim = 300;
    //vectors = require('./ruscorpora_1_300_10_delemmed.json');
    async preload() {
        const modelTextFilePath = '../data/w2v/model.txt.trim';
        //const modelTextFilePath = '../data/w2v/model.txt';
        //const rawVectorRecords = await this.loadRawVectorRecordsFromTxt(modelTextFilePath);
        const rawVectorRecords = await this.loadRawVectorRecordsFromTxt(modelTextFilePath);
        this.smartVectorSet = this.rawVectorsToSmartVectorSet(rawVectorRecords);
    }
    findNearestsByLemma(referenceLemma, tag = 'NOUN', limit = 10, maxRank = 30000, isReverse = false) {
        const referenceLemmaSmartVectorRecord = this.smartVectorSet.byTag[tag][referenceLemma];
        if (!referenceLemmaSmartVectorRecord) {
            return null;
        } else {
            return this.findNearestsBySmartVectorRecord(referenceLemmaSmartVectorRecord, limit, maxRank, isReverse);
        }
    }
    findNearestsBySmartVectorRecord(referenceLemmaSmartVectorRecord, limit = 10, maxRank = 30000, isReverse = false) {
        const nearestSmartVectorRecords = this.smartVectorSet.byRank.filter(smartVectorRecord => (smartVectorRecord !== referenceLemmaSmartVectorRecord) && (smartVectorRecord.rank < maxRank)).map(smartVectorRecord => {
            const proximity = this.calcProximity(smartVectorRecord, referenceLemmaSmartVectorRecord);
            return {
                proximity,
                smartVectorRecord
            }
        });

        let sortedNearestSmartVectorRecords;
        if (isReverse) {
            sortedNearestSmartVectorRecords = nearestSmartVectorRecords.sort((a, b)=> { return a.proximity - b.proximity });
        } else {
            sortedNearestSmartVectorRecords = nearestSmartVectorRecords.sort((a, b)=> { return b.proximity - a.proximity });
        }

        sortedNearestSmartVectorRecords.splice(limit);
        return sortedNearestSmartVectorRecords;
    }
    calcProximity(smartVectorRecordA, smartVectorRecordB) {
        let sum = 0;
        for (let i = 0; i < this.dim; i++) {
            sum += smartVectorRecordA.vector[i] * smartVectorRecordB.vector[i];
        }
        return sum / smartVectorRecordA.magnitude / smartVectorRecordB.magnitude;
    }
    getRank(referenceWord, tag = 'NOUN') {
        const smartVectorRecordsOfTag = this.smartVectorSet.byTag[tag];
        if (smartVectorRecordsOfTag) {
            const smartVectorRecord = this.smartVectorSet.byTag[tag][referenceWord];
            if (smartVectorRecord) {
                return smartVectorRecord.rank;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    rawVectorsToSmartVectorSet(rawVectorRecords) {
        const smartVectorSet = rawVectorRecords.reduce((smartVectorSet, rawVectorRecord, rank) => {
            const vector = rawVectorRecord.vector;
            const magnitudeSquare = vector.reduce((magnitude, value) => {return magnitude + value * value }, 0 );
            const magnitude = Math.sqrt(magnitudeSquare);
            const taggedLemma = rawVectorRecord.taggedLemma;
            const [lemma, tag] = taggedLemma.split('_');
            const smartVectorRecord = {
                lemma,
                tag,
                vector,
                magnitude,
                rank,
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
            smartVectorSet.byRank[rank] = smartVectorRecord;
            return smartVectorSet;

        }, {byTag: {}, byWord: {}, byRank: []});
        return smartVectorSet;
    }
    async loadRawVectorRecordsFromTxt(path) {
        const modelTextStream = fs.createReadStream(path, {encoding: 'utf8', highWaterMark: 32 * 1024 * 1024});
        const rawVectorRecordsPromise = new Promise((resolve, reject) => {
            let chunkCounter = 0;
            let rawVectorRecords = [];
            let chunkTail = '';
            // Handle any errors while reading
            modelTextStream.on('error', err => {
                // File could not be read
                reject(err);
            });
            // Listen for data
            modelTextStream.on('data', chunk => {
                chunk = chunkTail + chunk;
                const chunkLines = chunk.split('\n');
                chunkTail = chunkLines.splice(chunkLines.length - 1, 1)[0];
                const isFirstChunk = chunkCounter === 0;
                const rawVectorRecordsFromChunk = this.chunkLinesToVectorRecords(chunkLines, isFirstChunk);
                rawVectorRecords = rawVectorRecords.concat(rawVectorRecordsFromChunk);
                console.log(`reading model chunk ${chunkCounter + 1}...`);
                chunkCounter++;
            });

            // File is done being read
            modelTextStream.on('close', () => {
                if (chunkTail) {
                    const tailLines = [chunkTail];
                    const isFirstChunk = chunkCounter === 0;
                    const rawVectorRecordsFromChunk = this.chunkLinesToVectorRecords(tailLines, isFirstChunk);
                    rawVectorRecords = rawVectorRecords.concat(rawVectorRecordsFromChunk);
                }
                console.log(`reading model done`);
                resolve(rawVectorRecords);
            });
        });
        const rawVectorRecords = await rawVectorRecordsPromise;
        return rawVectorRecords;
    }
    chunkLinesToVectorRecords(chunkLines, firtstChunk) {
        if (firtstChunk) {
            const firstLine = chunkLines.splice(0, 1)[0];
            const firstLineTokens = firstLine.split(' ');
            const vocabularyDim = parseFloat(firstLineTokens[0]);
            const vectorDim = parseFloat(firstLineTokens[1]);
            console.log(`got model header: vector dim: ${vectorDim}, vocabulary dim: ${vocabularyDim}`);
        }
        const rawVectorRecords = chunkLines.map((line) => {
            const tokens = line.split(' ');
            const taggedLemma = tokens.splice(0, 1)[0];
            const vector = tokens.map(token => parseFloat(token));
            const rawVectorRecord = {
                taggedLemma,
                vector,
            }
            return rawVectorRecord;
        });
        return rawVectorRecords;
    }
}

module.exports = W2v;