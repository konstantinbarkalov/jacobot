class PhraseBuilder {
    static phrasesToText(phrases) {
        const sentences = this.phrasesToSentences(phrases);
        const text = this.sentencesToText(sentences);
        return text;
    }
    static sentencesToText(sentences) {
        const upcasedSentences = sentences.map(sentence => sentence.charAt(0).toUpperCase() + sentence.slice(1));
        const text = upcasedSentences.join(' ');
        return text;
    }
    static phrasesToSentences(phrases) {
        const strictlyNewSentenceRegexp = /[!.?]$/;
        const sentences = phrases.reduce((sentences, phrase) => {
            //phrase = phrase.trim();
            let lastSentence = sentences[sentences.length - 1];
            lastSentence += phrase;
            sentences[sentences.length - 1] = lastSentence;
            const isStrictlyNewSentence = strictlyNewSentenceRegexp.test(lastSentence);
            if (isStrictlyNewSentence) {
                sentences.push('');
            }
            return sentences;
        }, ['']);
        return sentences;
    }
}

module.exports = PhraseBuilder;