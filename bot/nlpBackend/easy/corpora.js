const fs = require('fs');
const path = require('path');
class Corpora {
    books = [];
    async preload() {
        this.books = this.loadBooksFromBooksJson();
    }
    getRandomCitation(length = 50) {
        const bookIdx = Math.floor(Math.random() * this.books.length);
        const book = this.books[bookIdx];
        const windowWidth = (book.chunks.length - length);
        const startChunkIdx = Math.floor(Math.random() * windowWidth);
        const positionRatio = startChunkIdx / windowWidth;
        const citation = {
            chunks: book.chunks.slice(startChunkIdx, startChunkIdx + length),
            bookInfo: book.config,
            positionRatio
        }
        return citation;
    };
    getRandomCitations(count = 10, length = 50) {
        const citations = [];
        for (let i = 0; i < count; i++) {
            citations[i] = this.getRandomCitation(length);
        }
        return citations;
    }

    loadBooksFromBooksJson() {
        const booksDir = path.join(__dirname, '../../../data/books');
        const booksConfig = require(path.join(booksDir, '/books.json'));
        return booksConfig.map(bookConfig => {
            const bookFilePath = path.join(booksDir, bookConfig.lemmatizedTextPath);
            const lemmatizedText = fs.readFileSync(bookFilePath, {encoding: 'utf8'})
            const chunks = this.lemmatizeTextToChunks(lemmatizedText);
            return {
                chunks,
                config: bookConfig,
            }
        });
    }
    lemmatizeTextToChunks(lemmatizedText) {
        const parts = lemmatizedText.split('|');
        if (parts.length < 2) {
            throw new Error();
        }
        parts.splice(parts.length - 1, 1);
        const chunks = parts.map(part => {
            const [taggedLemma, text] = part.split('~');
            const [lemma, tag]  = taggedLemma.split('_');
            const stripWordRegexp = /[a-zA-Zа-яА-ЯёЁ-]+/;
            const stripResult = text.match(stripWordRegexp);
            const word = stripResult?.[0];
            return {
                lemma,
                tag,
                text,
                word
            }
        })
        return chunks;
    }
}

module.exports = Corpora;