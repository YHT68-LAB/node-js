function fibo(n: number): number {

    if (n < 0) {
        throw Error(`n:${n} needs to bigger than 0`);
    }

    else if (n < 2) {
        return n;
    }

    else {
        return (fibo(n - 1) + fibo(n - 2));
    }

}

function fibo2(n: number): number {

    if (n < 0) {
        throw Error(`n:${n} needs to bigger than 0`);
    }

    let prev = 0; // 0
    let curr = 1; // 1

    // 2
    for (let i = 2; i <= n; i++) {
        const next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

const k = 7;
const fibo_K = fibo(k);

/*
0 1 2 3 4 5 6  7
0 1 1 2 3 5 8 13  21  34
*/

console.log(JSON.stringify(fibo_K, null, 2))