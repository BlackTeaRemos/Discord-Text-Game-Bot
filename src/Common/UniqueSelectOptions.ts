/**
 * Ensures select menu options have unique values within Discord constraints by filtering empties and removing duplicates up to the specified maximum
 */
export function UniqueSelectOptions<T extends { value: string }>(options: T[], max = 25): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const o of options) {
        const v = (o.value ?? ``).toString();
        if (!v) {
            continue;
        } // skip empty values
        if (seen.has(v)) {
            continue;
        }
        seen.add(v);
        out.push(o);
        if (out.length >= max) {
            break;
        }
    }
    return out;
}
