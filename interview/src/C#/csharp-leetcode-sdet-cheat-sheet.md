# C# LeetCode / SDET Cheat Sheet

- [1. Arrays](#1-arrays)
- [2. List<T>](#2-listt)
- [3. Dictionary<TKey, TValue>](#3-dictionarytkey-tvalue)
- [4. HashSet<T>](#4-hashsett)
- [5. Queue<T>](#5-queuet)
- [6. Stack<T>](#6-stackt)
- [7. String](#7-string)
- [8. LINQ](#8-linq)
- [9. Sorting](#9-sorting)
- [10. Math](#10-math)
- [11. Try / Catch](#11-try--catch)
- [12. Console Logging](#12-console-logging)
- [13. Linked List](#13-linked-list)
- [14. Tree](#14-tree)
- [15. Common Patterns](#15-common-patterns)

---

# 1. Arrays

```csharp
int[] nums = {1, 2, 3};

Console.WriteLine(nums[0]);

nums[1] = 99;

int len = nums.Length;
```

Loop:

```csharp
for (int i = 0; i < nums.Length; i++)
{
    Console.WriteLine(nums[i]);
}

foreach (int n in nums)
{
    Console.WriteLine(n);
}
```

2D Array:

```csharp
int[,] grid = new int[3,4];

grid[0,1] = 5;
```

Jagged Array:

```csharp
int[][] graph = new int[3][];

graph[0] = new int[] {1,2};
```

---

# 2. List<T>

```csharp
List<int> list = new List<int>();

list.Add(1);
list.Add(2);

list.Remove(1);

int first = list[0];

int count = list.Count;
```

Useful:

```csharp
list.Contains(5);

list.Sort();

list.Reverse();
```

Convert:

```csharp
int[] arr = list.ToArray();

List<int> list2 = nums.ToList();
```

---

# 3. Dictionary<TKey, TValue>

```csharp
Dictionary<string, int> map =
    new Dictionary<string, int>();

map["apple"] = 3;

Console.WriteLine(map["apple"]);
```

Safe lookup:

```csharp
if (map.ContainsKey("apple"))
{
    Console.WriteLine(map["apple"]);
}
```

Preferred:

```csharp
if (map.TryGetValue("apple", out int value))
{
    Console.WriteLine(value);
}
```

Frequency Counter:

```csharp
foreach (char c in s)
{
    map[c] = map.GetValueOrDefault(c, 0) + 1;
}
```

---

# 4. HashSet<T>

```csharp
HashSet<int> set = new HashSet<int>();

set.Add(1);

set.Contains(1);

set.Remove(1);
```

---

# 5. Queue<T>

FIFO

```csharp
Queue<int> q = new Queue<int>();

q.Enqueue(1);

int x = q.Dequeue();

int front = q.Peek();
```

---

# 6. Stack<T>

LIFO

```csharp
Stack<int> stack = new Stack<int>();

stack.Push(1);

int top = stack.Pop();

int peek = stack.Peek();
```

---

# 7. String

```csharp
string s = "hello";

int len = s.Length;

char c = s[0];
```

Split:

```csharp
string[] parts = s.Split(',');
```

StringBuilder:

```csharp
StringBuilder sb = new StringBuilder();

sb.Append("abc");

string result = sb.ToString();
```

---

# 8. LINQ

```csharp
using System.Linq;
```

Examples:

```csharp
nums.Max();

nums.Min();

nums.Sum();

nums.OrderBy(x => x);

nums.Where(x => x > 0);

nums.Select(x => x * 2);

nums.ToList();
```

---

# 9. Sorting

```csharp
Array.Sort(nums);

list.Sort();
```

Custom:

```csharp
list.Sort((a, b) => a.Length - b.Length);
```

---

# 10. Math

```csharp
Math.Max(a, b);

Math.Min(a, b);

Math.Abs(x);

Math.Sqrt(x);

Math.Pow(2, 3);
```

---

# 11. Try / Catch

```csharp
try
{
    int x = 10 / 0;
}
catch (Exception ex)
{
    Console.WriteLine(ex.Message);
}
```

Specific exception:

```csharp
catch (FormatException ex)
{
    Console.WriteLine("Bad number format");
}
```

Throw:

```csharp
throw new ArgumentException("Invalid input");
```

TryParse:

```csharp
if (int.TryParse(input, out int x))
{
    Console.WriteLine(x);
}
```

---

# 12. Console Logging

```csharp
Console.WriteLine("Hello");
```

String interpolation:

```csharp
Console.WriteLine($"Name: {name}");
```

Print array:

```csharp
Console.WriteLine(string.Join(",", nums));
```

Debug loop:

```csharp
Console.WriteLine($"i={i}, val={nums[i]}");
```

---

# 13. Linked List

```csharp
public class ListNode
{
    public int val;
    public ListNode next;

    public ListNode(int val = 0, ListNode next = null)
    {
        this.val = val;
        this.next = next;
    }
}
```

---

# 14. Tree

```csharp
public class TreeNode
{
    public int val;
    public TreeNode left;
    public TreeNode right;

    public TreeNode(int val = 0,
                    TreeNode left = null,
                    TreeNode right = null)
    {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
```

DFS:

```csharp
void DFS(TreeNode node)
{
    if (node == null)
        return;

    DFS(node.left);
    DFS(node.right);
}
```

---

# 15. Common Patterns

Frequency Counter:

```csharp
var map = new Dictionary<char, int>();

foreach (char c in s)
{
    map[c] = map.GetValueOrDefault(c, 0) + 1;
}
```

Two Sum:

```csharp
var map = new Dictionary<int, int>();

for (int i = 0; i < nums.Length; i++)
{
    int diff = target - nums[i];

    if (map.ContainsKey(diff))
        return new int[] { map[diff], i };

    map[nums[i]] = i;
}
```

BFS:

```csharp
Queue<TreeNode> q = new Queue<TreeNode>();

q.Enqueue(root);

while (q.Count > 0)
{
    TreeNode node = q.Dequeue();

    if (node.left != null)
        q.Enqueue(node.left);

    if (node.right != null)
        q.Enqueue(node.right);
}
```
