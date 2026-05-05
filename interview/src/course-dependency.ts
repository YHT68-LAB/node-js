function canFinish(numCourses: number, prerequisites: number[][]): boolean {
    const graph = new Map<number, number[]>();
    const linkedNodes = new Set<number>();
    const state = new Map<number, number>();
    // 0 = unvisited, 1 = visiting, 2 = done

    for (const [course, prereq] of prerequisites) {
        if (!graph.has(prereq)) graph.set(prereq, []);
        graph.get(prereq)!.push(course);

        linkedNodes.add(course);
        linkedNodes.add(prereq);
    }

    function hasCycle(course: number): boolean {
        const currentState = state.get(course) ?? 0;

        if (currentState === 1) return true;
        if (currentState === 2) return false;

        state.set(course, 1);

        for (const nextCourse of graph.get(course) ?? []) {
            if (hasCycle(nextCourse)) return true;
        }

        state.set(course, 2);
        return false;
    }

    for (const course of linkedNodes) {
        if (hasCycle(course)) return false;
    }

    return true;
}