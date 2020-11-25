const GameOutputMessage = require("./gameOutputMessage.js");
const GameUser = require('./gameUser.js');
const HotWord = require('./hotWord.js');

class Game {
    jacoGameUser = new GameUser('never', 'Яков', 'male', 'registered');
    constructor(gameMaster, innitiatorGameUser, gameUserGroup) {
        this.gameMaster = gameMaster;
        this.innitiatorGameUser = innitiatorGameUser;
        this.gameUserGroup = gameUserGroup;
        this.players = [{score: 0, gameUser: innitiatorGameUser}];
    }
    onMessage(messageText, gameUser) {
        messageText = messageText.toLowerCase().trim();
        const messageTokens = messageText.split(' ');
        if (!messageText[0] || messageText[0] === '?') {
            const {boardText, citationText} = this.getCurrentStateText();
            return new GameOutputMessage(this, null, boardText, citationText);
        } else if (messageTokens.length === 1) {
            let player = this.players.find(player => player.gameUser === gameUser);
            if (!player) {
                player = {
                    score: 0,
                    gameUser
                }
                this.players.push(player);
            };
            const fragmentText = messageTokens[0];
            return this.onAction_Fragment(fragmentText, player);
        } else {
            return new GameOutputMessage(this, 'Без пробелов, плиз. (');
        }
    }
    onAbort() {
        this.isPlaing = false;
        this.isDone = true;
        this.endTimestamp = Date.now();
        this.gameMaster.removeActiveGame(this);
        const {boardText, citationText} = this.getCurrentStateText();
        return new GameOutputMessage(this, 'Cтоп!11', boardText, citationText);
    }
    start() {
        this.isPlaing = true;
        this.isDone = false;

        const randomCitation = this.gameMaster.nlpBackend.getGoodCitation();
        this.randomCitation = randomCitation;
        const hotWordText = randomCitation.hotChunk.word.toLowerCase();
        const hotWordLemma = randomCitation.hotChunk.lemma.toLowerCase();
        const hotWordTag = randomCitation.hotChunk.tag;

        this.topSimonyms = this.gameMaster.nlpBackend.getSimilar(hotWordLemma, 20, 80000, hotWordTag);
        const topSimonymTexts = this.topSimonyms.map(topSimonym => topSimonym.smartVectorRecord.lemma);
        this.hotWord = new HotWord(hotWordText, hotWordLemma, topSimonymTexts);

        this.startTimestamp = Date.now();
        for (let i = 1; i < 5; i++) {
            this.hotWord.openBottomUnguessedTopSimonym(this.jacoGameUser);
        }
        const {boardText, citationText} = this.getCurrentStateText();
        return new GameOutputMessage(this, 'Погнали!', boardText, citationText);
    }
    end() {
        this.isPlaing = false;
        this.isDone = true;
        this.endTimestamp = Date.now();
        this.players.forEach(player => {
            player.gameUser.stat.score += player.score;
            player.gameUser.stat.gamesCount++;
        })
        this.gameMaster.removeActiveGame(this);
    }

    referate(checkGuessResult, player, fragmentText) {
        const proximity = this.gameMaster.nlpBackend.getProximity(this.hotWord.lemmaText, fragmentText);
        const isKnownWord = (proximity !== null) && !checkGuessResult.hotWord.isLetter;
        const upcasedFragmentText = fragmentText.toUpperCase();
        //const who = (player.gender === 'unspecified') ? ('игрок ' + player.name) : player.name;
        //const action = (player.gender === 'female') ? 'назвала' : 'назвал';
        //const what = checkGuessResult.hotWord.isLetter ? 'букву' : isKnownWord ? 'слово' : 'фрагмент';
        let message;
        if (checkGuessResult.hotWord.isRobustGuess) {
            const justGuessedHotWordLetters = checkGuessResult.hotWord.justGuessedHotWordLetters.length;
            if (checkGuessResult.hotWord.isLetter) {
                // CASE: буква угадана
                if (justGuessedHotWordLetters === 1) {
                    message = `буква "${upcasedFragmentText}" есть!`;
                } else if (justGuessedHotWordLetters === 2) {
                    message = `таких буквы "${upcasedFragmentText}" в этом слове целых две!!`;
                } else if (justGuessedHotWordLetters === 3) {
                    message = `ТРРРИ буквы "${upcasedFragmentText}" в слове!!!`;
                } else {
                    message = `доооохера букв "${upcasedFragmentText}" в слове!!!!!`;
                }
            } else {
                if (checkGuessResult.topSimonym.isRobustGuess) {
                    message = `открыто близкое слово номер ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1}. Это во-первых. Во-вторых, это слово целиком содержится в загаданом. Таким образом, всего мы открываем ${justGuessedHotWordLetters} букв в слове!`;
                    // CASE: топ-слово угадано и оно внутри загаданного
                } else if (isKnownWord) {
                    // CASE: слово-фрагмент внутри загаданного угадан
                    message = 'слово-фрагмент внутри загаданного угадан, '; // TODO:
                } else {
                    // CASE: фрагмент внутри загаданного слова угадан
                    message = 'фрагмент внутри загаданного слова угадан, '; // TODO:
                }
            }
        } else if (checkGuessResult.topSimonym.isRobustGuess) {
            // CASE: топ-слово угадано
            message = 'топ-слово угадано, '; // TODO:
        } else if (isKnownWord) {
            if (checkGuessResult.hotWord.wasGuessed) {
                // CASE: слово такое в словаре есть, но его называли
                message = 'слово такое в словаре есть, но его называли, '; // TODO:
            } else if (checkGuessResult.hotWord.wasGoodGuessedSubstring) {
                // CASE: слово такое в словаре есть, но оно содержится во фрагменте который уже угадывали
                message = 'слово такое в словаре есть, но оно содержится во фрагменте который уже угадывали, '; // TODO:
            } else {
                // CASE: слово такое в словаре есть, ещё не называли
                message = 'слово такое в словаре есть, ещё не называли, '; // TODO:
            }
        } else {
            if (checkGuessResult.hotWord.isLetter) {
                // CASE: буква не угадана
                message = 'буква не угадана, '; // TODO:
            } else {
                // CASE: несловарный фрагмент, новых букв неугадано
                message = 'несловарный фрагмент, новых букв неугадано, '; // TODO:
            }
        }
        return message;
    }
    onAction_Fragment(fragmentText, player) {
        const upcasedFragmentText = fragmentText.toUpperCase();
        let answerText = '';
        let congratz = null;
        let isFinal = false;
        const checkGuessResult = this.hotWord.guess(fragmentText, player);
        const stat = this.hotWord.getStat();
        const referateText = this.referate(checkGuessResult, player, fragmentText);
        answerText += referateText; // TODO
        if (!checkGuessResult.topSimonym.wasGuessed && checkGuessResult.topSimonym.isTopGuess) {
            answerText += ` БЛИЗКОЕ СЛОВО УГАДАНО! `;
            const scoreGain = Math.round(500 / (checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1));
            player.score += scoreGain;
            answerText += ' [+' + scoreGain + '=' + player.score + '] ';
            congratz = 1;
        }

        if (checkGuessResult.hotWord.isRobustGuess) {
            let scoreGain;
            answerText += ` ХОРОШИЙ ОТВЕТ! `;
            if (checkGuessResult.hotWord.isLetter) {
                scoreGain = 50 * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
            } else {
                scoreGain = 50 * checkGuessResult.hotWord.justGuessedHotWordLetters.length * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
            }
            player.score += scoreGain;
            answerText += ' [+' + scoreGain + '=' + player.score + '] ';
            congratz = Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3);
        }


        if (stat.hotWord.unguessedLetters.length === 0) {
            this.hotWord.openHotWord();
            this.end();
            isFinal = true;
            const scoreGain = 1000;
            player.score +=scoreGain;
            answerText += ' [+' + scoreGain + '=' + player.score + '] ';
            congratz = 5;
            answerText += `ВЫ ПОЛНОСТЬЮ УГАДАЛИ СЛОВО! "${this.hotWord.wordText.toUpperCase()}", УРА!`;
        } else if (stat.hotWord.unguessedLetters.length < 3) {
            this.hotWord.openHotWord();
            this.end();
            isFinal = true;
            const scoreGain = 500;
            player.score +=scoreGain;
            answerText += ' [+' + scoreGain + '=' + player.score + '] ';
            congratz = 4;
            answerText += `осталось всего ${stat.hotWord.unguessedLetters.length} букв, а значит по правилам слово ${this.hotWord.wordText.toUpperCase()} раскрыто! Это победа!`;
        } else {
            const proximity = this.gameMaster.nlpBackend.getProximity(this.hotWord.lemmaText, fragmentText);
            if (proximity !== null) {
                const proximityPercent = (proximity * 100).toFixed() + '%';
                answerText += ` Инфа по слову "${upcasedFragmentText}": его близость к загаданному слову ${proximityPercent}`;
            }
            if (stat.topSimonym.unguessedSimonyms.length) {
                answerText += ' Следующий ход!'; // В этом ходу подсказка - близкое слово из топ';
                this.hotWord.openBottomUnguessedTopSimonym(this.innitiatorGameUser);
            } else if (stat.hotWord.unguessedLetters.length) {
                answerText += ' Следующий ход!'; // В этом ходу подсказка - буква в слове';
                this.hotWord.openRandomUnguessedHotLetter(this.innitiatorGameUser);
            }
        }
        //console.log(checkGuessResult);
        //console.log(stat);
        const {boardText, citationText} = this.getCurrentStateText();
        return new GameOutputMessage(this, answerText, boardText, citationText, null, congratz, isFinal);
    }
    getGuessedBadLettersText() {
        const badLettersText = Object.keys(this.hotWord.guessHistory.fragment.letter.bad).reverse().join('');
        return badLettersText;
    }
    getRandomCitationInfoText() {
        const positionRatio = this.randomCitation.positionRatio;
        let positionText;
        if (positionRatio >= 0 && positionRatio < 0.05) {
            positionText = 'в самом начале книги';
        } else if (positionRatio >= 0.05 && positionRatio < 0.15) {
            positionText = 'в начале книги';
        } else if (positionRatio >= 0.15 && positionRatio < 0.35) {
            positionText = 'в середине первой половины книги';
        } else if (positionRatio >= 0.35 && positionRatio < 0.45) {
            positionText = 'ближе к концу первой половины книги';
        } else if (positionRatio >= 0.45 && positionRatio < 0.55) {
            positionText = 'на экваторе книги';
        }else if (positionRatio >= 0.55 && positionRatio < 0.65) {
            positionText = 'в начале второй половины книги';
        } else if (positionRatio >= 0.65 && positionRatio < 0.85) {
            positionText = 'в середине второй половины книги';
        } else if (positionRatio >= 0.85 && positionRatio <= 0.95) {
            positionText = 'к концу книги';
        } else if (positionRatio >= 0.95 && positionRatio <= 1) {
            positionText = 'на последних страница книги';
        } else {
            throw new Error('Wrong ratio');
        }
        const citationInfoText = `📖 «${this.randomCitation.bookInfo.name}» ${this.randomCitation.bookInfo.author} (${this.randomCitation.bookInfo.year}) [${positionText}]`;
        return citationInfoText;
    }
    getTopSimonymText() {
        const stat = this.hotWord.getStat();
        const lines = [];
        this.topSimonyms.forEach((topSimonym, idx) => {
            const isOpened = this.isDone || stat.topSimonym.guessedSimonyms.includes(topSimonym.smartVectorRecord.lemma);
            let lemma;
            if (isOpened) {
                lemma = topSimonym.smartVectorRecord.lemma;
            } else {
                lemma = '?'.repeat(topSimonym.smartVectorRecord.lemma.length);
            }
            const tag = topSimonym.smartVectorRecord.tag;
            const proximityPercent = (topSimonym.proximity * 100).toFixed()+'%';
            const rank = topSimonym.smartVectorRecord.rank;
            const rankCategory = (rank > 60000) ? 'редк.' : '';
            //const line = `#${idx + 1}: ${lemma} ${tag} ${proximityPercent} R${rankCategory}`;
            const line = `#${idx + 1}: ${lemma} ${proximityPercent} ${rankCategory}`;

            if (isOpened) { // TEMPORARY TODO: configurable
                lines.push(line);
            }
        });
        return lines.join('\n');
        //const rowsCount = Math.floor(lines.length / 2);
        //let rowLines = [];
        //for (let r = 0; r < rowsCount; r++) {
        //    const sinonymLineA = lines[r];
        //    const sinonymLineB = lines[r + rowsCount];
        //    const rowLine = sinonymLineA.padEnd(50) + sinonymLineB;
        //    rowLines.push(rowLine);
        //}
        //return rowLines.join('\n');
    }
    getCurrentStateText() {
        let boardText = '';
        let citationText = '';
        const maskedWord = this.isDone ? this.hotWord.wordText.toUpperCase() : this.hotWord.getMasked();
        const wordLength = this.hotWord.wordText.length;

        if (this.randomCitation) {
            const randomCitationInfoText = this.getRandomCitationInfoText();
            const [hotChunkWordPrefix, hotChunkWordPostfix] = this.randomCitation.hotChunk.text.split(this.randomCitation.hotChunk.word);
            citationText += randomCitationInfoText;
            citationText += `\n`;
            citationText += `--------`;
            citationText += `\n`;
            citationText += `<i>..." ${this.randomCitation.prefixText}${hotChunkWordPrefix}</i><b>${maskedWord}</b><i>${hotChunkWordPostfix}${this.randomCitation.postfixText} "...</i>`;
            citationText += `\n`;
        }
        const badLettersText = this.getGuessedBadLettersText();
        boardText += `✳️ [ ${maskedWord} ] (${wordLength})`;
        boardText += `\n`;
        boardText += `🆎 <s>${badLettersText.toUpperCase()}</s>`;
        boardText += `\n`;
        boardText += `\n`;
        boardText += this.getTopSimonymText();
        boardText += `\n`;
        boardText += `\n`;



        if (this.isDone) {
            const secDiff = Math.floor((this.endTimestamp - this.startTimestamp) / 1000);
            boardText += `Этот раунд окончен за ${secDiff} секунд. `;
        }
        return {boardText, citationText};
    }
}
module.exports = Game;
