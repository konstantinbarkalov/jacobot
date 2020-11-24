const { Telegraf } = require('telegraf');
const botToken = require('../bot/secret/botToken.json').token;
const bot = new Telegraf(botToken);
bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('message', (ctx) => ctx.reply(JSON.stringify(ctx.message, null, 4)));
bot.command('debug', (ctx) => {
    return ctx.reply(JSON.stringify(ctx.message, null, 4));
});
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.command('modern', ({ reply }) => reply('Yo'));
bot.command('hipster', Telegraf.reply('λ'));
bot.launch();