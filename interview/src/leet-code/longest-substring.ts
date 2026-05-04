function lengthOfLongestSubstring(s: string): number {

    const charArray = [...s];
    let buff = '';
    let best = '';

    for (let i = 0; i < charArray.length; i++) {
        buff = '';
        for (let j = i; j < charArray.length; j++) {
            const aChar = charArray[j];

            if (buff.includes(aChar)) {
                best = (best.length < buff.length) ? buff : best;
                console.log(`best ${best}`);
                break;
            } else {
                buff = buff.concat(aChar);
            }
        }
    }

    return best.length;
};