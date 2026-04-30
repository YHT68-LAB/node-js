function minCoins(coins: number[], target: number): number {
    const dp = new Array(target + 1).fill(Infinity);

    dp[0] = 0;

    for (let amount = 1; amount <= target; amount++) {
        for (const coin of coins) {
            if (amount >= coin) {
                dp[amount] = Math.min(dp[amount], dp[amount - coin] + 1);
            }
        }
    }

    return dp[target] === Infinity ? -1 : dp[target];
}

function main() {
    const coins = [1, 3, 5];
    const target = 11;

    console.log(minCoins(coins, target)); // 3
}

main();