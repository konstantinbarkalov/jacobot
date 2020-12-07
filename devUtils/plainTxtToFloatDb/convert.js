const PlainTxtToFloatD = require('./plainTxtToFloatDb.js');
async function runConvert() {
    const converter = new PlainTxtToFloatD();
    await converter.convert();
    console.log('fin');
}
runConvert();