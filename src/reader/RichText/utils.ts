import { RichTextFragment, Path, Range } from './model';

export function assertNever(x: never) {
    return x;
}

export function fragmentLength(fragment: RichTextFragment): number {
    // switch (fragment.frag) {
    //     case undefined:
    //         return fragment.text.length;
    //     case 'list':
    //         return fragmentsLength(flatten(fragment.items));
    //     case 'table':
    //         return fragmentsLength(flatten(flatten(fragment.rows)));
    //     case 'image':
    //         return 1;
    //     default:
    //         assertNever(fragment);
    //         return 0;
    // }

    return fragment.text.length;
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
