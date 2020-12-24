const fs = require('fs');
class FloatDb {
    modelFloatDbDataFilePath = '../data/w2v/model.fdb.data';
    modelFloatDbTaggedLemmasFilePath = '../data/w2v/model.fdb.tl';
    expectedVectorDim = 300;
    maxVocabularyDim = 130000;
    vocabularyDim = 0;
    data = null;
    async preload() {
        this.loadFromFloatDbFiles();
    }
    loadFromFloatDbFiles() {
        console.log('Loading floatDb tagged lemmas...');
        const fullTaggedLemmasText = fs.readFileSync(this.modelFloatDbTaggedLemmasFilePath, {encoding: 'utf8'});
        const fullTaggedLemmas = fullTaggedLemmasText.split('\n');
        const lemmasVocabularyDim = fullTaggedLemmas.length;
        console.log('Loading floatDb tagged done.');
        console.log('Loading floatDb data...');
        const dataBuffer = fs.readFileSync(this.modelFloatDbDataFilePath, {encoding: null});
        const dataPlainDim = dataBuffer.length / 4;
        const dataVocabularyDim = dataPlainDim / this.expectedVectorDim;

        if (lemmasVocabularyDim !== dataVocabularyDim) {
            throw new Error('lemmasVocabularyDim not equal dataVocabularyDim');
        }
        this.vocabularyDim = Math.min(dataVocabularyDim, this.maxVocabularyDim);
        if (dataVocabularyDim > this.maxVocabularyDim) {
            console.log(`dataVocabularyDim ${dataVocabularyDim} is bigger then maxVocabularyDim ${this.maxVocabularyDim}, so clipping to ${this.vocabularyDim}`);
        } else {
            console.log(`dataVocabularyDim ${dataVocabularyDim} is not bigger then maxVocabularyDim ${this.maxVocabularyDim}, so no clipping`);
        }

        const capedVocabularyDim = Math.min(dataVocabularyDim, this.maxVocabularyDim);
        const capedDataPlainDim = capedVocabularyDim * this.expectedVectorDim;
        const fullData = new Float32Array(dataBuffer.buffer, dataBuffer.offset, capedDataPlainDim);

        this.data = fullData.slice(0, capedDataPlainDim);
        this.taggedLemmas = fullTaggedLemmas.slice(0, capedVocabularyDim);

        console.log('Loading floatDb data done.');
    }
}

module.exports = FloatDb;