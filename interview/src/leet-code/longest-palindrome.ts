
// chatGpt's code -- Time O(n^2) Space O(1)
function longestPalindrome2(s: string): string {
    if (s.length <= 1) return s;

    let bestStart = 0;
    let bestLen = 1;

    function expand(left: number, right: number): void {
        while (
            left >= 0 &&
            right < s.length &&
            s[left] === s[right]
        ) {
            left--;
            right++;
        }

        const len = right - left - 1;
        if (len > bestLen) {
            bestLen = len;
            bestStart = left + 1;
        }
    }

    for (let i = 0; i < s.length; i++) {
        expand(i, i);       // odd length:  "aba"
        expand(i, i + 1);   // even length: "abba"
    }

    return s.substring(bestStart, bestStart + bestLen);
}

// my code -- Time O(n^3) Space O(1)
function longestPalindrome(s: string): string {
    function isPalindrome(s: string): boolean {
        if (s.length == 0 || s.length == 1) return true;

        const sChar = [...(s.trim().replaceAll(' ', ''))];

        // 5 > 0 1 2 3 4
        for (let i = 0, j = sChar.length - 1; i < sChar.length / 2; i++, j--) {
            if (sChar[i] != sChar[j]) return false;
        }
        return true;
    }

    const sChar = [...s];
    let best = '';
    let buff = '';

    for (let i = 0; i < sChar.length; i++) {
        buff = ''; // reset buff

        for (let j = i; j < sChar.length; j++) {
            buff = buff.concat(sChar[j]);

            if (isPalindrome(buff)) { // vs. best and update best
                best = best.length < buff.length ? buff : best;
            }
        }
    }

    return best;
};
