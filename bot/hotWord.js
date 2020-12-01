class HotWord {
    constructor(wordText, lemmaText, topSimonymTexts) {
        this.wordText = wordText;
        this.lemmaText = lemmaText;
        this.topSimonymTexts = topSimonymTexts;
    }
    guessHistory = {
        fragment: {
            every: {},
            good: {},
            letter: {
                every: {},
                bad: {},
                good: {},
            },
        },
        simonym: {
            every: {},
            top: {},
        }
    }
    guess(fragmentText, gameUser) {
        const hotWord = this.guessHotWord(fragmentText, gameUser);
        const topSimonym = this.guessTopSimonym(fragmentText, gameUser);
        const checkGuessResult = {
            hotWord,
            topSimonym,
        }
        return checkGuessResult;
    }
    guessHotWord(fragmentText, gameUser) {
        const checkGuessResult = this.checkGuessHotWord(fragmentText);
        const isLetter = checkGuessResult.isLetter;
        const isRobustGuess = checkGuessResult.isRobustGuess;
        const historyEvent = {
            gameUser,
            timestamp: Date.now(),
            mode: 'guess',
        }
        this.addHotWordToHistory(fragmentText, historyEvent, isLetter, isRobustGuess);
        return checkGuessResult;
    }
    addHotWordToHistory(fragmentText, historyEvent, isLetter, isRobustGuess) {
        if (isLetter) {
            this.guessHistory.fragment.letter.every[fragmentText] = historyEvent;
            if (isRobustGuess) {
                this.guessHistory.fragment.letter.good[fragmentText] = historyEvent;
            } else {
                this.guessHistory.fragment.letter.bad[fragmentText] = historyEvent;
            }
        }
        this.guessHistory.fragment.every[fragmentText] = historyEvent;
        if (isRobustGuess) {
            this.guessHistory.fragment.good[fragmentText] = historyEvent;
            if (!isLetter) {
                fragmentText.split('').forEach((fragmentLetter) => {
                    this.guessHistory.fragment.letter.every[fragmentLetter] = historyEvent;
                    this.guessHistory.fragment.letter.good[fragmentLetter] = historyEvent;
                })
            };
        }
    }
    checkGuessHotWord(fragmentText) {
        const wasGuessed = !!this.guessHistory.fragment.every[fragmentText];
        const wasGoodGuessed = !!this.guessHistory.fragment.good[fragmentText];
        const wasGoodGuessedSubstring = Object.keys(this.guessHistory.fragment.good).some((goodHistoryFragment) => { return goodHistoryFragment.includes(fragmentText) } );

        const guessedHistoryEvent = (Object.entries(this.guessHistory.fragment.every).find(([goodFragmentText, goodFragmentHistoryEvent]) => { return goodFragmentText === fragmentText; } ) || [])[1];
        const goodGuessedSubstringHistoryEvent = (Object.entries(this.guessHistory.fragment.good).find(([goodFragmentText, goodFragmentHistoryEvent]) => { return goodFragmentText.includes(fragmentText) } ) || [])[1];

        const isLetter = fragmentText.length === 1;

        const wasLetterGuessed = !!this.guessHistory.fragment.letter.every[fragmentText];
        const wasLetterGoodGuessed = !!this.guessHistory.fragment.letter.good[fragmentText];
        const wasLetterBadGuessed = !!this.guessHistory.fragment.letter.bad[fragmentText];

        const wasLetterBadGuessedInFragmentSubstring = Object.keys(this.guessHistory.fragment.letter.bad).some(badLetter => fragmentText.includes(badLetter));
        const letterBadGuessedInFragmentSubstringHistoryEvent = (Object.entries(this.guessHistory.fragment.letter.bad).find(([badLetter, goodFragmentHistoryEvent]) => { return fragmentText.includes(badLetter) } ) || [])[1];

        const isEquallyHotWord = this.wordText === fragmentText;
        const isEquallyHotLemma = this.lemmaText === fragmentText;
        const isHotWordSubstring = this.wordText.includes(fragmentText);

        const fragmentLetters = fragmentText.split('');
        const notYetGuessedFragmentLetters = fragmentLetters.filter((fragmentLetter) => !this.guessHistory.fragment.letter.every[fragmentLetter]);
        const notYetGuessedFragmentUniqueLetters = Object.keys(notYetGuessedFragmentLetters.reduce((notYetGuessedFragmentUniqueLetters, fragmentLetter) => {notYetGuessedFragmentUniqueLetters[fragmentLetter] = fragmentLetter; return notYetGuessedFragmentUniqueLetters}, {}));

        const justGuessedHotWordUniqueLetters = notYetGuessedFragmentUniqueLetters.filter((fragmentUniqueLetter) => this.wordText.includes(fragmentUniqueLetter));
        const justGuessedHotWordLetters = this.wordText.split('').filter((hotWordLetter) => justGuessedHotWordUniqueLetters.includes(hotWordLetter));

        const isRobustGuess = isHotWordSubstring && (justGuessedHotWordUniqueLetters.length > 0);
        return {
            fragmentText,
            wasGuessed,
            wasGoodGuessed,
            wasGoodGuessedSubstring,
            guessedHistoryEvent,
            goodGuessedSubstringHistoryEvent,
            isLetter,
            wasLetterGuessed,
            wasLetterGoodGuessed,
            wasLetterBadGuessed,
            wasLetterBadGuessedInFragmentSubstring,
            letterBadGuessedInFragmentSubstringHistoryEvent,
            isEquallyHotWord,
            isEquallyHotLemma,
            isHotWordSubstring,
            notYetGuessedFragmentLetters,
            notYetGuessedFragmentUniqueLetters,
            justGuessedHotWordUniqueLetters,
            justGuessedHotWordLetters,
            isRobustGuess,
        };
    }
    guessTopSimonym(fragmentText, gameUser) {
        const checkGuessResult = this.checkGuessTopSimonym(fragmentText);
        const isRobustGuess = checkGuessResult.isRobustGuess;
        const historyEvent = {
            gameUser,
            timestamp: Date.now(),
            mode: 'guess',
        }
        this.addTopSimonymToHistory(fragmentText, historyEvent, isRobustGuess);
        return checkGuessResult;
    }
    addTopSimonymToHistory(fragmentText, historyEvent, isRobustGuess) {
        this.guessHistory.simonym.every[fragmentText] = historyEvent;
        if (isRobustGuess) {
            this.guessHistory.simonym.top[fragmentText] = historyEvent;
        }
    }
    checkGuessTopSimonym(fragmentText) {
        const wasGuessed = !!this.guessHistory.simonym.every[fragmentText];
        const wasTopGuessed = !!this.guessHistory.simonym.top[fragmentText];
        const isTopGuess = this.topSimonymTexts.some((simonym) => simonym === fragmentText);
        const justTopGuessedSimonymWithIdx = this.topSimonymTexts.map((simonym, idx) => {return {simonym, idx}}).find(({simonym, idx}) => simonym === fragmentText);
        const justTopGuessedSimonymIdx = justTopGuessedSimonymWithIdx ? justTopGuessedSimonymWithIdx.idx : null;
        const guessedHistoryEvent = (Object.entries(this.guessHistory.simonym.every).find(([simonymText, goodFragmentHistoryEvent]) => { return simonymText === fragmentText } ) || [])[1];
        const isRobustGuess = isTopGuess && !wasGuessed;
        return {
            fragmentText,
            wasGuessed,
            wasTopGuessed,
            isTopGuess,
            justTopGuessedSimonymIdx,
            guessedHistoryEvent,
            isRobustGuess,
        };
    }
    openTopSimonym(idx, gameUser) {
        const topSimonymText = this.topSimonymTexts[idx];
        const notYetGuessed = !this.guessHistory.simonym.top[topSimonymText];
        if (notYetGuessed) {
            const historyEvent = {
                gameUser,
                timestamp: Date.now(),
                mode: 'open',
            }
            this.addTopSimonymToHistory(topSimonymText, historyEvent, true);
            return idx;
        } else {
            return null;
        }
    }
    openHotWordLetter(idx, gameUser) {
        const hotLetter = this.wordText[idx];
        const notYetGuessed = !this.guessHistory.fragment.letter.good[hotLetter];
        if (notYetGuessed) {
            const historyEvent = {
                gameUser,
                timestamp: Date.now(),
                mode: 'open',
            }
            this.addHotWordToHistory(hotLetter, historyEvent, true, true);
            return idx;
        } else {
            return null;
        }
    }
    openHotWord(gameUser) {
        const notYetGuessed = !this.guessHistory.fragment.good[this.wordText];
        if (notYetGuessed) {
            const historyEvent = {
                gameUser,
                timestamp: Date.now(),
                mode: 'open',
            }
            this.addHotWordToHistory(this.wordText, historyEvent, false, true);
            return true;
        } else {
            return false;
        }
    }
    openBottomUnguessedTopSimonym(gameUser) {
        const unguessedTop = this.topSimonymTexts.map((topSimonymText, idx) => {return {topSimonymText, idx}}).filter(topSimonymTextWithIdx => !this.guessHistory.simonym.top[topSimonymTextWithIdx.topSimonymText]);
        const unguessedSimonymTextWidthIdx = unguessedTop[unguessedTop.length - 1];
        if (unguessedSimonymTextWidthIdx) {
            const unguessedSimonymIdx = unguessedSimonymTextWidthIdx.idx;
            return this.openTopSimonym(unguessedSimonymIdx, gameUser);
        } else {
            return null;
        }

    }
    openRandomUnguessedHotLetter(gameUser) {
        const hotWordUnguessedLetterWithIdxes = this.wordText.split('').map((hotWordLetter, idx) => {return {hotWordLetter, idx}}).filter((hotWordLetterWithIdx) => !this.guessHistory.fragment.letter.good[hotWordLetterWithIdx.hotWordLetter]);
        if (hotWordUnguessedLetterWithIdxes.length > 0) {
            const randomIdx = Math.floor(Math.random() * hotWordUnguessedLetterWithIdxes.length);
            const hotWordUnguessedLetterWithIdx = hotWordUnguessedLetterWithIdxes[randomIdx];
            const hotWordLetterIdx = hotWordUnguessedLetterWithIdx.idx;
            return this.openHotWordLetter(hotWordLetterIdx, gameUser);
        } else {
            return null;
        }
    }
    getMasked() {
        let maskedText = this.wordText.split('').map(hotWordLetter => this.guessHistory.fragment.letter.good[hotWordLetter] ? hotWordLetter.toUpperCase() : '●').join('');
        return maskedText;
    }
    getIsHotWordGuessed() {
        let isGuessed = this.wordText.split('').every(hotWordLetter => !!this.guessHistory.fragment.letter.good[hotWordLetter]);
        return isGuessed;
    }
    getIsTopSimonymGuessed(simonymIdx) {
        const topSimonymText = this.topSimonymTexts[simonymIdx];
        let isGuessed = !!this.guessHistory.simonym.top[topSimonymText];
        return isGuessed;
    }
    getHotWordStat() {
        const letters = this.wordText.split('');
        const uniqueLetters = Object.keys(letters.reduce((hotWordUniqueLetters, hotWordLetter) => {hotWordUniqueLetters[hotWordLetter] = true; return hotWordUniqueLetters; }, {}));
        const guessedLetters = letters.filter(hotWordLetter => !!this.guessHistory.fragment.letter.good[hotWordLetter]);
        const unguessedLetters = letters.filter(hotWordLetter => !this.guessHistory.fragment.letter.good[hotWordLetter]);
        const guessedUniqueLetters = uniqueLetters.filter(hotWordLetter => !!this.guessHistory.fragment.letter.good[hotWordLetter]);
        const unguessedUniqueLetters = uniqueLetters.filter(hotWordLetter => !this.guessHistory.fragment.letter.good[hotWordLetter]);
        return {
            letters,
            uniqueLetters,
            guessedLetters,
            unguessedLetters,
            guessedUniqueLetters,
            unguessedUniqueLetters,
        }
    }
    getTopSimonymStat() {
        const guessedSimonymTexts = this.topSimonymTexts.filter(topSimonymText => !!this.guessHistory.simonym.top[topSimonymText]);
        const unguessedSimonymTexts = this.topSimonymTexts.filter(topSimonymText => !this.guessHistory.simonym.top[topSimonymText]);
        return {
            guessedSimonyms: guessedSimonymTexts,
            unguessedSimonyms: unguessedSimonymTexts
        }
    }
    getStat() {
        const hotWord = this.getHotWordStat();
        const topSimonym = this.getTopSimonymStat();
        const stat = {
            hotWord,
            topSimonym
        };
        return stat;
    }
}

module.exports = HotWord;