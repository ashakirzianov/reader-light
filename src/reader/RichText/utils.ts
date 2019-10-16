import { RichTextFragment, Path, Range, AttrsRange } from './model';

export function assertNever(x: never) {
    return x;
}

export function fragmentLength(fragment: RichTextFragment): number {
    switch (fragment.frag) {
        case undefined:
            return fragment.text.length;
        case 'list':
            return fragmentsLength(flatten(fragment.items));
        case 'table':
            return fragmentsLength(flatten(flatten(fragment.rows)));
        case 'image':
            return 1;
        case 'line':
            return 0;
        default:
            assertNever(fragment);
            return 0;
    }
}

export function fragmentsLength(fragments: RichTextFragment[]): number {
    return fragments.reduce((sum, f) => sum + fragmentLength(f), 0);
}

export type PathMap<T> = {
    get(path: Path): T | undefined,
    set(path: Path, value: T): void,
    iterator(): IterableIterator<[Path, T]>,
};

export function makePathMap<T>(): PathMap<T> {
    type MapNode = {
        symbols: T[],
        value?: T,
    };
    const map: MapNode[] = [];
    return {
        get(path) {
            const block = map[path.block];
            if (path.symbol !== undefined) {
                return block && (block.symbols[path.symbol] || block.value);
            } else {
                return block && block.value;
            }
        },
        set(path, value) {
            let block = map[path.block];
            if (block === undefined) {
                block = {
                    symbols: [],
                };
                map[path.block] = block;
            }
            if (path.symbol !== undefined) {
                block.symbols[path.symbol] = value;
            } else {
                block.value = value;
            }
        },
        iterator: function* () {
            for (let idx = 0; idx < map.length; idx++) {
                const block = map[idx];
                if (block !== undefined) {
                    if (block.value !== undefined) {
                        yield [{ block: idx }, block.value];
                    }
                    for (let subIdx = 0; subIdx < block.symbols.length; subIdx++) {
                        const symbol = block.symbols[subIdx];
                        if (symbol !== undefined) {
                            yield [{ block: idx, symbol: subIdx }, symbol];
                        }
                    }
                }
            }
        },
    };
}

export function makeRange(left: Path, right: Path): Range {
    return pathLessThan(left, right)
        ? { start: left, end: right }
        : { start: right, end: left };
}

// Internal:

function pathLessThan(left: Path, right: Path): boolean {
    if (left.block < right.block) {
        return true;
    } else {
        if (left.symbol !== undefined) {
            return right.symbol !== undefined && left.symbol < right.symbol;
        } else {
            return right.symbol !== undefined;
        }
    }
}

export function flatten<T>(arr: T[][]): T[] {
    return arr.reduce((res, a) => res.concat(a), []);
}

export function applyAttrsRange(fragments: RichTextFragment[], range: AttrsRange) {
    const result: RichTextFragment[] = [];
    let start = 0;
    for (const frag of fragments) {
        if (frag.frag !== undefined) {
            // TODO: support lists and tables
            result.push(frag);
            continue;
        }

        const end = start + frag.text.length;
        if (end < range.start) {
            result.push(frag);
        } else if (start < range.start) {
            const pre: RichTextFragment = {
                text: frag.text.substring(0, range.start),
                attrs: frag.attrs,
            };
            if (range.end === undefined || range.end >= end) {
                const overlap: RichTextFragment = {
                    text: frag.text.substring(range.start),
                    attrs: {
                        ...frag.attrs,
                        ...range.attrs,
                    },
                };
                result.push(pre, overlap);
            } else {
                const overlap: RichTextFragment = {
                    text: frag.text.substring(range.start, range.end),
                    attrs: {
                        ...frag.attrs,
                        ...range.attrs,
                    },
                };
                const post: RichTextFragment = {
                    text: frag.text.substring(range.end),
                    attrs: {
                        ...frag.attrs,
                        ...range.attrs,
                    },
                };
                result.push(pre, overlap, post);
            }
        } else if (range.end === undefined || start < range.end) {
            const overlap: RichTextFragment = {
                text: frag.text.substring(0, range.end),
                attrs: {
                    ...frag.attrs,
                    ...range.attrs,
                },
            };
            if (range.end === undefined || end <= range.end) {
                result.push(overlap);
            } else {
                const post: RichTextFragment = {
                    text: frag.text.substring(range.end),
                    attrs: frag.attrs,
                };
                result.push(overlap, post);
            }
        } else {
            result.push(frag);
        }
        start = end;
    }

    return result;
}
