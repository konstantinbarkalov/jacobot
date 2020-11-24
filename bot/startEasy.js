const readline = require('readline');
const GameMaster = require('./gameMaster.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'YOU> '
});
const gameMaster = new GameMaster();
async function start() {
    console.log('preloading...');
    await gameMaster.preload();
    startPrompt();
}
function startPrompt() {
    rl.prompt();
    rl.on('line', (line) => {
        const messageText = line.trim();
        const fakeGenericUserUid = undefined;
        const fakeGenericUserName = 'Smith';
        const fakeGenericUserGroupUid = undefined;
        const fakeGenericUserGroupName = 'Smith';
        const gameOutputMessage = gameMaster.onMessage(messageText,fakeGenericUserUid, fakeGenericUserName, fakeGenericUserGroupUid, fakeGenericUserGroupName);
        if (gameOutputMessage.answer) {
            console.log('BOT> ' + gameOutputMessage.answer);
        }
        if (gameOutputMessage.banner) {
            console.log('BOT> ' + gameOutputMessage.banner);
        }
        if (gameOutputMessage.hint) {
            console.log('BOT> ' + gameOutputMessage.hint);
        }
        if (gameOutputMessage.congratz) {
            for (let i = 0; i < gameOutputMessage.congratz; i++) {
                console.log('BOT> CONGRATZ 👍');
            }
        }
        rl.prompt();
    }).on('close', () => {
        console.log('exit');
        console.log('SYS> Have a great day!');
        process.exit(0);
    });
}

start();