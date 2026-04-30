
// Definition for singly-linked list.
class ListNode {
    val: number
    next: ListNode | null
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val === undefined ? 0 : val)
        this.next = (next === undefined ? null : next)
    }
}

function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {

    const node = new ListNode(0);

    let curr1 = l1;
    let curr2 = l2;
    let curr3 = node;
    let carry = 0;

    while (curr1 != null || curr2 != null || carry != 0) {
        const v1 = curr1 ? curr1.val : 0;
        const v2 = curr2 ? curr2.val : 0;

        const v3 = v1 + v2 + carry;

        carry = Math.floor(v3 / 10);
        curr3.next = new ListNode(v3 % 10);

        curr1 = curr1 ? curr1.next : null;
        curr2 = curr2 ? curr2.next : null;
        curr3 = curr3.next;

    }

    return node.next;

};