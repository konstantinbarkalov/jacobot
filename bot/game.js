// 🧠💠🧩💡🔦🔍💬ℹ️✏️👉
const GamestepOutputMessage = require("./gamestepOutputMessage.js");
const GameUser = require('./gameUser/gameUser.js');
const ScoreGain = require('./gameUser/scoreGain.js');
const HotWord = require('./hotWord.js');
const MiscOutputMessage = require('./miscOutputMessage.js');
const PhraseBuilder = require('./phraseBuilder.js');

const uncommonRankThreshold = 70000;
const topSimonymRankThreshold = 80000; // aka rareRankThreshold
class Game {
    stepNum = 0;
    jacoGameUser = new GameUser('never', 'Яков');
    history = [];
    isInCooldown = false;
    constructor(gameMaster, innitiatorGameUser, gameUserGroup) {
        this.gameMaster = gameMaster;
        this.innitiatorGameUser = innitiatorGameUser;
        this.gameUserGroup = gameUserGroup;
        this.players = [ { score: { sum: 0, gains: [], streak: 0 }, gameUser: innitiatorGameUser } ];
    }
    onMessage(messageText, gameUser) {
        if (this.isInCooldown) {
            return null;
        }
        messageText = messageText.toLowerCase().trim();
        const messageTokens = messageText.split(' ');
        if (messageText === '?') {  // TODO
            const {boardText, citationText} = this.getCurrentStateText(); // TODO
            return new GamestepOutputMessage(this, 0, null, null, boardText, citationText, null, null, null, null, null, false, true); // TODO
        } else if (messageTokens.length === 1) {
            let player = this.players.find(player => player.gameUser === gameUser);
            if (!player) {
                player = { score: { sum: 0, gains: [], streak: 0 }, gameUser };
                this.players.push(player);
            };
            const fragmentText = messageTokens[0];
            const validActionRegexp = /^[а-яА-ЯёЁ]+$/;
            const isValidAction = validActionRegexp.test(fragmentText);
            if (isValidAction) {
                return this.onAction(fragmentText, player);
            } else {
                const invalidActionEnglishRegexp = /[a-zA-Z]/;
                const invalidActionDigitsRegexp = /[0-9]/;
                const isInvalidActionEnglish = invalidActionEnglishRegexp.test(fragmentText);
                const isInvalidActionDigits = invalidActionDigitsRegexp.test(fragmentText);
                if (isInvalidActionEnglish) {
                    return new MiscOutputMessage(this, 'Пожалуйста, смени раскладку. А то там у тебя там латинские буквы, а я на Лермонтове учился...');
                } else if (isInvalidActionDigits) {
                    return new MiscOutputMessage(this, 'Боюсь, я пока не знаю ни одной команды с числами внутри. Может это была опечатка? 🤔 /help?');
                } else {
                    return new MiscOutputMessage(this, 'Стыдно сказать, но мне не удалось распознать эту команду. 😕 /help?');
                }
            }
        } else {
            return new MiscOutputMessage(this, 'Без пробелов, плиз. Я пока ещё не понимаю ни одной команды с пробелом. Прости. ☺️ Может /help?');
        }
    }
    onAction(fragmentText, player) {
        const checkGuessResult = this.hotWord.guess(fragmentText, player);
        const stat = this.hotWord.getStat();
        const proximity = this.gameMaster.nlpBackend.getProximity(this.hotWord.lemmaText, fragmentText);
        const rank = this.gameMaster.nlpBackend.getRank(fragmentText);
        const referatePhrases = this.referateAction(checkGuessResult, stat, player, fragmentText, proximity, rank);
        const referateText = PhraseBuilder.phrasesToText(referatePhrases);
        const {scoreGainTextLines, scoreGainSum, congratzMax, isFinal, scoreGains} = this.referateScoreGain(checkGuessResult, stat, player, fragmentText, proximity, rank);
        player.score.sum += scoreGainSum;
        //player.score.gainsPerStep[this.stepNum] = scoreGains;
        player.score.gains = player.score.gains.concat(scoreGains);

        if  ((Math.sign(player.score.streak) !== Math.sign(scoreGainSum))) {
            player.score.streak = 0;
        }
        player.score.streak += Math.sign(scoreGainSum);

        let answerText = '';
        answerText += referateText;
        answerText += '\n';
        scoreGainTextLines.forEach(answerTextLine => answerText += answerTextLine + '\n');

        let scoreDetailsText;

        let hintPhrase = '';
        let aidPhrase = '';
        if (isFinal) {
            scoreDetailsText = this.getGameScoreDetailsText();
            this.hotWord.openHotWord();
            this.end();
            hintPhrase = '⏹ эта игра окончена, напишите мне /go или «+» чтобы сыграть ещё раз.';
        } else {
            hintPhrase = '⏱ Следующий ход!..';
            if (stat.topSimonym.unguessedSimonyms.length) {
                const topSinonymIdx = this.hotWord.openBottomUnguessedTopSimonym(this.innitiatorGameUser);
                if (topSinonymIdx !== null) {
                    const topSinonymText = this.hotWord.topSimonymTexts[topSinonymIdx];
                    const topSinonymProximityPercent = (this.topSimonyms[topSinonymIdx].proximity * 100).toFixed(0) + '%';
                    aidPhrase = `💠 открываю новую нейроподсказку — топ-слово: #️⃣ <b>#${topSinonymIdx + 1} ${topSinonymText.toUpperCase()} ${topSinonymProximityPercent}</b>.`;
                } else {
                    throw new Error();
                }
            } else if (stat.hotWord.unguessedLetters.length) {
                const hotLetterIdx = this.hotWord.openRandomUnguessedHotLetter(this.innitiatorGameUser);
                if (hotLetterIdx !== null) {
                    const hotWordLetter = this.hotWord.wordText[hotLetterIdx];
                    aidPhrase = `💠 новая подсказка: откроем букву — ❇️ "<b>${hotWordLetter.toUpperCase()}</b>". Есть идеи?`;
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
        let unfinalShortCitationText;
        if (!isFinal) {
            unfinalShortCitationText = shortCitationText;
        }

        this.stepNum++;
        const preAnswerText = '⏱ Ответ принят! Итак...';
        const gamestepOutputMessage = new GamestepOutputMessage(this, 3000, preAnswerText, answerText, boardText, citationText, unfinalShortCitationText, hintText, aidText, scoreDetailsText, congratzMax, isFinal);
        const historyEvent = {
            player,
            fragmentText,
            gamestepOutputMessage,
            date: new Date(),
        };
        this.history.push(historyEvent);
        return gamestepOutputMessage;
    }

    onAbort() {
        this.isPlaing = false;
        this.isDone = true;
        this.endTimestamp = Date.now();

        /// remove
        this.players.forEach(player => {
            player.gameUser.scoreStat.addFromGame(this, player.gameUser.genericUserUid);
        });
        this.gameMaster.gameUserStorage.save();
        /// remove

        this.gameMaster.removeActiveGame(this);
        const {boardText, citationText} = this.getCurrentStateText();
        return new GamestepOutputMessage(this, 0, null, 'Кто-то дернул стоп-кран! Игра окончена.', boardText, citationText, null, null, null, null, null, true);
    }

    start() {
        this.isPlaing = true;
        this.isDone = false;

        const randomCitation = this.gameMaster.nlpBackend.getGoodCitation();
        this.randomCitation = randomCitation;
        const hotWordText = randomCitation.hotChunk.word.toLowerCase();
        const hotWordLemma = randomCitation.hotChunk.lemma.toLowerCase();
        const hotWordTag = randomCitation.hotChunk.tag;

        this.topSimonyms = this.gameMaster.nlpBackend.getSimilar(hotWordLemma, 20, topSimonymRankThreshold, hotWordTag);
        const topSimonymTexts = this.topSimonyms.map(topSimonym => topSimonym.smartVectorRecord.lemma);



        this.hotWord = new HotWord(hotWordText, hotWordLemma, topSimonymTexts);

        ////////
        const a = this.gameMaster.nlpBackend.getSimilar(hotWordLemma, 20, 10000000000, hotWordTag);;
        console.log('------');
        console.log(this.hotWord.lemmaText, this.hotWord.wordText);
        console.log('------');
        console.log(a[0]);
        console.log(a[1]);
        console.log(a[2]);
        console.log(a[3]);
        console.log(a[4]);
        //////////

        this.startTimestamp = Date.now();
        for (let i = 1; i < 5; i++) {
            this.hotWord.openBottomUnguessedTopSimonym(this.jacoGameUser);
        }
        const {boardText, citationText} = this.getCurrentStateText();
        return new GamestepOutputMessage(this, 0, null, 'Погнали!', boardText, citationText, null, '⏱ Первый ход!..');
    }
    end() {
        this.isPlaing = false;
        this.isDone = true;
        this.endTimestamp = Date.now();
        this.players.forEach(player => {
            player.gameUser.scoreStat.addFromGame(this, player.gameUser.genericUserUid);
        });
        this.gameMaster.gameUserStorage.save();
        this.gameMaster.removeActiveGame(this);
    }

    referateAction(checkGuessResult, stat, player, fragmentText, proximity, rank) {
        const minUnguessedToWin = Math.max(0, Math.floor((this.hotWord.wordText.length - 2) / 5));
        const proximityPercent = (proximity * 100).toFixed() + '%';
        const isKnownWord = (proximity !== null) && !checkGuessResult.hotWord.isLetter;
        const isBigWord = fragmentText.length > 4;
        const isUncommonWord = rank > uncommonRankThreshold;
        const isTooRareToBeInTop = rank > topSimonymRankThreshold;
        const lowestTopSimonymProximity = this.topSimonyms[this.topSimonyms.length - 1].proximity;
        const isHighEnoughToBeInTop = (proximity >= lowestTopSimonymProximity);
        const isHiddenTopSimonymJustGuessed = isTooRareToBeInTop && isHighEnoughToBeInTop && !checkGuessResult.topSimonym.wasGuessed && !checkGuessResult.hotWord.isLetter && !checkGuessResult.hotWord.isEquallyHotLemma && !checkGuessResult.hotWord.isEquallyHotWord;

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
                    phrase = `❇️ буква «<b>${upcasedFragmentText}</b>» есть!`;
                } else if (justGuessedHotWordLettersCount === 2) {
                    phrase = `❇️ таких буквы «<b>${upcasedFragmentText}</b>» в этом слове целых две!!`;
                } else if (justGuessedHotWordLettersCount === 3) {
                    phrase = `❇️ ТРРРИ буквы «<b>${upcasedFragmentText}</b>» в слове!!!`;
                } else {
                    phrase = `❇️ доооохера букв «<b>${upcasedFragmentText}</b>» в слове!!!!!`;
                }
            } else if (checkGuessResult.hotWord.isEquallyHotWord) {
                phrase = `✳️ Точно. Чётко. Безупречно. Правильный ответ и ${justGuessedHotWordLettersCount} открытых букв!`;
            } else if (checkGuessResult.hotWord.isEquallyHotLemma) {
                if (stat.hotWord.unguessedLetters.length === 0) {
                    phrase = `🈯️+✳️ Вы назвали лемму и открыли главное слово! Звучит как ошибка, ей-богу, но ${justGuessedHotWordLettersCount} открытых букв и слово полностью разгадано.`;
                } else if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin) {
                    phrase = `🈯️+✳️ Вы назвали неточную форму, но это засчитывается как победа! ${justGuessedHotWordLettersCount} открытых букв.`;
                } else {
                    phrase = `🈯️+✳️ ОЧЕНЬ БЛИЗКО! ${justGuessedHotWordLettersCount} открытых букв.`;
                }
            } else if (checkGuessResult.topSimonym.isRobustGuess) {
                // CASE: топ-слово угадано и оно внутри загаданного
                if (stat.hotWord.unguessedLetters.length === 0) {
                    phrase = `✳️+#️⃣ это комбо!! Открыто близкое слово номер #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} (его близость к загаданному ${proximityPercent} ). И одновременно разгадано главное слово. ${justGuessedHotWordLettersCount} открытых букв!`;
                } else if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin) {
                    phrase = `✳️+#️⃣ кажется, у нас произошла забавная ситуация!! Вы открыли близкое слово номер #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} (его близость к загаданному ${proximityPercent} ). А ещё ${justGuessedHotWordLettersCount} букв! 🤩`;
                } else {
                    phrase = `✳️+#️⃣ просто вау!!! Смотрите, что произошло. Открыто близкое слово номер #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} (его близость к загаданному ${proximityPercent} ). Это во-первых. Во-вторых, это слово ✳️ «<b>${upcasedFragmentText}</b>» само по себе целиком содержится в загаданом. Таким образом, всего мы открываем ${justGuessedHotWordLettersCount} букв в слове, и слово № ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} из топа! Браво!`;
                }
            } else if (isKnownWord) {
                // CASE: слово-фрагмент внутри загаданного угадан
                if (isHiddenTopSimonymJustGuessed) {
                    phrase = `🈳+✳️ У нас случилось очередное удивительное. Смотрите! Редкое слово «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Причем, его близость ${proximityPercent}. Это редкое (низкочастотное) слово, и у нейросети есть сомнения: вообще слово ли это. Так что такие слова не попадают в топ близких слов, чтобы не усложнять жизнь игрокам. Но вы его назвали сами. И оно "есть" в топе. Это заслуживает отдельный приз!`;
                } else if (isBigWord) {
                    // CASE: большое (неполезное как близкое) слово внутри загаданного угадан
                    if (stat.hotWord.unguessedLetters.length === 0) {
                        phrase = `🈳/✳️ Слово «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Причем, его близость ${proximityPercent}.`;
                    } else if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin) {
                        phrase = `✳️+#️⃣ кажется, у нас произошла забавная ситуация!! Вы открыли близкое слово номер #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} (его близость к загаданному ${proximityPercent} ). А ещё ${justGuessedHotWordLettersCount} букв! 🤩`;
                    } else if (checkGuessResult.topSimonym.wasTopGuess) {
                        // CASE: большое (неполезное как близкое) слово внутри загаданного угадано, было раньше открыто в топе
                        phrase = `✳️ Ха, слово «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто, забавно! Это слово, кстати № #️⃣ ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} в топе близких слов, но мы его уже открыли до этого. (близость ${proximityPercent}).`;
                    } else if (checkGuessResult.topSimonym.wasGuessed) {
                        // CASE: большое (неполезное как близкое) слово внутри загаданного угадан, слово не из топа, уже называли
                        phrase = `✳️ Вот это ситация! Мы уже открывали слово «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто, забавно. Причем, его близость всего-то ${proximityPercent}.`;
                    } else {
                        // CASE: большое (неполезное как близкое) слово внутри загаданного угадано, слово не из топа, ещё не называли
                        phrase = `🈳/✳️ Слово «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Причем, его близость ${proximityPercent}.`;
                    }
                } else {
                    // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано
                    if (checkGuessResult.topSimonym.wasTopGuess) {
                        // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано, был раньше открыт в топе
                        phrase = `✳️ Хмм! «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Это, кстати, ещё и слово №${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} в топе близких слов, но мы его уже открыли ранее. (близость ${proximityPercent}).`;
                    } else if (checkGuessResult.topSimonym.wasGuessed) {
                        // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано, слово не из топа, уже называли
                        phrase = `✳️ Ха, «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто, забавно. Это, кстати, ещё и слово, причем, его близость к загаданному всего-то ${proximityPercent}.`;
                    } else {
                        // CASE: небольшое (неполезное как близкое) слово-фрагмент внутри загаданного угадано, слово не из топа, ещё не называли
                        phrase = `🈳/✳️ Слово «<b>${upcasedFragmentText}</b>» целиком содержится в загаданном, ${justGuessedHotWordLettersCount} буквы открыто. Причем, его близость ${proximityPercent}.`;
                    }
                }
            } else {
                // CASE: фрагмент внутри загаданного слова угадан
                if (justGuessedHotWordUniqueLettersCount > 4) {
                    // CASE: фрагмент внутри загаданного слова угадан, больше 4 уникальных букв
                    phrase = `✳️ бууум! фрагмент «<b>${upcasedFragmentText}</b>» внутри загаданного слова угадан, сразу ${justGuessedHotWordLettersCount} буквы открыто!`;
                } else if (justGuessedHotWordUniqueLettersCount > 1) {
                    // CASE: фрагмент внутри загаданного слова угадан, больше 1 уникальной буквы
                    const lettersWithoutLast = justGuessedHotWordUniqueLetters.slice(0, justGuessedHotWordUniqueLetters.length - 1);
                    const lastLetterText = '"' + justGuessedHotWordUniqueLetters[justGuessedHotWordUniqueLetters.length - 1].toUpperCase() + '"';
                    const lettersWithoutLastText = lettersWithoutLast.map(letter => `"${letter.toUpperCase()}"`).join(', ');
                    const lettersText = lettersWithoutLastText + ' и ' + lastLetterText;
                    phrase = `✳️ поздравляю! Фрагмент «<b>${upcasedFragmentText}</b>» внутри загаданного слова угадан, открываем буквы ❇️ ${lettersText}. ${justGuessedHotWordLettersCount} буквы в загаданном слове открыто!`;
                } else if (justGuessedHotWordUniqueLettersCount === 1) {
                    // CASE: фрагмент внутри загаданного слова угадан, открыта 1 уникальная буква
                    const uniqueLetter = justGuessedHotWordUniqueLetters[0];
                    if (justGuessedHotWordLettersCount === 1) {
                        // CASE: фрагмент внутри загаданного слова угадан, открыта 1 буква
                        phrase = `✳️/❇️ из названного фрагмента «<b>${upcasedFragmentText}</b>» в загаданном слове можно открыть только одну букву ❇️ "${uniqueLetter}". Довольно рисковнанный поступок.`;
                    } else {
                        // CASE: фрагмент внутри загаданного слова угадан, открыта 1 уникальная буква несколько раз
                        phrase = `✳️/❇️ поздравляю! Из всего «<b>${upcasedFragmentText}</b>» мы открываем букву ❇️ ${uniqueLetter}, но зато ${justGuessedHotWordLettersCount} раз! Ловко!`;
                    }
                } else {
                    // CASE: фрагмент внутри загаданного слова угадан, а уникальных букв 0
                    throw new Error('CASE: фрагмент внутри загаданного слова угадан, а уникальных букв 0');
                }
            }
        } else if (checkGuessResult.topSimonym.isRobustGuess) {
            // CASE: топ-слово угадано
            phrase = `#️⃣ близкое слово номер ${checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1} угадано, отлично! Его близость к загаданному ${proximityPercent}.`;
        } else if (isKnownWord) {
            // CASE: (неполезное) словарное слово
            if (checkGuessResult.hotWord.isEquallyHotLemma) {
                if (checkGuessResult.hotWord.wasGuessed) {
                    phrase = `🈯️ ОЧЕНЬ БЛИЗКО! Ай-яй-яй.`;
                } else {
                    phrase = `Вы уже называли это слово, ну же! Это почти верный ответ. Совсем рядом!`;
                }
            } else if (isHiddenTopSimonymJustGuessed) {
                if (checkGuessResult.hotWord.wasGuessed) {
                    phrase = `Это редкое "скрытое" топ-слово вы уже называли: его близость к загаданному ${proximityPercent}!`;
                } else {
                    phrase = `🈳 Оппа! Редкое слово «<b>${upcasedFragmentText}</b>». Настолько низкочастотное и подозрительное, что нейросеть не стала добавлять его в топ. А ведь это слово там должно было быть: его близость к загаданному ${proximityPercent}! Вы открыли "скрытое" слово в топе, за это положены дополнительные очки, поздравляю!`;
                }
            } else if (isBigWord) {
                // CASE: (неполезное) словарное большое слово
                if (checkGuessResult.hotWord.wasGuessed) {
                    // CASE: такое больше (неполезное) слово в словаре есть, но его называли
                    phrase = `слово «<b>${upcasedFragmentText}</b>» уже называли, его близость к загаданному ${proximityPercent}. Постарайтесь потратить следующий ход более полезно.`;
                } else {
                    // CASE: такое больше (неполезное) слово в словаре есть, ещё не называли
                    phrase = `*️⃣ информация по слову «<b>${upcasedFragmentText}</b>»: его близость к загаданному ${proximityPercent}. Надеюсь это как-то поможет.`;
                }
            } else {
                // CASE: (неполезное) словарное небольшое слово-фрагмент
                if (checkGuessResult.hotWord.wasGuessed) {
                    // CASE: такае небольшое (неполезное) слово-фрамент в словаре есть, но его называли
                    phrase = `слово «<b>${upcasedFragmentText}</b>» уже называли, его близость к загаданному ${proximityPercent}. Постарайтесь потратить cледующий следующий ход более полезно.`;
                } else {
                    // CASE: такае небольшое (неполезное) слово-фрамент в словаре есть, ещё не называли
                    phrase = `*️⃣ слово «<b>${upcasedFragmentText}</b>» не находится в топе близких слов, его близость к загаданному составляет ${proximityPercent}. Это полезная информация.`;
                }
            }

        } else {
            // CASE: несловарный фрагмент или буква, новых букв не угадано
            if (checkGuessResult.hotWord.isLetter) {
                // CASE: буква не угадана
                if (checkGuessResult.hotWord.wasLetterGoodGuessed) {
                    // CASE: буква не угадана, она уже открыта
                    phrase = `🆎 но ведь буква ❇️ «<b>${upcasedFragmentText}</b>» уже была открыта. Зря потраченный ход.`;
                } else if (checkGuessResult.hotWord.wasLetterBadGuessed) {
                    // CASE: буква не угадана, уже называли
                    phrase = `🆎 букву «<b>${upcasedFragmentText}</b>» уже назали ранее. Будте внимательней.`;
                } else {
                    // CASE: буква не угадана, ещё не называли
                    let rnd = Math.random();
                    if (rnd > 0.9) {
                        phrase = `🆎 буквы «<b>${upcasedFragmentText}</b>» в слове нет`;
                    } else if (rnd > 0.8) {
                        phrase = `🆎 нет такой буквы`;
                    } else if (rnd > 0.7) {
                        phrase = `🆎 жаль, но буквы «<b>${upcasedFragmentText}</b>» нет в загаданном слове`;
                    } else if (rnd > 0.6) {
                        phrase = `🆎 упс, такой буквы нет. Вычеркиваем «<b>${upcasedFragmentText}</b>» из списка возможных букв`;
                    } else if (rnd > 0.5) {
                        phrase = `🆎 «<b>${upcasedFragmentText}</b>» - хорошая буква, но в слове её нет. Жаль`;
                    } else if (rnd > 0.4) {
                        phrase = `🆎 такой буквы в слове нет`;
                    } else if (rnd > 0.3) {
                        phrase = `🆎 буква отсутсвует`;
                    } else if (rnd > 0.2) {
                        phrase = `🆎 хотел бы я, чтобы в жизни у каждого букв «<b>${upcasedFragmentText}</b>» было побольше, но к сожалению в этом слове её нет ни одной`;
                    } else if (rnd > 0.1) {
                        phrase = `🆎 плохая новость: такой буквы нет. Хорошая новость: на одну проверенную букву стало меньше. «<b>${upcasedFragmentText}</b>» исключена.`;
                    } else {
                        phrase = `🆎 в слове нет буквы «<b>${upcasedFragmentText}</b>»`;
                    }
                }
            } else {
                // CASE: несловарный фрагмент (не буква), новых букв не угадано
                if (checkGuessResult.hotWord.wasGoodGuessedSuperstring) {
                    // CASE: несловарный фрагмент (не буква), новых букв не угадано, уже угадывали раньше фрагмент, в котором этот есть целиком
                    phrase = `✴️ к сожалению, новых букв не угадано. Обратите внимание, что ✳️ «<b>${upcasedFragmentText}</b>» содержится в "${checkGuessResult.hotWord.wasGoodGuessedSuperstring.toUpperCase()}", а это ранее уже угадывали.`;
                } else {
                    phrase = `✴️ не знаю что это такое — «<b>${upcasedFragmentText}</b>», но такого фрагмента в слове нет.`;
                }
            }
        }
        let postPhrase = '';
        if (stat.hotWord.unguessedLetters.length === 0) {
            postPhrase = `\n✅ ВЫ ПОЛНОСТЬЮ УГАДАЛИ СЛОВО! «<b>${this.hotWord.wordText.toUpperCase()}</b>», УРА!`;
        } else if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin) {
            postPhrase = `\n✅ осталось всего ${stat.hotWord.unguessedLetters.length} букв, а значит по правилам слово «<b>${this.hotWord.wordText.toUpperCase()}</b>» раскрыто! Это победа!`;
        }
        const phrases = [phrase, postPhrase];
        return phrases;
    }
    referateScoreGain(checkGuessResult, stat, player, fragmentText, proximity, rank) {
        const minUnguessedToWin = Math.max(0, Math.floor((this.hotWord.wordText.length - 2) / 5));
        const isKnownWord = (proximity !== null) && !checkGuessResult.hotWord.isLetter;
        const isBigWord = fragmentText.length > 4;
        const isUncommonWord = rank > uncommonRankThreshold;
        const isTooRareToBeInTop = rank > topSimonymRankThreshold;
        const lowestTopSimonymProximity = this.topSimonyms[this.topSimonyms.length - 1].proximity;
        const isHighEnoughToBeInTop = (proximity >= lowestTopSimonymProximity);
        const isHiddenTopSimonymJustGuessed = isTooRareToBeInTop && isHighEnoughToBeInTop && !checkGuessResult.topSimonym.wasGuessed && !checkGuessResult.hotWord.isLetter && !checkGuessResult.hotWord.isEquallyHotLemma && !checkGuessResult.hotWord.isEquallyHotWord;

        let scoreGains = [];
        if (checkGuessResult.topSimonym.isRobustGuess) {
            if (isUncommonWord) {
                const scoreGainValue = 750 + Math.round(750 / (checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1));
                const subject = 'нечастое близкое топ-слово';
                const value = scoreGainValue;
                const congratz = 1;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            } else {
                const scoreGainValue = 250 + Math.round(750 / (checkGuessResult.topSimonym.justTopGuessedSimonymIdx + 1));
                const subject = 'близкое топ-слово';
                const value = scoreGainValue;
                const congratz = 1;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            }
        }
        if (isHiddenTopSimonymJustGuessed) {
            if (checkGuessResult.hotWord.isRobustGuess) {
                const scoreGainValue = 5000;
                const subject = 'секретное топ-слово внутри слова';
                const value = scoreGainValue;
                const congratz = 1;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            } else {
                const scoreGainValue = 1000;
                const subject = 'секретное топ-слово';
                const value = scoreGainValue;
                const congratz = 1;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            }
        }
        if (checkGuessResult.hotWord.isRobustGuess) {

            if (checkGuessResult.hotWord.isLetter) {
                if (fragmentText === 'ъ') {
                    const scoreGainValue = 666 * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                    const subject = 'это знак! (твердый)';
                    const value = scoreGainValue;
                    const congratz = Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3);
                    const isFinal = false;
                    const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                    scoreGains.push(scoreGain);
                } else if (fragmentText === 'ь') {
                    const scoreGainValue = 66 * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                    const subject = 'это знак! (мягкий)';
                    const value = scoreGainValue;
                    const congratz = Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3);
                    const isFinal = false;
                    const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                    scoreGains.push(scoreGain);
                } else if (fragmentText === 'я') {
                    const scoreGainValue = 99 * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                    const subject = 'любимая буква';
                    const value = scoreGainValue;
                    const congratz = Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3);
                    const isFinal = false;
                    const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                    scoreGains.push(scoreGain);
                } else {
                    const scoreGainValue = 50 * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                    const subject = 'буква';
                    const value = scoreGainValue;
                    const congratz = Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3);
                    const isFinal = false;
                    const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                    scoreGains.push(scoreGain);
                }

            } else {
                if (!checkGuessResult.hotWord.isEquallyHotWord && checkGuessResult.hotWord.isEquallyHotLemma) {
                    const scoreGainValue = 10000;
                    const subject = 'лемма внутри слова';
                    const value = scoreGainValue;
                    const congratz = 6;
                    const isFinal = false;
                    const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                    scoreGains.push(scoreGain);
                } else {
                    const scoreGainValue = 50 * checkGuessResult.hotWord.justGuessedHotWordLetters.length * checkGuessResult.hotWord.justGuessedHotWordLetters.length;
                    const subject = 'фрагмент';
                    const value = scoreGainValue;
                    const congratz = Math.min(Math.floor(checkGuessResult.hotWord.justGuessedHotWordLetters.length / 2 + 1), 3);
                    const isFinal = false;
                    const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                    scoreGains.push(scoreGain);
                }
            }
        } else if (!checkGuessResult.hotWord.isEquallyHotWord && checkGuessResult.hotWord.isEquallyHotLemma  && !checkGuessResult.hotWord.wasGuessed) {
            const scoreGainValue = 500;
            const subject = 'лемма';
            const value = scoreGainValue;
            const congratz = 2;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        }

        if (!checkGuessResult.topSimonym.isRobustGuess && !checkGuessResult.hotWord.isRobustGuess) {
            if (checkGuessResult.hotWord.wasGuessed) {
                const scoreGainValue = -50;
                const subject = 'невнимательность';
                const value = scoreGainValue;
                const congratz = -1;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            } else if (isKnownWord && !checkGuessResult.topSimonym.wasGuessed) {
                const scoreGainValue = -10;
                const subject = 'цена любопытства';
                const value = scoreGainValue;
                const congratz = 0;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            } else {
                const scoreGainValue = -25;
                const subject = 'неудача';
                const value = scoreGainValue;
                const congratz = -1;
                const isFinal = false;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
                scoreGains.push(scoreGain);
            }
        }

        if (checkGuessResult.hotWord.isRobustGuess) {
            if (checkGuessResult.hotWord.isEquallyHotWord) {
                const scoreGainValue = 2000;
                const subject = 'слово названо точно';
                const value = scoreGainValue;
                const congratz = 5;
                const isFinal = true;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);

                scoreGains.push(scoreGain);
            } else if (stat.hotWord.unguessedLetters.length === 0) {
                const scoreGainValue = 1000;
                const subject = 'слово раскрыто полностью';
                const value = scoreGainValue;
                const congratz = 5;
                const isFinal = true;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);

                scoreGains.push(scoreGain);
            } else if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin) {
                const scoreGainValue = 500;
                const subject = 'слово раскрыто почти полностью';
                const value = scoreGainValue;
                const congratz = 4;
                const isFinal = true;
                const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);

                scoreGains.push(scoreGain);
            }
        } else if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin) {
            const scoreGainValue = 1;
            const subject = 'слово мучительно выпытано';
            const value = scoreGainValue;
            const congratz = 0;
            const isFinal = true;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        }

        if (stat.hotWord.unguessedLetters.length <= minUnguessedToWin && this.stepNum < 10) {
            const scoreGainValue = Math.round(3000 / (this.stepNum + 1));
            const subject = 'быстрая победа';
            const value = scoreGainValue;
            const congratz = 6;
            const isFinal = true;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        }

        const nextSteakSign = Math.sign(scoreGains.reduce((sum, scoreGain) => { return sum + scoreGain.value; }, 0));

        if (nextSteakSign > 0 && player.score.streak > 50) {
            const scoreGainValue = -10000;
            const subject = 'штраф за читерство';
            const value = scoreGainValue;
            const congratz = -1;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        } else if (nextSteakSign > 0 && player.score.streak === 5) {
            const scoreGainValue = -100;
            const subject = 'штраф за жадность';
            const value = scoreGainValue;
            const congratz = -1;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        } else if (nextSteakSign > 0 && player.score.streak > 2) {
            const scoreGainValue = 100 * Math.min(player.score.streak + 1, 5);
            const subject = 'чудесная серия побед';
            const value = scoreGainValue;
            const congratz = 4;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        } else if (nextSteakSign > 0 && player.score.streak > 0) {
            const scoreGainValue = 100 * Math.min(player.score.streak + 1, 5);
            const subject = 'серия побед';
            const value = scoreGainValue;
            const congratz = 4;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        } else if (nextSteakSign < 0 && player.score.streak === -3) {
            const scoreGainValue = +3;
            const subject = 'компенсация за невезение';
            const value = scoreGainValue;
            const congratz = 0;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        } else if (nextSteakSign < 0 && player.score.streak === -5) {
            const scoreGainValue = +1;
            const subject = 'компенсация за фатальное невезение';
            const value = scoreGainValue;
            const congratz = 0;
            const isFinal = false;
            const scoreGain = new ScoreGain(subject, value, this.stepNum, fragmentText, congratz, isFinal);
            scoreGains.push(scoreGain);
        }
        const initialReferateResult = {scoreGainTextLines: [], scoreGainSum: 0, congratzMax: -Infinity, isFinal: false};
        if (scoreGains.length > 0) {
            const referateResult = scoreGains.reduce((referateResult, scoreGain) => {
                const scoreGainSignedText = ((scoreGain.value >= 0) ? '+' : '−') + Math.abs(scoreGain.value);
                const sumBefore = player.score.sum + referateResult.scoreGainSum;
                const sumAfter = sumBefore + scoreGain.value;
                const scoreGainSumAfterSignedText = ((sumAfter >= 0) ? '+' : '−') + Math.abs(sumAfter);
                const scoreGainSumBeforeSignedText = ((sumBefore >= 0) ? '+' : '−') + Math.abs(sumBefore);
                // 💰🔹
                const scoreGainTextLine = `💳 ${scoreGainSumBeforeSignedText} <b>[ ${scoreGainSignedText}💰 ]</b> = ${scoreGainSumAfterSignedText} / ${scoreGain.subject} /`;
                referateResult.scoreGainTextLines.push(scoreGainTextLine);
                referateResult.scoreGainSum += scoreGain.value;
                referateResult.congratzMax = Math.max(scoreGain.congratz, referateResult.congratzMax);
                referateResult.isFinal = !!(scoreGain.isFinal || referateResult.isFinal);
                return referateResult;
            }, initialReferateResult);
            referateResult.scoreGains = scoreGains;
            return referateResult;
        } else {
            const referateResult =  Object.assign({}, initialReferateResult, {congratzMax: 0});
            referateResult.scoreGains = [];
            return referateResult;
        }
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
        } else if (positionRatio >= 0.35 && positionRatio < 0.48) {
            positionText = 'ближе к концу первой половины книги';
        } else if (positionRatio >= 0.48 && positionRatio < 0.52) {
            positionText = 'на экваторе книги';
        }else if (positionRatio >= 0.52 && positionRatio < 0.65) {
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
        const citationInfoText = `📖 «${this.randomCitation.bookInfo.name}» ${this.randomCitation.bookInfo.author}, ${this.randomCitation.bookInfo.year} / ${positionText} /`;
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
            const rank = topSimonym.smartVectorRecord.vocabularyIdx;
            const rankCategory = (rank > uncommonRankThreshold) ? 'нечаст.' : '';
            //const line = `#${idx + 1}: ${lemma} ${tag} ${proximityPercent} R${rankCategory}`;
            const line = `#${idx + 1}: ${lemma} ${proximityPercent} ${rankCategory}`;

            if (isOpened) { // TEMPORARY TODO: configurable
                lines.push(line);
            }
        });
        return lines.join('\n');
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
            //citationText += `—`;
            //citationText += `\n`;
            citationText += `\n`;
            citationText += `💬 <i>«...${this.randomCitation.prefixText}${hotChunkWordPrefix}</i><b>${maskedWord}</b><i>${hotChunkWordPostfix}${this.randomCitation.postfixText}...»</i>`;
            citationText += `\n`;

            shortCitationText += `💬 <i>«...${this.randomCitation.shortPrefixText}${hotChunkWordPrefix}</i><b>${maskedWord}</b><i>${hotChunkWordPostfix}${this.randomCitation.shortPostfixText}...»</i>`;
        }

        let boardText = '';

        const wordLength = this.hotWord.wordText.length;
        const unguessedLettersCount = this.hotWord.getStat().hotWord.unguessedLetters.length;

        boardText += `✳️ `;
        boardText += `[ <b>${maskedWord}</b> ] ${unguessedLettersCount} / ${wordLength}`;
        boardText += `\n`;
        //boardText += `—`;
        //boardText += `\n`;
        boardText += `\n`;

        const badLettersRawText = this.getGuessedBadLettersText();
        if (badLettersRawText) {
            const badLettersText = `<s>${badLettersRawText.toUpperCase()}</s>`;
            boardText += `🆎 `;
            boardText += `${badLettersText}`;
            boardText += `\n`;
            //boardText += `—`;
            //boardText += `\n`;
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
    getGameScoreDetailsText() {
        const isMultiplayer = this.players.length > 1;
        const sortedPlayers = this.players.sort((a, b) => b.score.sum - a.score.sum);
        sortedPlayers.splice(3);
        const detailsText = sortedPlayers.map((player, currentGameRank) => {
            let userRankEmoji;
            if (currentGameRank === 0) {
                userRankEmoji = '🥇';
            } else if (currentGameRank === 1) {
                userRankEmoji = '🥈';
            } else {
                userRankEmoji = '🥉';
            }
            let playerDetailsHeaderText = '';
            playerDetailsHeaderText += `👨‍🎓 ${player.gameUser.name} ${userRankEmoji}`;
            playerDetailsHeaderText += '\n';
            playerDetailsHeaderText += '-----------------------------';
            playerDetailsHeaderText += '\n';

            const playerDetailsText = this.getGameScoreDetailsTextForPlayer(player);
            const playerSummaryText = this.getGameScoreSummaryTextForPlayer(player);

            return playerDetailsHeaderText + playerDetailsText + playerSummaryText + '\n';
        }).join('\n\n');
        return detailsText;
    }
    getGameScoreDetailsTextForPlayer(player) {

        const gainsPerSubject = player.score.gains.reduce((gainsPerSubject, scoreGain) => {
            let bin = gainsPerSubject[scoreGain.subject];
            if (!bin) {
                bin = []
                gainsPerSubject[scoreGain.subject] = bin;
            }
            bin.push(scoreGain);
            return gainsPerSubject;
        }, {});

        const lines = Object.entries(gainsPerSubject).map(([subject, bin]) => {
            const initialScoreGainsInfo = {lines: [], sum: 0, count: 0};
            const similarGainsInfo = bin.reduce((similarGainsInfo, scoreGain) => {
                const scoreGainSignedText = ((scoreGain.value >= 0) ? '+' : '−') + Math.abs(scoreGain.value);
                const scoreGainTextLine = `${scoreGainSignedText}`;
                similarGainsInfo.lines.push(scoreGainTextLine);
                similarGainsInfo.sum += scoreGain.value;
                similarGainsInfo.count++;
                return similarGainsInfo;
            }, initialScoreGainsInfo);



            let xFactorText = '';
            if (similarGainsInfo.count > 1) {
                xFactorText = ' x' + similarGainsInfo.count;
            }
            const scoreGainSignedText = ((similarGainsInfo.sum >= 0) ? '+' : '−') + Math.abs(similarGainsInfo.sum);
            const subsumText = `${scoreGainSignedText}`;
            const similarGainsLine = (similarGainsInfo.lines.length > 1) ? similarGainsInfo.lines.join(' ') + ' = ' : '';

            let badge = '🏅 ';
            const groupStat = player.gameUser.scoreStat.groupStats[this.gameUserGroup.genericUserGroupUid];
            if (groupStat) {
                const coreGainsGroupSummary = groupStat.getScoreGainsGroupSummary();
                const maxGainsSumForSubject = coreGainsGroupSummary.maxScoreGainsSumsBySubjet[subject];
                if (maxGainsSumForSubject === undefined) {
                    badge = '🎖 NEW! ';
                } else if (similarGainsInfo.sum > maxGainsSumForSubject) {
                    badge = '🏆 RECORD! ';
                }
            }
            // 🏅🚩🆕🎖
            const scoreGainTextLine = `${badge}<b>${subject.toUpperCase()}</b>${xFactorText}: ${similarGainsLine}${subsumText}💰`;
            return scoreGainTextLine;
        });
        let detailsText = '';
        detailsText += lines.join('\n');
        detailsText += '\n';
        detailsText += '-----------------------------';
        detailsText += '\n';
        detailsText += `💳 ВСЕГО ЗА ИГРУ: <b>${player.score.sum}</b>💰`;
        return detailsText;
    }
    getGameScoreSummaryTextForPlayer(player) {

        let summarysText = '';

        const groupStat = player.gameUser.scoreStat.groupStats[this.gameUserGroup.genericUserGroupUid];

        if (groupStat && groupStat.gameStats.length > 0) {
            const gameStats = groupStat.gameStats;
            const initialMmm = {count: 0, step: {min: Infinity, max: -Infinity, sum: 0}, score: {min: Infinity, max: -Infinity, sum: 0, all: []}};
            const mmm = gameStats.reduce((mmm, gameStat) => {
                mmm.step.min = Math.min(mmm.step.min, gameStat.stepsCount);
                mmm.step.max = Math.max(mmm.step.max, gameStat.stepsCount);
                mmm.step.sum += gameStat.stepsCount;
                const score = gameStat.scoreGains.reduce((score, scoreGain) => {return score + scoreGain.value}, 0);
                mmm.score.min = Math.min(mmm.score.min, score);
                mmm.score.max = Math.max(mmm.score.max, score);
                mmm.score.sum += score;
                mmm.score.all.push(score);
                mmm.count++;
                return mmm;
            }, initialMmm);
            mmm.step.mean = mmm.step.sum / mmm.count;
            mmm.score.mean = mmm.score.sum / mmm.count;
            const stepSortedStepsCount = gameStats.map(gameStat => gameStat.stepsCount).sort();
            const sortedGameScores = mmm.score.all.sort();
            mmm.step.median = stepSortedStepsCount[Math.floor(stepSortedStepsCount.length / 2)];
            mmm.score.median = sortedGameScores[Math.floor(sortedGameScores.length / 2)];

            summarysText += '\n';
            summarysText += '-----------------------------';
            summarysText += '\n';
            summarysText += `📊 В этом сезоне сыграно ${mmm.count} игр. ⏱ Количество ходов: <b>мед. ${mmm.step.median.toFixed(0)}</b>, сред. ${mmm.step.mean.toFixed(0)}, макс. ${mmm.step.max.toFixed(0)}, мин. ${mmm.step.min.toFixed(0)}. 💳 Очков за игру: <b>мед. ${mmm.score.median.toFixed(0)}</b>, сред. ${mmm.score.mean.toFixed(0)}, макс. ${mmm.score.max.toFixed(0)}, мин. ${mmm.score.min.toFixed(0)}.`;
            summarysText += '\n';
        }


        return summarysText;
    }
}
module.exports = Game;
