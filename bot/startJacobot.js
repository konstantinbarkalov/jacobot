const GameMaster = require('./gameMaster.js');
const gameMaster = new GameMaster();

const { Telegraf } = require('telegraf');
const botToken = require('./secret/botToken.json').token;

async function start() {
    console.log('preloading...');
    await gameMaster.preload();
    startTelegramBot();
}
function onAbout(ctx) {
    const aboutHtml = gameMaster.onAbout();
    ctx.reply(aboutHtml.answer, {parse_mode: 'HTML'});
}
function onRules(ctx) {
    const rulesHtml = gameMaster.onRules();
    ctx.reply(rulesHtml.answer, {parse_mode: 'HTML'});
}
function onMetrix(ctx) {
    const metixHtml = gameMaster.onMetrix();
    ctx.reply(metixHtml.answer, {parse_mode: 'HTML'});
}
function startTelegramBot() {
    const bot = new Telegraf(botToken);
    bot.start(onAbout);
    bot.command('about', onAbout);
    bot.command('help', onAbout);
    bot.command('?', onAbout);
    bot.command('rules', onRules);
    bot.command('metrix', onMetrix);
    bot.command('debug', (ctx) => {
        ctx.reply(JSON.stringify(ctx.message, null, 4));
    });
    bot.on('message', async (ctx) => {
        if (ctx.message.from.id === ctx.botInfo.id) {
            // on pin
            return;
        }
        const messageText = ctx.message.text ? ctx.message.text.trim() : '';
        //const prefixes = ['/ok ', '/o ', '/ок ', '/о ', '/']; // order matters!
        let cleanedMessageText = messageText;
        // for (let i = 0; i < prefixes.length; i++) {
        //     const prefix = prefixes[i];
        //     if (messageText.slice(0, prefix.length) === prefix) {
        //         cleanedMessageText = messageText.slice(prefix.length);
        //         break;
        //     }
        // }
        const genericUserUid = ctx.from.id;
        const genericUserName = ctx.from.first_name;
        const genericUserGroupUid = ctx.chat.id;
        const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
        const gameOutputMessage = gameMaster.onMessage(cleanedMessageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
        if (gameOutputMessage.answer) {
            let miniCongratz = '';
            if (gameOutputMessage.congratz > 0) {
                miniCongratz = '👍 ';
            } else if (gameOutputMessage.congratz < 0) {
                miniCongratz = '❌ ';
            } else if (gameOutputMessage.congratz === 0) {
                miniCongratz = '👌 ';
            }
            //await ctx.replyWithHTML(miniCongratz + gameOutputMessage.answer, {reply_to_message_id: ctx.message.message_id});
            await ctx.replyWithHTML(miniCongratz + gameOutputMessage.answer);
        }
        const hasCongratz = gameOutputMessage.congratz !== null;
        if (hasCongratz) {
            if (gameOutputMessage.congratz >= 5) {
                await ctx.reply('😎');
            } else if (gameOutputMessage.congratz >= 4) {
                await ctx.reply('😎');
            } else if (gameOutputMessage.congratz >= 3) {
                await ctx.reply('😀');
            } else if (gameOutputMessage.congratz >= 2) {
                await ctx.reply('👍');
            } else if (gameOutputMessage.congratz <= -2) {
                await ctx.reply('👎');
            }
        }


        if (gameOutputMessage.citation) {
            let genericMessageUid;
            if (gameOutputMessage.isFinal) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                gameOutputMessage.game.liveCitation = null;
                await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.citation, {parse_mode: 'HTML'});

            } else {
                if (gameOutputMessage.game.liveCitation) {
                    if (gameOutputMessage.citation !== gameOutputMessage.game.liveCitation.sendedMessageText) {
                        sendResult = await bot.telegram.editMessageText(gameOutputMessage.game.liveCitation.genericUserGroupUid, gameOutputMessage.game.liveCitation.genericMessageUid, null, gameOutputMessage.citation, {disable_notification: true, parse_mode: 'HTML'});
                        genericMessageUid = sendResult.message_id;
                    } else {
                        genericMessageUid = gameOutputMessage.game.liveCitation.genericMessageUid;
                    }
                } else {
                    sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.citation, {parse_mode: 'HTML'});
                    genericMessageUid = sendResult.message_id;
                }
                gameOutputMessage.game.liveCitation = {
                    genericMessageUid,
                    genericUserGroupUid,
                    sendedMessageText: gameOutputMessage.citation,
                }
            }
        }

        if (gameOutputMessage.board) {
            await new Promise(resolve => setTimeout(resolve, 250));
            let genericMessageUid;
            if (gameOutputMessage.isFinal) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (gameOutputMessage.game.liveBoard) {
                    try {
                        await bot.telegram.unpinChatMessage(gameOutputMessage.game.liveBoard.genericUserGroupUid, genericMessageUid);
                    } catch {
                        // TODO
                    }
                }
                gameOutputMessage.game.liveBoard = null;
                await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.board, {parse_mode: 'HTML'});

            } else {
                if (gameOutputMessage.game.liveBoard) {
                    if (gameOutputMessage.board !== gameOutputMessage.game.liveBoard.sendedMessageText) {
                        sendResult = await bot.telegram.editMessageText(gameOutputMessage.game.liveBoard.genericUserGroupUid, gameOutputMessage.game.liveBoard.genericMessageUid, null, gameOutputMessage.board, {disable_notification: true, parse_mode: 'HTML'});
                        genericMessageUid = sendResult.message_id;
                    } else {
                        genericMessageUid = gameOutputMessage.game.liveBoard.genericMessageUid;
                    }
                } else {
                    sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.board, {parse_mode: 'HTML'});
                    genericMessageUid = sendResult.message_id;
                    try {
                        await bot.telegram.pinChatMessage(genericUserGroupUid, genericMessageUid);
                    } catch {
                        // TODO
                    }
                }
                gameOutputMessage.game.liveBoard = {
                    genericMessageUid,
                    genericUserGroupUid,
                    sendedMessageText: gameOutputMessage.board,
                }
            }
        }
        if (gameOutputMessage.aid) {
            await new Promise(resolve => setTimeout(resolve, 750));
            setTimeout(() => {
                if (gameOutputMessage.game.liveCitation) {
                    //ctx.replyWithHTML(gameOutputMessage.aid, {reply_to_message_id: gameOutputMessage.game.liveBoard.genericMessageUid});
                    ctx.replyWithHTML(gameOutputMessage.aid);
                } else {
                    ctx.replyWithHTML(gameOutputMessage.aid);
                }
            }, 1000);
        }
        if (gameOutputMessage.shortCitation) {
            await new Promise(resolve => setTimeout(resolve, 750));
            setTimeout(() => {
                if (gameOutputMessage.game.liveCitation) {
                    //ctx.replyWithHTML(gameOutputMessage.shortCitation, {reply_to_message_id: gameOutputMessage.game.liveBoard.genericMessageUid});
                    ctx.replyWithHTML(gameOutputMessage.shortCitation);
                } else {
                    ctx.replyWithHTML(gameOutputMessage.shortCitation);
                }
            }, 1000);
        }
        if (gameOutputMessage.hint) {
            await new Promise(resolve => setTimeout(resolve, 250));
            setTimeout(() => {
                ctx.replyWithHTML(gameOutputMessage.hint);
            }, 1000);
        }
    });
    bot.launch();
}

start();