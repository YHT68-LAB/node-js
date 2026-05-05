function convert(s: string, numRows: number): string {
    // edge case: no zigzag needed
    if (numRows === 1 || s.length <= numRows) return s;

    // create grid (rows)
    const grid: string[][] = Array.from({ length: numRows }, () => []);

    // current position
    let row = 0;
    let col = 0;

    // state: are we filling a vertical column?
    let isColumn = true; // true = going down, false = going up-right

    // movement: go straight down
    function goingDown() {
        row += 1;   // move to next row
        // col stays the same
    }

    // movement: go diagonally up-right
    function goingUpRight() {
        row -= 1;   // move up
        col += 1;   // move right to next column
    }

    // walk through each character
    for (const char of s) {
        // 1. place character at current position
        grid[row][col] = char;

        if (isColumn) {
            // filling a vertical column (↓)

            if (row === numRows - 1) {
                // reached the bottom → end of this vertical column
                // cannot go down anymore → must switch to diagonal (↗)
                isColumn = false;
                goingUpRight();
            } else {
                // still inside column → keep going down
                goingDown();
            }

        } else {
            // moving between columns (↗)

            if (row === 0) {
                // reached the top → diagonal finished
                // must switch back to vertical (↓)
                isColumn = true;
                goingDown();
            } else {
                // still moving diagonally → continue up-right
                goingUpRight();
            }
        }
    }

    // read grid row by row
    let result = "";
    for (const r of grid) {
        for (const c of r) {
            if (c !== undefined) {
                result += c;
            }
        }
    }

    return result;
}