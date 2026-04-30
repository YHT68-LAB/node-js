function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
  /*
    🧠 Core Idea (Your Mental Model)

    Conceptual merged array (we DO NOT build it):

      [----------- L1 + L2 -----------]

      We want to place a GLOBAL cut such that:
      
      [------ LEFT (K elements) ------ | ------ RIGHT ------]

      where:
        K = (m + n + 1) // 2   ← number of elements on LEFT


    🎯 How we simulate this WITHOUT merging:

      We split both arrays:

        L1: [---- cut1 ---- | ----]
        L2: [---- cut2 ---- | ----]

      with:
        cut1 + cut2 = K


    🔍 Boundary values near the cuts:

        L1: [ ... L1L | L1R ... ]
        L2: [ ... L2L | L2R ... ]

      where:
        L1L = last value on L1 left
        L1R = first value on L1 right
        L2L = last value on L2 left
        L2R = first value on L2 right


    ✅ Correct partition when:

        L1L <= L2R
        L2L <= L1R

      → means:

        max(LEFT) <= min(RIGHT)

      → global cut is correct


    🔁 Adjustment logic:

      If L1L > L2R:
        → took too many from L1
        → move cut1 LEFT

      If L2L > L1R:
        → took too few from L1
        → move cut1 RIGHT
  */

  // Always binary search the smaller array
  if (nums1.length > nums2.length) {
    return findMedianSortedArrays(nums2, nums1);
  }

  const L1 = nums1;
  const L2 = nums2;

  const m = L1.length;
  const n = L2.length;

  const K = Math.floor((m + n + 1) / 2);

  let left = 0;
  let right = m;

  while (left <= right) {
    const cut1 = Math.floor((left + right) / 2);
    const cut2 = K - cut1;

    const L1L = cut1 === 0 ? -Infinity : L1[cut1 - 1];
    const L1R = cut1 === m ? Infinity : L1[cut1];

    const L2L = cut2 === 0 ? -Infinity : L2[cut2 - 1];
    const L2R = cut2 === n ? Infinity : L2[cut2];

    if (L1L <= L2R && L2L <= L1R) {
      const total = m + n;

      if (total % 2 === 1) {
        return Math.max(L1L, L2L);
      }

      return (Math.max(L1L, L2L) + Math.min(L1R, L2R)) / 2;
    }

    if (L1L > L2R) {
      // Took too many from L1 → move left
      right = cut1 - 1;
    } else {
      // Took too few from L1 → move right
      left = cut1 + 1;
    }
  }

  throw new Error("Input arrays must be sorted.");
}