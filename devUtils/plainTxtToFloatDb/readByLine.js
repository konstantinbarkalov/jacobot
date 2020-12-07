const fs = require('fs');
class ReadByLine {
    async processByLine(filePath, maxLines, perLineCallback) {
        const stream = fs.createReadStream(filePath, {encoding: 'utf8', highWaterMark: 1024 * 1024 * 32});
        this.maxLines = maxLines;
        this.chunkTail = '';
        this.linesProcessedCounter = 0;
        for await (const chunk of stream) {
            this.processChunkByLine(chunk, perLineCallback);
            if (this.linesProcessedCounter >= this.maxLines) {
                break;
            }
        }
        stream.destroy();
        return this.linesProcessedCounter;
    }
    processChunkByLine(chunk, perLineCallback) {
        chunk = this.chunkTail + chunk;
        const chunkLines = chunk.split('\n');
        this.chunkTail = chunkLines.splice(chunkLines.length - 1, 1)[0];
        for (let chunkLineIdx = 0; chunkLineIdx < chunkLines.length; chunkLineIdx++) {
            const chunkLine = chunkLines[chunkLineIdx];
            perLineCallback(chunkLine, this.linesProcessedCounter);
            this.linesProcessedCounter++;
            if (this.linesProcessedCounter >= this.maxLines) {
                break;
            }
        }
    }
}

module.exports = ReadByLine;