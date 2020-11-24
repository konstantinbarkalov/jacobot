function textToSequences(text) {
    const sequences = [];
    let sequence = '';
    let wasGoodRussian = true;
    const regExp = /[а-яА-Я-]/;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const isGoodRussian = regExp.test(char);
        if (isGoodRussian === wasGoodRussian) {
            sequence = sequence + char;
        } else {
            sequences.push(sequence);
            sequence = char;
        }

        wasGoodRussian = isGoodRussian;

    }
    return sequences;
}
module.exports = textToSequences;