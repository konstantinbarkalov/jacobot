const GameMaster = require('./gameMaster.js');
const gameMaster = new GameMaster();

const { Telegraf } = require('telegraf');
const botToken = require('./secret/botToken.json').token;
const bot = new Telegraf(botToken);

// basic commands

async function start() {
    console.log('preloading...');
    await gameMaster.preload();
    startTelegramBot();
}
function onAbout(ctx) {
    const aboutHtml = gameMaster.onAbout();
    ctx.reply(aboutHtml.answer, {parse_mode: 'HTML', disable_web_page_preview: true});
}
function onRules(ctx) {
    const rulesHtml = gameMaster.onRules();
    ctx.reply(rulesHtml.answer, {parse_mode: 'HTML', disable_web_page_preview: true});
}
function onHelp(ctx) {
    const helpHtml = gameMaster.onHelp();
    ctx.reply(helpHtml.answer, {parse_mode: 'HTML', disable_web_page_preview: true});
}
function onMetrix(ctx) {
    const metixHtml = gameMaster.onMetrix();
    ctx.reply(metixHtml.answer, {parse_mode: 'HTML', disable_web_page_preview: true});
}
function onDebug(ctx) {
    ctx.reply(JSON.stringify(ctx.message, null, 4));
}

// gameMaster driven commands

async function onGo(ctx) {
    const genericUserUid = ctx.from.id;
    const genericUserName = ctx.from.first_name;
    const genericUserGroupUid = ctx.chat.id;
    const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
    const gameOutputMessage = gameMaster.onGo(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
    await richReply(ctx, gameOutputMessage, genericUserGroupUid);
}
function onAbort(ctx) {
    const genericUserUid = ctx.from.id;
    const genericUserName = ctx.from.first_name;
    const genericUserGroupUid = ctx.chat.id;
    const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
    const gameOutputMessage = gameMaster.onAbort(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
    richReply(ctx, gameOutputMessage, genericUserGroupUid);
}
async function onMessage(ctx) {
    if (ctx.message.from.id === ctx.botInfo.id) {
        // on pin
        return;
    }
    const messageText = ctx.message.text ? ctx.message.text.trim() : '';
    let cleanedMessageText = messageText;
    const genericUserUid = ctx.from.id;
    const genericUserName = ctx.from.first_name;
    const genericUserGroupUid = ctx.chat.id;
    const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
    const gameOutputMessage = gameMaster.onMessage(cleanedMessageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
    await richReply(ctx, gameOutputMessage, genericUserGroupUid);
}
async function richReply(ctx, gameOutputMessage, genericUserGroupUid) {
    if (gameOutputMessage.answer) {
        let miniCongratz = '';
        if (gameOutputMessage.congratz > 0) {
            miniCongratz = '👍 ';
        } else if (gameOutputMessage.congratz < 0) {
            miniCongratz = '❌ ';
        } else if (gameOutputMessage.congratz === 0) {
            miniCongratz = '👌 ';
        }
        //ctx.replyWithHTML(miniCongratz + gameOutputMessage.answer, {reply_to_message_id: ctx.message.message_id});
        ctx.replyWithHTML(miniCongratz + gameOutputMessage.answer, {disable_web_page_preview: true});
    }
    const hasCongratz = gameOutputMessage.congratz !== null;
    if (hasCongratz) {
        if (gameOutputMessage.congratz >= 5) {
            ctx.reply('😎');
        } else if (gameOutputMessage.congratz >= 4) {
            ctx.reply('😎');
        } else if (gameOutputMessage.congratz >= 3) {
            ctx.reply('😀');
        } else if (gameOutputMessage.congratz >= 2) {
            ctx.reply('👍');
        } else if (gameOutputMessage.congratz <= -2) {
            ctx.reply('👎');
        }
    }


    if (gameOutputMessage.citation) {
        let genericMessageUid;
        if (gameOutputMessage.isFinal) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            gameOutputMessage.game.liveCitation = null;
            await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.citation, {parse_mode: 'HTML', disable_web_page_preview: true});

        } else {
            if (gameOutputMessage.isRepinAndRelink) {
                if (gameOutputMessage.game.liveCitation) {
                    gameOutputMessage.game.liveCitation = null;
                }
            }
            if (gameOutputMessage.game.liveCitation) {
                if (gameOutputMessage.citation !== gameOutputMessage.game.liveCitation.sendedMessageText) {
                    sendResult = await bot.telegram.editMessageText(gameOutputMessage.game.liveCitation.genericUserGroupUid, gameOutputMessage.game.liveCitation.genericMessageUid, null, gameOutputMessage.citation, {disable_notification: true, parse_mode: 'HTML'});
                    genericMessageUid = sendResult.message_id;
                } else {
                    genericMessageUid = gameOutputMessage.game.liveCitation.genericMessageUid;
                }
            } else {
                sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.citation, {parse_mode: 'HTML', disable_web_page_preview: true});
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
            await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.board, {parse_mode: 'HTML', disable_web_page_preview: true});

        } else {
            if (gameOutputMessage.isRepinAndRelink) {
                if (gameOutputMessage.game.liveBoard) {
                    await bot.telegram.unpinChatMessage(genericUserGroupUid, gameOutputMessage.game.liveBoard.genericMessageUid);
                    gameOutputMessage.game.liveBoard = null;
                }
            }
            if (gameOutputMessage.game.liveBoard) {
                if (gameOutputMessage.board !== gameOutputMessage.game.liveBoard.sendedMessageText) {
                    sendResult = await bot.telegram.editMessageText(gameOutputMessage.game.liveBoard.genericUserGroupUid, gameOutputMessage.game.liveBoard.genericMessageUid, null, gameOutputMessage.board, {disable_notification: true, parse_mode: 'HTML'});
                    genericMessageUid = sendResult.message_id;
                } else {
                    genericMessageUid = gameOutputMessage.game.liveBoard.genericMessageUid;
                }
            } else {
                sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gameOutputMessage.board, {parse_mode: 'HTML', disable_web_page_preview: true});
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
        await new Promise(resolve => setTimeout(resolve, 250));
        setTimeout(() => {
            if (gameOutputMessage.game.liveCitation) {
                //ctx.replyWithHTML(gameOutputMessage.aid, {reply_to_message_id: gameOutputMessage.game.liveBoard.genericMessageUid});
                ctx.replyWithHTML(gameOutputMessage.aid);
            } else {
                ctx.replyWithHTML(gameOutputMessage.aid);
            }
        }, 1000);
    }
    if (gameOutputMessage.hint) {
        await new Promise(resolve => setTimeout(resolve, 250));
        setTimeout(() => {
            ctx.replyWithHTML(gameOutputMessage.hint);
        }, 1000);
    }

    if (gameOutputMessage.shortCitation) {
        await new Promise(resolve => setTimeout(resolve, 250));
        setTimeout(() => {
            if (gameOutputMessage.game.liveCitation) {
                //ctx.replyWithHTML(gameOutputMessage.shortCitation, {reply_to_message_id: gameOutputMessage.game.liveBoard.genericMessageUid});
                ctx.replyWithHTML(gameOutputMessage.shortCitation);
            } else {
                ctx.replyWithHTML(gameOutputMessage.shortCitation);
            }
        }, 1000);
    }

    // if (gameOutputMessage.hint || gameOutputMessage.shortCitation) {
    //     await new Promise(resolve => setTimeout(resolve, 250));
    //     setTimeout(() => {
    //         ctx.replyWithHTML((gameOutputMessage.shortCitation??'') + ' ' + (gameOutputMessage.hint??''));
    //     }, 1000);
    // }
}
function startTelegramBot() {
    // basic commands
    bot.start(onAbout);
    bot.command('about', onAbout);
    bot.command('help', onHelp);
    bot.command('?', onAbout);
    bot.command('rules', onRules);
    bot.command('metrix', onMetrix);
    bot.command('debug', onDebug);
    // gameMaster driven commands
    bot.command('go', onGo);
    bot.command('stop', onAbort);
    bot.command('abort', onAbort);
    bot.on('message', onMessage);
    //start
    bot.launch();
}

start();