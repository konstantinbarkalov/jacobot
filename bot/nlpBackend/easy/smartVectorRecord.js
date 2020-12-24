class SmartVectorRecord {
    constructor(
        vocabularyIdx,
        lemma,
        tag,
        magnitude,
    ) {
        this.vocabularyIdx = vocabularyIdx;
        this.lemma = lemma;
        this.tag = tag;
        this.magnitude = magnitude;
    }
}


module.exports = SmartVectorRecord;