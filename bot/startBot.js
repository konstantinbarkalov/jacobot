const GameMaster = require('./gameMaster.js');
const gameMaster = new GameMaster();

const { Telegraf } = require('telegraf');
const botToken = require('./botToken.json').token;

async function start() {
    console.log('preloading...');
    await gameMaster.preload();
    startTelegramBot();
}
function startTelegramBot() {
    const bot = new Telegraf(botToken);
    bot.start((ctx) => ctx.reply('Welcome'));
    //bot.help((ctx) => ctx.reply('Send me a sticker'));
    bot.command('debug', (ctx) => {
        return ctx.reply(JSON.stringify(ctx.message, null, 4));
    });
    //bot.on('sticker', (ctx) => ctx.reply('👍'));
    //bot.hears('hi', (ctx) => ctx.reply('Hey there'));
    //bot.command('oldschool', (ctx) => ctx.reply('Hello'));
    //bot.command('modern', ({ reply }) => reply('Yo'));
    //bot.command('hipster', Telegraf.reply('λ'));
    bot.on('message', (ctx) => {
        const messageText = ctx.message.text.trim();
        const prefixes = ['/ok ', '/o ', '/ок ', '/о ', '/']; // order matters!
        let cleanedMessageText = messageText;
        for (let i = 0; i < prefixes.length; i++) {
            const prefix = prefixes[i];
            if (messageText.slice(0, prefix.length) === prefix) {
                cleanedMessageText = messageText.slice(prefix.length);
                break;
            }
        }
        const genericUserUid = ctx.from.id;
        const genericUserName = ctx.from.first_name;
        const genericUserGroupUid = ctx.chat.id;
        const genericUserGroupName = ctx.chat.first_name || ctx.chat.title;
        const gameOutputMessage = gameMaster.onMessage(cleanedMessageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
        if (gameOutputMessage.answer) {
            ctx.replyWithHTML(gameOutputMessage.answer);
        }
        const hasCongratz = gameOutputMessage.congratz !== null;
        if (hasCongratz) {
            let emoji;
            if (gameOutputMessage.congratz >= 5) {
                ctx.reply('😎');
            } else if (gameOutputMessage.congratz >= 4) {
                ctx.reply('😆');
            } else if (gameOutputMessage.congratz >= 3) {
                ctx.reply('😀');
            } else if (gameOutputMessage.congratz >= 2) {
                ctx.reply('🙂');
            } else if (gameOutputMessage.congratz >= 1) {
                ctx.reply('👍');
            } else if (gameOutputMessage.congratz <= 1) {
                ctx.reply('👎');
            }
            if (emoji) {
                setTimeout(() => {
                    ctx.replyWithHTML(emoji);
                }, 1000);
            }
        }
        if (gameOutputMessage.banner) {
            let delay = hasCongratz ? 3000 : 2000;
            setTimeout(() => {
                ctx.replyWithHTML(gameOutputMessage.banner);
            }, delay);
        }
        if (gameOutputMessage.hint) {
            let delay = gameOutputMessage.banner ? (hasCongratz ? 3500 : 2500) : (hasCongratz ? 1500 : 500) ;
            setTimeout(() => {
                ctx.replyWithHTML(gameOutputMessage.hint);
            }, delay);
        }
    });
    bot.launch();
}

start();