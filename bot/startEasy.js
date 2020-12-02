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
        const gamestepOutputMessage = gameMaster.onMessage(messageText,fakeGenericUserUid, fakeGenericUserName, fakeGenericUserGroupUid, fakeGenericUserGroupName);
        if (gamestepOutputMessage.answer) {
            console.log('BOT> ' + gamestepOutputMessage.answer);
        }
        if (gamestepOutputMessage.board) {
            console.log('BOT> ' + gamestepOutputMessage.board);
        }
        if (gamestepOutputMessage.hint) {
            console.log('BOT> ' + gamestepOutputMessage.hint);
        }
        if (gamestepOutputMessage.congratz) {
            for (let i = 0; i < gamestepOutputMessage.congratz; i++) {
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