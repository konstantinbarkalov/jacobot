const fs = require('fs');
const ReadByLine = require('./readByLine');
class PlainTxtToFloatDb {
    expectedVectorDim = 300;
    maxVocobularyDim = 200000;
    data = null;
    lastLogTimestamp = 0;
    loggingTrottleDelay = 1000;
    modelTextFilePath = '../../data/w2v/model.txt';
    modelFloatDbDataFilePath = '../../data/w2v/model.fdb.data';
    modelFloatDbTaggedLemmasFilePath = '../../data/w2v/model.fdb.tl';
    loadFromTxt() {
        const rbl = new ReadByLine();
        return rbl;
    }


    async convert() {
        console.log(`begin converting ${this.modelTextFilePath} text file...`);
        const rbl = this.loadFromTxt();
        this.logMemUsage();
        const linesCount = await rbl.processByLine(this.modelTextFilePath, this.maxVocobularyDim + 1, (line, lineIdx) => {this. onTxtLine(line, lineIdx)});
        console.log(`convering ${linesCount} text lines done.`);
        this.logMemUsage();
        console.log(`saving...`);
        this.saveToFloatDb();
        console.log(`saving done.`);
        console.log(`reloading...`);
        this.loadFromFloatDbFiles();
        console.log(`reloading done`);
    }
    saveToFloatDb() {
        const dataBuffer = Buffer.from(this.data.buffer)
        fs.writeFileSync(this.modelFloatDbDataFilePath, dataBuffer);
        const taggedLemmasBuffer = this.taggedLemmas.join('\n');
        fs.writeFileSync(this.modelFloatDbTaggedLemmasFilePath, taggedLemmasBuffer);
    }
    loadFromFloatDbFiles() {
        const dataBuffer = fs.readFileSync(this.modelFloatDbDataFilePath,{ encoding: null});
        this.data = new Float32Array(dataBuffer.buffer, dataBuffer.offset, dataBuffer.byteLength / 4);
        const taggedLemmasText = fs.readFileSync(this.modelFloatDbTaggedLemmasFilePath, {encoding: 'utf8'});
        this.taggedLemmas = taggedLemmasText.split('\n');
    }

    onTxtLine(line, lineIdx) {
        const isFirstLine = (lineIdx === 0);
        if (isFirstLine) {
            this.onFirstTxtLine(line);
        } else {
            this.onNonFirstTxtLine(line, lineIdx);
        }
    }
    onFirstTxtLine(firstLine) {
        const firstLineTokens = firstLine.split(' ');
        const headerVocabularyDim = parseFloat(firstLineTokens[0]);
        const headerVectorDim = parseFloat(firstLineTokens[1]);
        const vocabularyDim = Math.min(headerVocabularyDim, this.maxVocobularyDim);
        console.log(`got model header: vector dim: ${headerVectorDim}, vocabulary dim: ${headerVocabularyDim}`);
        if (headerVectorDim !== this.expectedVectorDim) {
            throw new Error(`Wrong header vector dim, expected: ${this.expectedVectorDim}, got: ${headerVectorDim}`)
        }
        console.log(`creating floatDb with vocabulary dim: ${vocabularyDim} (max is: ${this.maxVocobularyDim}, header is: ${headerVocabularyDim}) and vectorDim: ${this.expectedVectorDim}`);
        this.data = new Float32Array(vocabularyDim * this.expectedVectorDim);
        this.taggedLemmas = new Array(vocabularyDim);
        console.log(`empty floatDb created`);
        this.logMemUsage();
    }
    onNonFirstTxtLine(line, lineIdx) {
        const dataLineIdx = lineIdx - 1;
        const nowTimestamp = Date.now();
        if (this.lastLogTimestamp + this.loggingTrottleDelay < nowTimestamp) {
            this.lastLogTimestamp = nowTimestamp;
            console.log(`reading line ${lineIdx + 1}...`);
            this.logMemUsage();
        }
        const tokens = line.split(' ');
        const taggedLemma = tokens.splice(0, 1)[0];
        tokens.forEach((token, tokenIdx) => {
            const floatDbIdx = dataLineIdx * this.expectedVectorDim + tokenIdx;
            const floatValue = parseFloat(token);
            this.data[floatDbIdx] = floatValue;
        });
        this.taggedLemmas[dataLineIdx] = taggedLemma;
    }
    logMemUsage() {
        const memUsage = process.memoryUsage();
        console.log(`Memory usage: arrayBuffers: ${(memUsage.arrayBuffers/1024/1024).toFixed(0)}Mb, heapUsed: ${(memUsage.heapUsed/1024/1024).toFixed(0)}Mb, heapTotal: ${(memUsage.heapTotal/1024/1024).toFixed(0)}Mb, rss: ${(memUsage.rss/1024/1024).toFixed(0)}Mb`);
    }
}
module.exports = PlainTxtToFloatDb;

