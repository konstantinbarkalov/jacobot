const PlainTxtToFloatDb = require('./plainTxtToFloatDb.js');
async function runConvert() {
    const converter = new PlainTxtToFloatDb();
    await converter.convert();
    console.log('fin');
}
runConvert();