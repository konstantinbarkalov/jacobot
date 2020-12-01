// 🧠💠🧩💡🔦🔍💬ℹ️✏️👉
const GameOutputMessage = require("./gameOutputMessage.js");
const GameUser = require('./gameUser.js');
const HotWord = require('./hotWord.js');
const PhraseBuilder = require('./phraseBuilder.js');

class Game {
    stepNum = 0;
    jacoGameUser = new GameUser('never', 'Яков', 'male');
    history = [];
    constructor(gameMaster, innitiatorGameUser, gameUserGroup) {
        this.gameMaster = gameMaster;
        this.innitiatorGameUser = innitiatorGameUser;
        this.gameUserGroup = gameUserGroup;
        this.players = [{score: 0, gameUser: innitiatorGameUser}];
    }
    onMessage(messageText, gameUser) {
        messageText = messageText.toLowerCase().trim();
        const messageTokens = messageText.split(' ');
        if (!messageText[0] || messageText[0] === '?') {  // TODO
            const {boardText, citationText} = this.getCurrentStateText(); // TODO
            return new GameOutputMessage(this, null, boardText, citationText); // TODO
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
            return this.onAction(fragmentText, player);
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
        return new GameOutputMessage(this, '⏱ Погнали!', boardText, citationText, null, 'Первый ход!..');
    }
    end() {
        this.isPlaing = false;
        this.isDone = true;
        this.endTimestamp = Date.now();
        this.players.forEach(player => {
            player.gameUser.stat.score += player.score;
            player.gameUser.stat.gamesCount++;
        });
        this.gameMaster.removeActiveGame(this);
    }

    referateAction(checkGuessResult, stat, player, fragmentText, proximity) {
        const proximityPercent = (proximity * 100).toFixed() + '%';
        const isKnownWord = (proximity !== null) && !checkGuessResult.hotWord.isLetter;
        const isBigWord = fragmentText.length > 4;
        const upcasedFragmentText = fragmentText.toUpperCase();
        let phrase;
        if (checkGuessResult.hotWord.isRobustGuess) {
            const justGuessedHotWordLetters = checkGuessResult.hotWord.justGuessedHotWordLetters;
            const justGuessedHotWordUniqueLetters = checkGuessResult.hotWord.justGuessedHotWordUniqueLetters;
            const justGuessedHotWordLettersCount = justGuessedHotWordLetters.length;
            const justGuessedHotWordUniqueLettersCount = justGuessedHotWordUniqueLetters.length;
            if (checkGuessResult.hotWord.isLetter) {
                // CASE: буква угадана
                if (justGuessedHotWordLettersCount === 1) {
                    phrase = `❇️ буква «<u><b>${upcasedFragmentText}</b></u>» есть!`;
                } else if (justGuessedHotWordLettersCount === 2) {
                    phrase = `❇️ таких буквы «<u><b>${upcasedFragmentText}</b></u>» в этом слове целых две!!`;
                } else if (justGuessedHotWordLettersCount === 3) {
                    phrase = `❇️ ТРРРИ буквы «<u><b>${upcasedFragmentText}</b></u>» в слове!!!`;
                } else {
                    phrase = `❇️ доооохера букв «<u><b>${upcasedFragmentText}</b></u>» в слове!!!!!`;
                }
            } else {
                if (checkGuessResult.topSimonym.isRobustGuess) {
                    // CASE: топ-слово угадано и оно внутри загаданного
                    phrase = `✳️+#️⃣ просто вау!!! Смотрите, что произошло. Открыто близкое слово номер #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} (его близость к загаданному ${proximityPercent} ). Это во-первых. Во-вторых, это слово ✳️ «<u><b>${upcasedFragmentText}</b></u>» само по себе целиком содержится в загаданом. Таким образом, всего мы открываем ${justGuessedHotWordLettersCount} букв в слове, и слово № ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} из топа! Браво!`;
                } else if (isKnownWord) {
                    // CASE: слово-фрагмент внутри загаданного угадан
                    if (isBigWord) {
                        // CASE: большое (неполезное как близкое) слово внутри загаданного угадан
                        if (checkGuessResult.topSimonym.wasTopGuess) {
                            // CASE: большое (неполезное как близкое) слово внутри загаданного угадано, было раньше открыто в топе
                            phrase = `✳️ Ха, слово «<u><b>${upcasedFragmentText}</b></u>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто, забавно! Это слово, кстати № #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} в топе близких слов, но мы его уже открыли до этого. (близость ${proximityPercent}).`;
                        } else if (checkGuessResult.topSimonym.wasGuessed) {
                            // CASE: большое (неполезное как близкое) слово внутри загаданного угадан, слово не из топа, уже называли
                            phrase = `✳️ Вот это ситация! Мы уже открывали слово «<u><b>${upcasedFragmentText}</b></u>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто, забавно. Причем, его близость всего-то ${proximityPercent}.`;
                        } else {
                            // CASE: большое (неполезное как близкое) слово внутри загаданного угадано, слово не из топа, ещё не называли
                            phrase = `🈳/✳️ Слово «<u><b>${upcasedFragmentText}</b></u>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Причем, его близость ${proximityPercent}.`;
                        }
                    } else {
                        // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано
                        if (checkGuessResult.topSimonym.wasTopGuess) {
                            // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано, был раньше открыт в топе
                            phrase = `✳️ Хмм! «<u><b>${upcasedFragmentText}</b></u>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Это, кстати, ещё и слово №${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} в топе близких слов, но мы его уже открыли ранее. (близость ${proximityPercent}).`;
                        } else if (checkGuessResult.topSimonym.wasGuessed) {
                            // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано, слово не из топа, уже называли
                            phrase = `✳️ Ха, «<u><b>${upcasedFragmentText}</b></u>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто, забавно. Это, кстати, ещё и слово, причем, его близость к загаданному всего-то ${proximityPercent}.`;
                        } else {
                            // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано, слово не из топа, ещё не называли
                            phrase = `🈳/✳️ Слово «<u><b>${upcasedFragmentText}</b></u>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Причем, его близость ${proximityPercent}.`;
                        }
                    }
                } else {
                    // CASE: фрагмент внутри загаданного слова угадан
                    if (justGuessedHotWordUniqueLettersCount > 4) {
                        // CASE: фрагмент внутри загаданного слова угадан, больше 4 уникальных букв
                        phrase = `✳️ бууум! фрагмент «<u><b>${upcasedFragmentText}</b></u>» внутри загаданного слова угадан, сразу ${justGuessedHotWordLettersCount} буквы открыто!`;
                    } else if (justGuessedHotWordUniqueLettersCount > 1) {
                        // CASE: фрагмент внутри загаданного слова угадан, больше 1 уникальной буквы
                        const lettersWithoutLast = justGuessedHotWordUniqueLetters.slice(0, justGuessedHotWordUniqueLetters.length - 1);
                        const lastLetterText = '"' + justGuessedHotWordUniqueLetters[justGuessedHotWordUniqueLetters.length - 1].toUpperCase() + '"';
                        const lettersWithoutLastText = lettersWithoutLast.map(letter => `"${letter.toUpperCase()}"`).join(', ');
                        const lettersText = lettersWithoutLastText + ' и ' + lastLetterText;
                        phrase = `✳️ поздравляю! Фрагмент «<u><b>${upcasedFragmentText}</b></u>» внутри загаданного слова угадан, открываем буквы ❇️ ${lettersText}. ${justGuessedHotWordLettersCount} буквы в загаданном слове открыто!`;
                    } else if (justGuessedHotWordUniqueLettersCount === 1) {
                        // CASE: фрагмент внутри загаданного слова угадан, открыта 1 уникальная буква
                        const uniqueLetter = justGuessedHotWordUniqueLetters[0];
                        if (justGuessedHotWordLettersCount === 1) {
                            // CASE: фрагмент внутри загаданного слова угадан, открыта 1 буква
                            phrase = `✳️/❇️ из названного фрагмента «<u><b>${upcasedFragmentText}</b></u>» в загаданном слове можно открыть только одну букву ❇️ "${uniqueLetter}". Довольно рисковнанный поступок.`;
                        } else {
                            // CASE: фрагмент внутри загаданного слова угадан, открыта 1 уникальная буква несколько раз
                            phrase = `✳️/❇️ поздравляю! Из всего «<u><b>${upcasedFragmentText}</b></u>» мы открываем букву ❇️ ${uniqueLetter}, но зато ${justGuessedHotWordLettersCount} раз! Ловко!`;
                        }
                    } else {
                        // CASE: фрагмент внутри загаданного слова угадан, а уникальных букв 0
                        throw new Error('CASE: фрагмент внутри загаданного слова угадан, а уникальных букв 0');
                    }
                }
            }
        } else if (checkGuessResult.topSimonym.isRobustGuess) {
            // CASE: топ-слово угадано
            phrase = `#️⃣ близкое слово номер ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} угадано, отлично! Его близость к загаданному ${proximityPercent}.`;
        } else if (isKnownWord) {
            // CASE: (неполезное) словарное слово
            if (isBigWord) {
                // CASE: (неполезное) словарное большое слово
                if (checkGuessResult.hotWord.wasGuessed) {
                    // CASE: такое больше (неполезное) слово в словаре есть, но его называли
                    phrase = `слово «<u><b>${upcasedFragmentText}</b></u>» уже называли, его близость к загаданному ${proximityPercent}. Постарайтесь потратить следующий ход более полезно.`;
                } else {
                    // CASE: такое больше (неполезное) слово в словаре есть, ещё не называли
                    phrase = `*️⃣ информация по слову "${upcasedFragmentText}": его близость к загаданному ${proximityPercent}. Надеюсь это как-то поможет.`;
                }
            } else {
                // CASE: (неполезное) словарное небольшое слово-фрагмент
                if (checkGuessResult.hotWord.wasGuessed) {
                    // CASE: такае небольшое (неполезное) слово-фрамент в словаре есть, но его называли
                    phrase = `слово «<u><b>${upcasedFragmentText}</b></u>» уже называли, его близость к загаданному ${proximityPercent}. Постарайтесь потратить cледующий следующий ход более полезно.`;
                } else {
                    // CASE: такае небольшое (неполезное) слово-фрамент в словаре есть, ещё не называли
                    phrase = `*️⃣ слово «<u><b>${upcasedFragmentText}</b></u>» не находится в топе близких слов, его близость к загаданному составляет ${proximityPercent}. Это полезная информация.`;
                }
            }

        } else {
            // CASE: несловарный фрагмент или буква, новых букв не угадано
            if (checkGuessResult.hotWord.isLetter) {
                // CASE: буква не угадана
                if (checkGuessResult.hotWord.wasLetterGoodGuessed) {
                    // CASE: буква не угадана, она уже открыта
                    phrase = `🆎 но ведь буква ❇️ «<u><b>${upcasedFragmentText}</b></u>» уже была открыта. Зря потраченный ход.`;
                } else if (checkGuessResult.hotWord.wasLetterBadGuessed) {
                    // CASE: буква не угадана, уже называли
                    phrase = `🆎 букву «<u><b>${upcasedFragmentText}</b></u>» уже назали ранее. Будте внимательней.`;
                } else {
                    // CASE: буква не угадана, ещё не называли
                    let rnd = Math.random();
                    if (rnd > 0.9) {
                        phrase = `🆎 буквы «<u><b>${upcasedFragmentText}</b></u>» в слове нет`;
                    } else if (rnd > 0.8) {
                        phrase = `🆎 нет такой буквы`;
                    } else if (rnd > 0.7) {
                        phrase = `🆎 жаль, но буквы «<u><b>${upcasedFragmentText}</b></u>» нет в загаданном слове`;
                    } else if (rnd > 0.6) {
                        phrase = `🆎 упс, такой буквы нет. Вычеркиваем «<u><b>${upcasedFragmentText}</b></u>» из списка возможных букв`;
                    } else if (rnd > 0.5) {
                        phrase = `🆎 «<u><b>${upcasedFragmentText}</b></u>» - хорошая буква, но в слове её нет. Жаль`;
                    } else if (rnd > 0.4) {
                        phrase = `🆎 такой буквы в слове нет`;
                    } else if (rnd > 0.3) {
                        phrase = `🆎 буква отсутсвует`;
                    } else if (rnd > 0.2) {
                        phrase = `🆎 хотел бы я, чтобы в жизни у каждого букв «<u><b>${upcasedFragmentText}</b></u>» было побольше, но к сожалению в этом слове её нет ни одной`;
                    } else if (rnd > 0.1) {
                        phrase = `🆎 плохая новость: такой буквы нет. Хорошая новость: на одну проверенную букву стало меньше. «<u><b>${upcasedFragmentText}</b></u>» исключена.`;
                    } else {
                        phrase = `🆎 в слове нет буквы "${upcasedFragmentText}"`;
                    }
                }
            } else {
                // CASE: несловарный фрагмент (не буква), новых букв не угадано
                if (checkGuessResult.hotWord.wasGoodGuessedSubstring) {
                    // CASE: несловарный фрагмент (не буква), новых букв не угадано, уже угадывали раньше фрагмент, в котором этот есть целиком
                    phrase = `✴️ к сожалению, новых букв не угадано. Обратите внимание, что ✳️ «<u><b>${upcasedFragmentText}</b></u>» содержится в "${checkGuessResult.hotWord.wasGoodGuessedSubstring.toUpperCase()}", это ранее уже угадывали`;
                } else {
                    phrase = `✴️ несловарный фрагмент "${upcasedFragmentText}", ни одной буквы не угадано`;
                }
            }
        }
        let postPhrase = '';
        if (stat.hotWord.unguessedLetters === 0) {
            postPhrase = `\n✅ ВЫ ПОЛНОСТЬЮ УГАДАЛИ СЛОВО! "${this.hotWord.wordText.toUpperCase()}", УРА!`;
        } else if (stat.hotWord.unguessedLetters < 3) {
            postPhrase = `\n✅ осталось всего ${stat.hotWord.unguessedLetters.length} букв, а значит по правилам слово ${this.hotWord.wordText.toUpperCase()} раскрыто! Это победа!`;
        }
        const phrases = [phrase, postPhrase];
        return phrases;
    }
    referateScoreGain(checkGuessResult, stat, player, fragmentText, proximity) {
        const isKnownWord = (proximity !== null) && !checkGuessResult.hotWord.isLetter;
        let scoreGains = [];
        if (checkGuessResult.topSimonym.isRobustGuess) {
            const scoreGainValue = 250 + Math.round(750 / (checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1));
            const scoreGain = {
                subject: 'близкое топ-слово',
                value: scoreGainValue,
                congratz: 1,
            }
            scoreGains.push(scoreGain);
        }

        if (checkGuessResult.hotWord.isRobustGuess) {

            if (checkGuessResult.hotWord.isLetter) {
                const scoreGainValue = 50 * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                const scoreGain = {
                    subject: 'буква',
                    value: scoreGainValue,
                    congratz: Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3),
                }
                scoreGains.push(scoreGain);
            } else {
                const scoreGainValue = 50 * checkGuessResult.hotWord.justGuessedHotWordLetters.length * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                const scoreGain = {
                    subject: 'фрагмент',
                    value: scoreGainValue,
                    congratz: Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3),
                }
                scoreGains.push(scoreGain);
            }
        }

        if (!checkGuessResult.topSimonym.isRobustGuess && !checkGuessResult.hotWord.isRobustGuess) {
            if (checkGuessResult.hotWord.wasGuessed) {
                const scoreGainValue = -50;
                const scoreGain = {
                    subject: 'невнимательность',
                    value: scoreGainValue,
                    congratz: -1,
                }
                scoreGains.push(scoreGain);
            } else if (isKnownWord && !checkGuessResult.topSimonym.wasGuessed) {
                const scoreGainValue = -10;
                const scoreGain = {
                    subject: 'цена любопытства',
                    value: scoreGainValue,
                    congratz: 0,
                }
                scoreGains.push(scoreGain);
            } else {
                const scoreGainValue = -25;
                const scoreGain = {
                    subject: 'неудача',
                    value: scoreGainValue,
                    congratz: -1,
                }
                scoreGains.push(scoreGain);
            }
        }

        if (stat.hotWord.unguessedLetters.length === 0) {
            const scoreGainValue = 1000;
            const scoreGain = {
                subject: 'слово полностью',
                value: scoreGainValue,
                congratz: 5,
                isFinal: true,
            }
            scoreGains.push(scoreGain);
        } else if (stat.hotWord.unguessedLetters.length < 3) {
            const scoreGainValue = 500;
            const scoreGain = {
                subject: 'слово почти полностью',
                value: scoreGainValue,
                congratz: 4,
                isFinal: true,
            }
            scoreGains.push(scoreGain);
        }
        if (stat.hotWord.unguessedLetters.length < 3 && this.stepNum < 10) {
            const scoreGainValue = 3000 / this.stepNum;
            const scoreGain = {
                subject: 'быстрая победа',
                value: scoreGainValue,
                congratz: 6,
                isFinal: true,
            }
            scoreGains.push(scoreGain);
        }

        const initialReferateResult = {scoreGainTextLines: [], scoreGainSum: 0, congratzMax: -Infinity, isFinal: false};
        if (scoreGains.length > 0) {
            const referateResult = scoreGains.reduce((referateResult, scoreGain) => {
                const scoreGainSignedText = ((scoreGain.value >= 0) ? '+' : '-') + Math.abs(scoreGain.value);
                // 💰💲🔹
                const scoreGainTextLine = `💰 ${player.score + referateResult.scoreGainSum} <b>[ ${scoreGainSignedText} ]</b> = ${player.score + referateResult.scoreGainSum + scoreGain.value}  / ${scoreGain.subject} /`;
                referateResult.scoreGainTextLines.push(scoreGainTextLine);
                referateResult.scoreGainSum += scoreGain.value;
                referateResult.congratzMax = Math.max(scoreGain.congratz, referateResult.congratzMax);
                referateResult.isFinal = !!(scoreGain.isFinal || referateResult.isFinal);
                return referateResult;
            }, initialReferateResult);
            return referateResult;
        } else {
            const referateResult =  Object.assign({}, initialReferateResult, {congratzMax: 0});
            return referateResult;
        }
    }
    onAction(fragmentText, player) {
        const checkGuessResult = this.hotWord.guess(fragmentText, player);
        const stat = this.hotWord.getStat();
        const proximity = this.gameMaster.nlpBackend.getProximity(this.hotWord.lemmaText, fragmentText);
        const referatePhrases = this.referateAction(checkGuessResult, stat, player, fragmentText, proximity);
        const referateText = PhraseBuilder.phrasesToText(referatePhrases);
        const {scoreGainTextLines, scoreGainSum, congratzMax, isFinal} = this.referateScoreGain(checkGuessResult, stat, player, fragmentText, proximity);
        player.score+= scoreGainSum;

        let answerText = '';
        answerText += referateText;
        answerText += '\n';

        scoreGainTextLines.forEach(answerTextLine => answerText += answerTextLine + '\n');

        let hintPhrase = '';
        let aidPhrase = '';
        if (isFinal) {
            this.hotWord.openHotWord();
            this.end();
            hintPhrase = '⏹ эта игра окончена!, напишите мне "+" чтобы сыграть ещё раз.';
        } else {
            hintPhrase = 'Следующий ход!..';
            if (stat.topSimonym.unguessedSimonyms.length) {
                const topSinonymIdx = this.hotWord.openBottomUnguessedTopSimonym(this.innitiatorGameUser);
                if (topSinonymIdx !== null) {
                    const topSinonymText = this.hotWord.topSimonymTexts[topSinonymIdx];
                    aidPhrase = `💠 открываю новую подсказку — топ-слово: \n#️⃣ #${topSinonymIdx + 1} «<u><b>${topSinonymText.toUpperCase()}</b></u>».`;
                } else {
                    throw new Error();
                }
            } else if (stat.hotWord.unguessedLetters.length) {
                const hotLetterIdx = this.hotWord.openRandomUnguessedHotLetter(this.innitiatorGameUser);
                if (hotLetterIdx !== null) {
                    const hotWordLetter = this.hotWord.wordText[hotLetterIdx];
                    aidPhrase = `💠 новая подсказка: откроем букву — ❇️ "<u><b>${hotWordLetter.toUpperCase()}</b></u>". Есть идеи?`;
                } else {
                    throw new Error();
                }
            }
        }
        const hintText = PhraseBuilder.phrasesToText([hintPhrase]);
        const aidText = PhraseBuilder.phrasesToText([aidPhrase]);
        //console.log(checkGuessResult);
        //console.log(stat);
        const {boardText, citationText, shortCitationText} = this.getCurrentStateText();
        this.stepNum++;
        const gameOutputMessage = new GameOutputMessage(this, answerText, boardText, citationText, shortCitationText, hintText, aidText, congratzMax, isFinal);
        const historyEvent = {
            player,
            fragmentText,
            gameOutputMessage,
            date: new Date(),
        };
        this.history.push(historyEvent);
        return gameOutputMessage;
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
        const maskedWord = this.isDone ? this.hotWord.wordText.toUpperCase() : this.hotWord.getMasked();

        let citationText = '';
        let shortCitationText = '';

        if (this.randomCitation) {
            const randomCitationInfoText = this.getRandomCitationInfoText();
            const [hotChunkWordPrefix, hotChunkWordPostfix] = this.randomCitation.hotChunk.text.split(this.randomCitation.hotChunk.word);
            citationText += randomCitationInfoText;
            citationText += `\n`;
            citationText += `--------------------------------`;
            citationText += `\n`;
            citationText += `💬 <i>"...${this.randomCitation.prefixText}${hotChunkWordPrefix}</i><b>${maskedWord}</b><i>${hotChunkWordPostfix}${this.randomCitation.postfixText}..."</i>`;
            citationText += `\n`;

            shortCitationText += `💬 <i>"...${this.randomCitation.shortPrefixText}${hotChunkWordPrefix}</i><b>${maskedWord}</b><i>${hotChunkWordPostfix}${this.randomCitation.shortPostfixText}..."</i>`;
        }

        let boardText = '';

        const wordLength = this.hotWord.wordText.length;
        const unguessedLettersCount = this.hotWord.getStat().hotWord.unguessedLetters.length;

        boardText += `✳️ `;
        boardText += `[ <b>${maskedWord}</b> ] ${wordLength} / ${unguessedLettersCount}`;
        boardText += `\n`;
        boardText += `—`;
        boardText += `\n`;

        const badLettersRawText = this.getGuessedBadLettersText();
        if (badLettersRawText) {
            const badLettersText = `<s>${badLettersRawText.toUpperCase()}</s>`;
            boardText += `🆎 `;
            boardText += `${badLettersText}`;
            boardText += `\n`;
            boardText += `—`;
            boardText += `\n`;
        }

        boardText += `#️⃣ `;
        boardText += this.getTopSimonymText();
        boardText += `\n`;
        boardText += `\n`;

        if (this.isDone) {
            const secDiff = Math.floor((this.endTimestamp - this.startTimestamp) / 1000);
            boardText += `Этот раунд окончен за ⏱ ${secDiff} секунд. `;
            boardText += `и 🔄 ${this.stepNum + 1} ходов. `;
        }
        return {boardText, citationText, shortCitationText};
    }
}
module.exports = Game;
