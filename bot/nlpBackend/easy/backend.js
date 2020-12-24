const Corpora = require('./corpora.js');
const W2v = require('./w2v.js');

class EasyNlpBackend {
    w2v = new W2v();
    corpora = new Corpora();
    async preload() {
        await this.w2v.preload();
        await this.corpora.preload();
    }
    // public
    getGoodCitation(tag = 'ANY', maxRank = Infinity, minRank = 0, idealProximityToCluster = 0.5, goodTries = 10, maxTries = 100) {
        let goodCitations = [];
        for (let tryIdx = 0; tryIdx < maxTries; tryIdx++) {
            const citation = this.tryGetRandomCitation(tag, maxRank, minRank, idealProximityToCluster);
            if (citation !== null) {
                goodCitations.push(citation)
                if (goodCitations.length === goodTries) {
                    break;
                }
            }
        }
        if (goodCitations.length < goodTries) {
            throw new Error(`not enough good citations (${goodCitations.length} of ${goodTries} needed)`);
        }
        const sortedGoodCitations = goodCitations.sort((a, b) => b.mark - a.mark);
        const bestGoodCitation = sortedGoodCitations[0];
        console.log(bestGoodCitation);
        return bestGoodCitation;
    }
    getEntity(lemma, tag = 'ANY') {
        const vectorRecordsetForLemma = this.w2v.vectorRecordSet.byLemma[lemma];
        if (!vectorRecordsetForLemma) {
            return null;
        }
        let vectorRecord;
        if (tag === 'ANY') {
            vectorRecord = vectorRecordsetForLemma.topRanked;
        } else {
            vectorRecord = vectorRecordsetForLemma.byTag[tag];
        }

        if (!vectorRecord) {
            return null;
        }
        return new NlpBackendEntity(this, vectorRecord);
    }
    // private
    tryGetRandomCitation(tag = 'ANY', maxRank = Infinity, minRank = 0, idealProximityToCluster = 0.5) {
        const corporaCitation = this.corpora.getRandomCitation();
        const chunks = corporaCitation.chunks;

        const lemmaCounts = chunks.reduce((chunkCounts, chunk) => {
            let chunkCount = chunkCounts[chunk.lemma] || 0;
            chunkCount++;
            chunkCounts[chunk.lemma] = chunkCount;
            return chunkCounts;
        }, {});

        const chunkWithEntities = chunks.map((chunk, chunkIdx) => {
            return {
                chunk,
                entity: this.getEntity(chunk.lemma, chunk.tag),
                chunkIdx
            };
        });

        const knownChunkWithEntities = chunkWithEntities.filter(chunkWithEntity => !!chunkWithEntity.entity);
        const knownWordWithEntitiesFillRatio = knownChunkWithEntities.length / chunkWithEntities.length;
        const uniqueKnownEntities = Object.values(knownChunkWithEntities.reduce((uniqueKnownEntities, knownChunkWithEntity) => {
            uniqueKnownEntities[knownChunkWithEntity.entity.vectorRecord.vocabularyIdx] = knownChunkWithEntity.entity;
            return uniqueKnownEntities;
        }, {}));
        const uniqueKnownEntitiesCount = uniqueKnownEntities.length;
        const minUniqueKnownEntitiesCount = 10;
        if (uniqueKnownEntitiesCount < minUniqueKnownEntitiesCount) {
            console.warn('uniqueKnownChunkWithEntities < 10, dropping this one');
            return null;
        }

        const citationChunkHotCandidates = knownChunkWithEntities.map((knownChunkWithEntity) => {
            //// isGood for filter later
            const rank = knownChunkWithEntity.entity.vectorRecord.vocabularyIdx;
            const isGoodRank = (rank !== null && rank >= minRank && rank < maxRank);

            const isGoodPredefinedTag = (tag === 'ANY') ? true : knownChunkWithEntity.entity.vectorRecord.tag === tag;
            const isGoodRussian = (/^[а-яА-Я]+$/).test(knownChunkWithEntity.chunk.word); // TODO unstict - & ё
            if (isGoodRank && !isGoodRussian) {
                console.warn('isGoodRank && !isGoodRussian: ' + knownChunkWithEntity.chunk.word);
            }
            const isGood = isGoodRank && isGoodPredefinedTag && isGoodRussian;


            //// marks

            // hotLemmaCountsMark
            const hotLemmaMaxExtraCounts = 2;
            const hotLemmaCounts = lemmaCounts[knownChunkWithEntity.chunk.lemma];
            const hotLemmaExtraCounts = hotLemmaCounts - 1;
            const hotLemmaCountsRatio = Math.min(1, Math.max(0, hotLemmaExtraCounts / hotLemmaMaxExtraCounts));
            // from 0 to 2 extra counts, where 1 extra count is only 0.2 mark 0.5^(1/3) = 0.8; 1 - 0.8 = 0.2
            const hotLemmaCountsMark = 1 - Math.pow(hotLemmaCountsRatio, 1/3);

            // knownWordWithEntitiesFillMark
            const knownWordWithEntitiesFillMark = Math.max(0, Math.min(1, knownWordWithEntitiesFillRatio * 2 - 0.25)); // 0.25 to 0.75 known words to 0 to 1 mark

            // borderDistMark
            const middleFloatIdx = chunks.length / 2;
            const idxDiff = knownChunkWithEntity.chunkIdx - middleFloatIdx;
            const idxDist = Math.abs(idxDiff);
            const middleDistRatio = idxDist / middleFloatIdx;
            const borderDistMark = 1 - Math.pow(middleDistRatio, 3);

            // lengthLogMark
            const trimmedText = knownChunkWithEntity.chunk.text.trim();
            const bestLengthLog = Math.log(8); // 8 simbols
            const lengthLog = Math.log(trimmedText.length);
            const lengthLogDiff = lengthLog - bestLengthLog;
            const lengthLogDist = Math.abs(lengthLogDiff);
            const lengthLogDistRatio = Math.min(1, Math.max(0, lengthLogDist));
            // [3  <-(5)- 8 -(13)->  23] simbols to => [0 (0.5) 1] ratio
            const lengthLogDistMark = 1 - Math.pow(lengthLogDistRatio, 3);

            // freqFactor
            const freqNormingFactor = (rank + 100) / 5000;

            //clusterMark
            const clusterEntities = uniqueKnownEntities.filter(uniqueKnownEntity => uniqueKnownEntity.vectorRecord.vocabularyIdx !== knownChunkWithEntity.entity.vectorRecord.vocabularyIdx );
            const clusterVectorRecords = clusterEntities.map(clusterEntity => clusterEntity.vectorRecord);
            const cluster = this.w2v.calcCluster(clusterVectorRecords);
            const proximityToCluster = this.w2v.calcProximityToCluster(knownChunkWithEntity.entity.vectorRecord, cluster);
            const proximityToClusterDiff = Math.abs(proximityToCluster - idealProximityToCluster);
            const clusterMark = Math.min(1, Math.max(0, 1 - proximityToClusterDiff));

            // total
            const mark = hotLemmaCountsMark * knownWordWithEntitiesFillMark * borderDistMark * lengthLogDistMark * freqNormingFactor * clusterMark;
            return {
                chunk: knownChunkWithEntity,
                idx: knownChunkWithEntity.chunkIdx,
                isGood,
                mark
            };
        });

        const filterdCitationChunkHotCandidates = citationChunkHotCandidates.filter(candidate => candidate.isGood);
        const sortedCitationChunkHotCandidates = filterdCitationChunkHotCandidates.sort((a,b)=> b.mark - a.mark);
        const bestHotCandidate = sortedCitationChunkHotCandidates[0];
        if (bestHotCandidate !== undefined) {
            const bestHotCitationChunkIdx = bestHotCandidate.idx;
            let prefixChunks = chunks.slice(0, bestHotCitationChunkIdx);
            let hotChunk = bestHotCandidate.chunk; // or chunks[bestHotCitationChunkIdx];
            let postfixChunks = chunks.slice(bestHotCitationChunkIdx + 1);

            let shortPrefixChunks = prefixChunks.slice(-5);
            let shortPostfixChunks = postfixChunks.slice(0, 5);
            const citation = {
                prefixText: prefixChunks.map(chunk => chunk.text).join(''),
                hotChunk,
                postfixText: postfixChunks.map(chunk => chunk.text).join(''),
                shortPrefixText: shortPrefixChunks.map(chunk => chunk.text).join(''),
                shortPostfixText: shortPostfixChunks.map(chunk => chunk.text).join(''),
                mark: bestHotCandidate.mark,
                bookInfo: corporaCitation.bookInfo,
                positionRatio: corporaCitation.positionRatio,
            }
            return citation;
        } else {
            return null;
        }
    }

}
class NlpBackendEntity {
    constructor(backend, vectorRecord) {
        this.backend = backend;
        const vectorRecordsForLemmaByTag = backend.w2v.vectorRecordSet.byLemma[vectorRecord.lemma].byTag;
        this.vectorRecord = vectorRecord;
        this.vectorRecordsForLemmaByTag = vectorRecordsForLemmaByTag;
    }
    getNearest(lemma) {
        const vectorRecordsA = this.vectorRecordsForLemmaByTag;
        const vectorRecordsB = this.backend.w2v.vectorRecordSet.byLemma[lemma];

        if (vectorRecordsA && vectorRecordsB) {
            const nearest = Object.values(vectorRecordsA).reduce((nearest, vectorRecordA) => {
                nearest = Object.values(vectorRecordsB).reduce((nearest, vectorRecordB) => {
                    const rawProximity = this.backend.w2v.calcProximityBetween(vectorRecordA, vectorRecordB);
                    const debuffRatio = (this.vectorRecord.tag === vectorRecordA.tag) ? 1 : 0.95;
                    const debuffedProximity = rawProximity * debuffRatio;
                    if (debuffedProximity > nearest.maxProximity) {
                        nearest.vectorRecord = vectorRecordB;
                        nearest.maxProximity = debuffedProximity;
                    }
                    return nearest;
                }, nearest);
                return nearest;
            }, {maxProximity: -Infinity, vectorRecord: null});
            return nearest;
        } else {
            return null;
        }
    }
    getNearests(limit = 10, maxRank = Infinity) {
        const highEnoughLemmas = Object.entries(this.backend.w2v.vectorRecordSet.byLemma).filter(([lemma, vectorRecordSetForLemma]) => (lemma !== this.vectorRecord.lemma) && (vectorRecordSetForLemma.topRanked.vocabularyIdx < maxRank) ).map(([lemma, vectorRecordSetForLemma]) => lemma);
        const nearests = highEnoughLemmas.map(lemma => {
            const nearest = this.getNearest(lemma);
            return nearest;
        });
        const sortedNearests = nearests.sort((a, b)=> b.maxProximity - a.maxProximity );

        sortedNearests.splice(limit);
        return sortedNearests || null;
    }
}
module.exports = EasyNlpBackend;