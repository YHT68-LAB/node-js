function minCoins2(coins: number[], target: number): number[] {

    // dp[amount] = current best coin combination for this amount
    const dp: number[][] = Array.from(
        { length: target + 1 },
        () => []
    );

    // base case:
    // amount 0 is reachable with zero coins
    dp[0] = [];

    for (let amount = 1; amount <= target; amount++) {

        for (const coin of coins) {

            // cannot use coin if it is bigger than current amount
            if (amount >= coin) {

                const prevAmount = amount - coin;
                const prev = dp[prevAmount];

                // previous amount is reachable if:
                // 1) previous amount is 0 (base case)
                // 2) previous amount already has a valid combination
                const isPrevReachable =
                    prevAmount === 0 || prev.length > 0;

                if (isPrevReachable) {

                    // build a new candidate combination
                    // by appending current coin to previous best result
                    const candidate = [...prev, coin];

                    // update current best result if:
                    // 1) this is the first valid candidate
                    // 2) this candidate uses fewer coins
                    if (
                        dp[amount].length === 0 ||
                        candidate.length < dp[amount].length
                    ) {
                        dp[amount] = candidate;
                    }
                }
            }
        }
    }

    return dp[target];
}

console.log(minCoins([1, 3, 5], 11)); // [5,5,1] or [3,3,5]
console.log(minCoins([2], 3));         // []

const answer = minCoins2([1, 3, 5], 11);

console.log(answer);        // [1, 5, 5] or [5, 5, 1] or [3, 3, 5]
console.log(answer.length); // 3

