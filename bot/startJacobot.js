const GameMaster = require('./gameMaster.js');
const gameMaster = new GameMaster();

const { Telegraf } = require('telegraf');
const GamestepOutputMessage = require('./gamestepOutputMessage.js');
const MiscOutputMessage = require('./miscOutputMessage.js');
const botToken = require('./secret/botToken.json').token;
const bot = new Telegraf(botToken);

// basic commands

async function start() {
    console.log('preloading...');
    await gameMaster.preload();
    startTelegramBot();
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
    const debugHtml = gameMaster.onDebug(ctx);
    ctx.reply(debugHtml.answer, {parse_mode: 'HTML', disable_web_page_preview: true});
}

// gameMaster driven commands

async function onGo(ctx) {
    const genericUserUid = ctx.from.id;
    const genericUserName = ctx.from.first_name;
    const genericUserGroupUid = ctx.chat.id;
    const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
    const outputMessage = gameMaster.onGo(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
    await richReply(ctx, outputMessage, genericUserGroupUid);
}
function onAbort(ctx) {
    const genericUserUid = ctx.from.id;
    const genericUserName = ctx.from.first_name;
    const genericUserGroupUid = ctx.chat.id;
    const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
    const outputMessage = gameMaster.onAbort(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
    richReply(ctx, outputMessage, genericUserGroupUid);
}
async function onMessage(ctx) {
    const genericUserUid = ctx.from.id;
    const genericUserName = ctx.from.first_name;
    const genericUserGroupUid = ctx.chat.id;
    const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;

    if (ctx.message.from.id === ctx.botInfo.id) {
        // on pin
        return;
    }

    const messageText = ctx.message.text ? ctx.message.text.trim() : '';
    let cleanedMessageText = messageText;
    const outputMessage = gameMaster.onMessage(cleanedMessageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
    if (outputMessage) {
        richReply(ctx, outputMessage, genericUserGroupUid);
    } else {
        console.warn('no outputMessage onMessage, maybe cooldown effect, maybe not...');
    }
}
async function richReply(ctx, outputMessage, genericUserGroupUid) {
    if (outputMessage instanceof GamestepOutputMessage) {
        try {
            await richReplyGamestep(ctx, outputMessage, genericUserGroupUid);
        } catch (err) {
            console.log(err);
        }
    } else if (outputMessage instanceof MiscOutputMessage) {
        try {
            await richReplyMisc(ctx, outputMessage);
        } catch (err) {
            console.log(err);
        }
    } else {
        throw new Error('unknown outputMessage signature');
    }
}

async function richReplyGamestep(ctx, gamestepOutputMessage, genericUserGroupUid) {
    let canPinMessages;
    if (ctx.chat.type === 'private') {
        canPinMessages = true;
    } else {
        const botChatMemberInfo = await ctx.getChatMember(ctx.botInfo.id);
        canPinMessages = !!botChatMemberInfo.can_pin_messages
    }

    const isPinningScenario = canPinMessages;
    const isReplyingScenario = !canPinMessages;
    if (gamestepOutputMessage.game) { gamestepOutputMessage.game.isInCooldown = true; }

    let preAnswerMessage;
    if (gamestepOutputMessage.preAnswer) {
        if (gamestepOutputMessage.cooldownDuration) {
            const replyTo = isReplyingScenario ? ctx.message.message_id : null;
            preAnswerMessage = await ctx.replyWithHTML(gamestepOutputMessage.preAnswer, {disable_notification: true, reply_to_message_id: replyTo});
            await new Promise(resolve => setTimeout(resolve, gamestepOutputMessage.cooldownDuration));
        }
    }
    if (gamestepOutputMessage.answer) {
        let miniCongratz = '';
        if (gamestepOutputMessage.congratz > 0) {
            miniCongratz = '👍 ';
        } else if (gamestepOutputMessage.congratz < 0) {
            miniCongratz = '❌ ';
        } else if (gamestepOutputMessage.congratz === 0) {
            miniCongratz = '👌 ';
        }
        const answerHtml = miniCongratz + gamestepOutputMessage.answer;
        //ctx.replyWithHTML(answerHtml, {disable_web_page_preview: true});
        if (preAnswerMessage) {
            await bot.telegram.editMessageText(preAnswerMessage.chat.id, preAnswerMessage.message_id, null, answerHtml, {disable_notification: true, parse_mode: 'HTML'});
        } else {
            const replyTo = isReplyingScenario ? ctx.message.message_id : null;
            await ctx.replyWithHTML(answerHtml, {disable_web_page_preview: true, parse_mode: 'html', reply_to_message_id: replyTo});
        }
    }
    const hasCongratz = gamestepOutputMessage.congratz !== null;
    if (hasCongratz) {
        if (gamestepOutputMessage.congratz >= 5) {
            await ctx.reply('😎');
        } else if (gamestepOutputMessage.congratz >= 4) {
            await ctx.reply('😎');
        } else if (gamestepOutputMessage.congratz >= 3) {
            await ctx.reply('😀');
        } else if (gamestepOutputMessage.congratz >= 2) {
            await ctx.reply('👍');
        } else if (gamestepOutputMessage.congratz <= -2) {
            await ctx.reply('👎');
        }
    }


    if (gamestepOutputMessage.citation) {
        let genericMessageUid;
        if (gamestepOutputMessage.isFinal) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            gamestepOutputMessage.game.liveCitation = null;
            await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.citation, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});

        } else {
            if (gamestepOutputMessage.isRepinAndRelink) {
                if (gamestepOutputMessage.game.liveCitation) {
                    gamestepOutputMessage.game.liveCitation = null;
                }
            }
            if (gamestepOutputMessage.game.liveCitation) {
                if (gamestepOutputMessage.citation !== gamestepOutputMessage.game.liveCitation.sendedMessageText) {
                    sendResult = await bot.telegram.editMessageText(gamestepOutputMessage.game.liveCitation.genericUserGroupUid, gamestepOutputMessage.game.liveCitation.genericMessageUid, null, gamestepOutputMessage.citation, {disable_notification: true, parse_mode: 'HTML'});
                    genericMessageUid = sendResult.message_id;
                } else {
                    genericMessageUid = gamestepOutputMessage.game.liveCitation.genericMessageUid;
                }
            } else {
                sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.citation, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});
                genericMessageUid = sendResult.message_id;
            }
            gamestepOutputMessage.game.liveCitation = {
                genericMessageUid,
                genericUserGroupUid,
                sendedMessageText: gamestepOutputMessage.citation,
            }
        }
    }

    if (gamestepOutputMessage.board) {
        let genericMessageUid;
        if (gamestepOutputMessage.isFinal) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (gamestepOutputMessage.game.liveBoard) {
                if (isPinningScenario) {
                    try {
                        await bot.telegram.unpinChatMessage(gamestepOutputMessage.game.liveBoard.genericUserGroupUid, genericMessageUid);
                    } catch {
                        // TODO
                        //console.warn('help me');
                        //debugger;
                    }
                }
            }
            gamestepOutputMessage.game.liveBoard = null;
            await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.board, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});

        } else {
            if (gamestepOutputMessage.isRepinAndRelink) {
                if (gamestepOutputMessage.game.liveBoard) {
                    if (isPinningScenario) {
                        await bot.telegram.unpinChatMessage(genericUserGroupUid, gamestepOutputMessage.game.liveBoard.genericMessageUid);
                    }
                    gamestepOutputMessage.game.liveBoard = null;
                }
            }
            if (gamestepOutputMessage.game.liveBoard) {
                if (gamestepOutputMessage.board !== gamestepOutputMessage.game.liveBoard.sendedMessageText) {
                    sendResult = await bot.telegram.editMessageText(gamestepOutputMessage.game.liveBoard.genericUserGroupUid, gamestepOutputMessage.game.liveBoard.genericMessageUid, null, gamestepOutputMessage.board, {disable_notification: true, parse_mode: 'HTML', disable_notification: true});
                    genericMessageUid = sendResult.message_id;
                } else {
                    genericMessageUid = gamestepOutputMessage.game.liveBoard.genericMessageUid;
                }
            } else {
                sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.board, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});
                genericMessageUid = sendResult.message_id;
                if (isPinningScenario) {
                    try {
                        await bot.telegram.pinChatMessage(genericUserGroupUid, genericMessageUid, {disable_notification: true});
                    } catch {
                        // TODO
                        //console.warn('help me');
                        //debugger;
                    }
                }
            }
            gamestepOutputMessage.game.liveBoard = {
                genericMessageUid,
                genericUserGroupUid,
                sendedMessageText: gamestepOutputMessage.board,
            }
        }
    }

    let postAnswerHtmlLines = [];

    if (gamestepOutputMessage.aid) {
        postAnswerHtmlLines.push(gamestepOutputMessage.aid);
    }

    if (gamestepOutputMessage.shortCitation) {
        postAnswerHtmlLines.push(gamestepOutputMessage.shortCitation);
    };

    if (gamestepOutputMessage.hint) {
        postAnswerHtmlLines.push(gamestepOutputMessage.hint);
    }

    let postAnswerHtml = postAnswerHtmlLines.join('\n');
    if (postAnswerHtml) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        let replyTo;
        if (isReplyingScenario && gamestepOutputMessage.game && gamestepOutputMessage.game.liveBoard) {
            replyTo = gamestepOutputMessage.game.liveBoard.genericMessageUid;
        }
        await ctx.replyWithHTML(postAnswerHtml, {disable_notification: true, parse_mode: 'html', reply_to_message_id: replyTo });
    }

    if (gamestepOutputMessage.game) { gamestepOutputMessage.game.isInCooldown = false; }

}

async function richReplyGamestep2(ctx, gamestepOutputMessage, genericUserGroupUid) {
    const deleteQueue = [];
    if (gamestepOutputMessage.game) { gamestepOutputMessage.game.isInCooldown = true; }

    if (gamestepOutputMessage.preAnswer) {
        let preAnswerMessage;
        if (gamestepOutputMessage.cooldownDuration) {
            preAnswerMessage = await ctx.replyWithHTML(gamestepOutputMessage.preAnswer, {disable_notification: true});
            await new Promise(resolve => setTimeout(resolve, gamestepOutputMessage.cooldownDuration));
            preAnswerMessage = await bot.telegram.editMessageText(preAnswerMessage.chat.id, preAnswerMessage.message_id, null, 'wait...2', {parse_mode: 'html', disable_web_page_preview: true, disable_notification: true});
            await new Promise(resolve => setTimeout(resolve, gamestepOutputMessage.cooldownDuration / 3));
            preAnswerMessage = await bot.telegram.editMessageText(preAnswerMessage.chat.id, preAnswerMessage.message_id, null, 'wait...1', {parse_mode: 'html', disable_web_page_preview: true, disable_notification: true});
            await new Promise(resolve => setTimeout(resolve, gamestepOutputMessage.cooldownDuration / 3));
            if (gamestepOutputMessage.game.livePreAnswer) {
                deleteQueue.push(gamestepOutputMessage.game.livePreAnswer);
            }
            gamestepOutputMessage.game.livePreAnswer = {
                genericUserGroupUid: preAnswerMessage.chat.id,
                genericUserMessageUid: preAnswerMessage.message_id
            };
            //await bot.telegram.deleteMessage(preAnswerMessage.chat.id, preAnswerMessage.message_id);
        }
    }
    if (gamestepOutputMessage.answer) {
        let miniCongratz = '';
        if (gamestepOutputMessage.congratz > 0) {
            miniCongratz = '👍 ';
        } else if (gamestepOutputMessage.congratz < 0) {
            miniCongratz = '❌ ';
        } else if (gamestepOutputMessage.congratz === 0) {
            miniCongratz = '👌 ';
        }
        const answerHtml = miniCongratz + gamestepOutputMessage.answer;
        //ctx.replyWithHTML(answerHtml, {disable_web_page_preview: true});
        ctx.replyWithHTML(answerHtml, {disable_web_page_preview: true, parse_mode: 'html'});
    }
    const hasCongratz = gamestepOutputMessage.congratz !== null;
    if (hasCongratz) {
        if (gamestepOutputMessage.congratz >= 5) {
            ctx.reply('😎');
        } else if (gamestepOutputMessage.congratz >= 4) {
            ctx.reply('😎');
        } else if (gamestepOutputMessage.congratz >= 3) {
            ctx.reply('😀');
        } else if (gamestepOutputMessage.congratz >= 2) {
            ctx.reply('👍');
        } else if (gamestepOutputMessage.congratz <= -2) {
            ctx.reply('👎');
        }
    }


    if (gamestepOutputMessage.citation) {
        let genericMessageUid;
        if (gamestepOutputMessage.isFinal) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            gamestepOutputMessage.game.liveCitation = null;
            await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.citation, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});

        } else {
            if (gamestepOutputMessage.isRepinAndRelink) {
                if (gamestepOutputMessage.game.liveCitation) {
                    gamestepOutputMessage.game.liveCitation = null;
                }
            }
            if (gamestepOutputMessage.game.liveCitation) {
                if (gamestepOutputMessage.citation !== gamestepOutputMessage.game.liveCitation.sendedMessageText) {
                    sendResult = await bot.telegram.editMessageText(gamestepOutputMessage.game.liveCitation.genericUserGroupUid, gamestepOutputMessage.game.liveCitation.genericMessageUid, null, gamestepOutputMessage.citation, {disable_notification: true, parse_mode: 'HTML'});
                    genericMessageUid = sendResult.message_id;
                } else {
                    genericMessageUid = gamestepOutputMessage.game.liveCitation.genericMessageUid;
                }
            } else {
                sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.citation, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});
                genericMessageUid = sendResult.message_id;
            }
            gamestepOutputMessage.game.liveCitation = {
                genericMessageUid,
                genericUserGroupUid,
                sendedMessageText: gamestepOutputMessage.citation,
            }
        }
    }

    if (gamestepOutputMessage.board) {
        let genericMessageUid;
        if (gamestepOutputMessage.isFinal) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (gamestepOutputMessage.game.liveBoard) {
                try {
                    await bot.telegram.unpinChatMessage(gamestepOutputMessage.game.liveBoard.genericUserGroupUid, genericMessageUid);
                } catch {
                    // TODO
                    //console.warn('help me');
                    //debugger;
                }
            }
            gamestepOutputMessage.game.liveBoard = null;
            await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.board, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});

        } else {
            if (gamestepOutputMessage.isRepinAndRelink) {
                if (gamestepOutputMessage.game.liveBoard) {
                    await bot.telegram.unpinChatMessage(genericUserGroupUid, gamestepOutputMessage.game.liveBoard.genericMessageUid);
                    gamestepOutputMessage.game.liveBoard = null;
                }
            }
            if (gamestepOutputMessage.game.liveBoard) {
                if (gamestepOutputMessage.board !== gamestepOutputMessage.game.liveBoard.sendedMessageText) {
                    sendResult = await bot.telegram.editMessageText(gamestepOutputMessage.game.liveBoard.genericUserGroupUid, gamestepOutputMessage.game.liveBoard.genericMessageUid, null, gamestepOutputMessage.board, {disable_notification: true, parse_mode: 'HTML', disable_notification: true});
                    genericMessageUid = sendResult.message_id;
                } else {
                    genericMessageUid = gamestepOutputMessage.game.liveBoard.genericMessageUid;
                }
            } else {
                sendResult = await bot.telegram.sendMessage(genericUserGroupUid, gamestepOutputMessage.board, {parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true});
                genericMessageUid = sendResult.message_id;
                try {
                    await bot.telegram.pinChatMessage(genericUserGroupUid, genericMessageUid, {disable_notification: true});
                } catch {
                    // TODO
                    //console.warn('help me');
                    //debugger;
                }
            }
            gamestepOutputMessage.game.liveBoard = {
                genericMessageUid,
                genericUserGroupUid,
                sendedMessageText: gamestepOutputMessage.board,
            }
        }
    }
    if (gamestepOutputMessage.aid) {
        await new Promise(resolve => setTimeout(resolve, 1750));
        ctx.replyWithHTML(gamestepOutputMessage.aid, {disable_notification: true});
    }
    if (gamestepOutputMessage.hint) {
        if (gamestepOutputMessage.game.liveHint) {
            deleteQueue.push({genericUserGroupUid: gamestepOutputMessage.game.liveHint.genericUserGroupUid, genericUserMessageUid: gamestepOutputMessage.game.liveHint.genericMessageUid});
            //bot.telegram.deleteMessage(gamestepOutputMessage.game.liveHint.genericUserGroupUid, gamestepOutputMessage.game.liveHint.genericMessageUid);
            gamestepOutputMessage.game.liveHint = null;
        }
        await new Promise(resolve => setTimeout(resolve, 1750));
        sendResult = await ctx.replyWithHTML(gamestepOutputMessage.hint, {disable_notification: true, parse_mode: 'HTML'});
        let genericMessageUid = sendResult.message_id;
        gamestepOutputMessage.game.liveHint = {
            genericMessageUid,
            genericUserGroupUid,
        }
    }

    if (gamestepOutputMessage.game) { gamestepOutputMessage.game.isInCooldown = false; }

    if (gamestepOutputMessage.shortCitation) {
        if (gamestepOutputMessage.game.liveShortCitation) {
            deleteQueue.push({genericUserGroupUid: gamestepOutputMessage.game.liveShortCitation.genericUserGroupUid, genericUserMessageUid: gamestepOutputMessage.game.liveShortCitation.genericMessageUid});
            //bot.telegram.deleteMessage(gamestepOutputMessage.game.liveShortCitation.genericUserGroupUid, gamestepOutputMessage.game.liveShortCitation.genericMessageUid);
            gamestepOutputMessage.game.liveShortCitation = null;
        }
        await new Promise(resolve => setTimeout(resolve, 1750));
        sendResult = await ctx.replyWithHTML(gamestepOutputMessage.shortCitation, {disable_notification: true, parse_mode: 'HTML'});
        let genericMessageUid = sendResult.message_id;
        gamestepOutputMessage.game.liveShortCitation = {
            genericMessageUid,
            genericUserGroupUid,
        }
    };

    await deleteQueue.map(async (deleteQueueElement) => {
        return bot.telegram.deleteMessage(deleteQueueElement.genericUserGroupUid, deleteQueueElement.genericUserMessageUid);
    });
}

async function richReplyMisc(ctx, miscOutputMessage) {
    if (miscOutputMessage.answer) {
        const answerHtml = miscOutputMessage.answer;
        await ctx.replyWithHTML(answerHtml, {disable_web_page_preview: true});
    }

    if (miscOutputMessage.hint) {
        await new Promise(resolve => setTimeout(resolve, 1750));
        await ctx.replyWithHTML(miscOutputMessage.hint);
    }
}

start();