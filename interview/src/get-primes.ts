import { printDebug } from "./debug";

// Sieve of Eratosthenes
function getPrimes(max: number): number[] {

    if (max < 2) return [];

    const isPrimes = new Array(max + 1).fill(true);

    isPrimes[0] = isPrimes[1] = false;

    /*
       1 2 3 4 5 6 7 8 9 10
       > 2 4 6 8 10 12' 
       >>  3 9 12'
       >>>   4 16'
    */
    for (let i = 2; i <= max; i++) { // 2, 3, 4, 
        if (isPrimes[i]) {
            for (let j = i * i; j <= max; j += i) { // 4, 6, 8, 
                isPrimes[j] = false;
            }
        }
    }

    const primes: number[] = [];
    for (let i = 0; i <= max; i++) {
        if (isPrimes[i]) {
            primes.push(i);
        }
    }

    return primes;
}

function isPrime(n: number): boolean {
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
    }

    return true;
}

function getPrimes_2(max: number): number[] {

    if (max < 2) return [];
    else if (max == 2) return [2];
    else if (max == 3) return [2, 3];

    const primes: number[] = [];

    for (let i = 2; i <= max; i++) {
        if (isPrime(i)) {
            primes.push(i);
        }
    }

    return primes;
}

const primeSize = 100;
const p1 = getPrimes(primeSize);
const p2 = getPrimes_2(primeSize);

printDebug({
    fileName: __filename,
    test: {
        p1, l1: p1.length,
        p2, l2: p2.length,
    },
});
