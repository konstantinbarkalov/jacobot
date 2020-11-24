const Corpora = require('./corpora.js');
const W2v = require('./w2v.js');

class EasyNlpBackend {
    w2v = new W2v();
    corpora = new Corpora();
    async preload() {
        await this.w2v.preload();
        await this.corpora.preload();
    }
    getRandomLemma(tag = 'NOUN') {
        const smartVectorRecord = this.getRandomSmartVectorRecord();
        return smartVectorRecord.lemma;
    }
    getRandomSmartVectorRecord(tag = 'NOUN') {
        const smartVectorRecords = this.w2v.smartVectorSet.byTag[tag];
        const lemmas = Object.keys(smartVectorRecords);
        const lemmaIdx = Math.floor(Math.random() * lemmas.length);
        const lemma = lemmas[lemmaIdx];
        return smartVectorRecords[lemma];
    }
    getProximity(lemmaA, lemmaB) {
        const smartVectorsA = this.w2v.smartVectorSet.byWord[lemmaA];
        const smartVectorsB = this.w2v.smartVectorSet.byWord[lemmaB];


        if (smartVectorsA && smartVectorsB) {
            const maxProximity = Object.values(smartVectorsA).reduce((maxProximity, smartVectorA) => {
                maxProximity = Object.values(smartVectorsB).reduce((maxProximity, smartVectorB) => {
                    const proximity = this.w2v.calcProximity(smartVectorA, smartVectorB);
                    maxProximity = Math.max(proximity, maxProximity);
                    return maxProximity;
                }, maxProximity);
                return maxProximity;
            }, -Infinity);
            return maxProximity;
        } else {
            return null;
        }
    }
    getSimilar(lemma, count, maxRank = 30000, tag = 'NOUN') {
        const similars = this.w2v.findNearestsByLemma(lemma, tag, count, maxRank);
        if (similars) {
            return similars;
        } else {
            return null;
        }
    }
    getGoodCitation(tag = 'NOUN', maxRank = 30000, minRank = 0, goodTries = 10, maxTries = 100) {
        let goodCitations = [];
        for (let tryIdx = 0; tryIdx < maxTries; tryIdx++) {
            const citation = this.tryGetRandomCitation(tag, maxRank, minRank);
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
        return bestGoodCitation;
    }
    tryGetRandomCitation(tag = 'NOUN', maxRank = 30000, minRank = 0) {
        const corporaCitation = this.corpora.getRandomCitation();
        const chunks = corporaCitation.chunks;
        const lemmaCounts = chunks.reduce((chunkCounts, chunk) => {
            let chunkCount = chunkCounts[chunk.lemma] || 0;
            chunkCount++;
            chunkCounts[chunk.lemma] = chunkCount;
            return chunkCounts;
        }, {});

        const wordChunks = chunks.filter((chunk) => chunk.tag !== 'PUNCT');
        const wordFillRatio = wordChunks.length / chunks.length;

        const vectorizableWordChunks = wordChunks.filter((wordChunk) => {
            if (wordChunk.tag === 'PRON' || wordChunk.tag === 'CONJ' || wordChunk.tag === 'CCONJ' || wordChunk.tag === 'AUX' || wordChunk.tag === 'ADP' || wordChunk.tag === 'SCONJ' || wordChunk.tag === 'DET' || wordChunk.tag === 'PART') {
                return false;
            }
            const rank = this.w2v.getRank(wordChunk.lemma, wordChunk.tag);
            const isVectorizableWord = (rank !== null);
            return isVectorizableWord;
        });
        const uniqueVectorizableLemmasCount = Object.keys(vectorizableWordChunks.reduce((uniqueVectorizableLemmas, vectorizableWordChunk) => {
            uniqueVectorizableLemmas[vectorizableWordChunk.lemma] = true;
            return uniqueVectorizableLemmas;
        }, {})).length;

        const minUniqueVectorizableLemmasCount = 10;
        if (uniqueVectorizableLemmasCount < minUniqueVectorizableLemmasCount) {
            console.warn('uniqueVectorizableLemmasCount < 10');
            return null;
        }

        const citationChunkHotCandidates = chunks.map((chunk, idx) => {
            //// isGood for fliter later
            const rank = this.w2v.getRank(chunk.lemma, chunk.tag);
            const isGoodRank = (rank !== null && rank >= minRank && rank < maxRank);
            const isGoodPredefinedTag = chunk.tag === tag;
            const isGood = isGoodRank && isGoodPredefinedTag;

            //// marks

            // hotLemmaCountsMark
            const hotLemmaMaxExtraCounts = 2;
            const hotLemmaCounts = lemmaCounts[chunk.lemma];
            const hotLemmaExtraCounts = hotLemmaCounts - 1;
            const hotLemmaCountsRatio = Math.min(1, Math.max(0, hotLemmaExtraCounts / hotLemmaMaxExtraCounts));
            // from 0 to 2 extra counts, where 1 extra count is only 0.2 mark 0.5^(1/3) = 0.8; 1 - 0.8 = 0.2
            const hotLemmaCountsMark = 1 - Math.pow(hotLemmaCountsRatio, 1/3);

            // wordFillMark
            const wordFillMark = Math.max(0, Math.min(1, wordFillRatio * 2 - 0.25)); // 0.25 to 0.75 known words to 0 to 1 mark

            // uniqueVectorizableLemmasCountMark
            const uniqueVectorizableLemmasCountMark = Math.max(0, Math.min(1, uniqueVectorizableLemmasCount ));

            // borderDistMark
            const middleFloatIdx = chunks.length / 2;
            const idxDiff = idx - middleFloatIdx;
            const idxDist = Math.abs(idxDiff);
            const middleDistRatio = idxDist / middleFloatIdx;
            const borderDistMark = 1 - Math.pow(middleDistRatio, 3);

            // lengthLogMark
            const trimmedText = chunk.text.trim();
            const bestLengthLog = Math.log(8); // 8 simbols
            const lengthLog = Math.log(trimmedText.length);
            const lengthLogDiff = lengthLog - bestLengthLog;
            const lengthLogDist = Math.abs(lengthLogDiff);
            const lengthLogDistRatio = Math.min(1, Math.max(0, lengthLogDist));
            // [3  <-(5)- 8 -(13)->  23] simbols to => [0 (0.5) 1] ratio
            const lengthLogDistMark = 1 - Math.pow(lengthLogDistRatio, 3);

            // freqFactor
            const freqNormingFactor = (rank + 100) / 5000;

            // total
            const mark = hotLemmaCountsMark * wordFillMark * borderDistMark * lengthLogDistMark * freqNormingFactor;
            return {
                chunk,
                idx,
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
            const citation = {
                prefixText: prefixChunks.map(chunk => chunk.text).join(''),
                hotChunk,
                postfixText: postfixChunks.map(chunk => chunk.text).join(''),
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
module.exports = EasyNlpBackend;