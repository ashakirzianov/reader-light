import * as React from 'react';
import { Path, RichTextSelection } from './model';
import { PathMap, makeRange } from './utils';

export type RefType = HTMLSpanElement | null;

export function useScroll(callback?: (e: Event) => void) {
    React.useEffect(() => {
        if (callback) {
            window.addEventListener('scroll', callback);
        }

        return callback && function unsubscribe() {
            window.removeEventListener('scroll', callback);
        };
    }, [callback]);
}

export function useSelection(callback: (e: Event) => void) {
    React.useEffect(() => {
        window.document.addEventListener('selectionchange', callback);

        return function unsubscribe() {
            window.document.removeEventListener('selectionchange', callback);
        };
    }, [callback]);
}

// Scroll

export async function computeCurrentPath(refMap: PathMap<RefType>) {
    let last: Path | undefined;
    for (const [path, ref] of refMap.iterator()) {
        const isVisible = await isPartiallyVisible(ref);
        if (isVisible) {
            if (path) {
                last = path;
            }
        }
    }

    return last;
}

async function isPartiallyVisible(ref?: RefType) {
    if (ref) {
        const rect = boundingClientRect(ref);
        if (rect) {
            const { top, height } = rect;
            const result = top <= 0 && top + height >= 0;
            if (result) {
                return result;
            }
        }
    }

    return false;
}

function boundingClientRect(ref?: RefType) {
    const current = ref;
    return current
        && current.getBoundingClientRect
        && current.getBoundingClientRect()
        ;
}

export function scrollToRef(ref: RefType) {
    if (ref) {
        ref.scrollIntoView();
        // TODO: find other solution ?
        window.scrollBy(0, 1); // Ugly -- fix issue with showing prev element path in the url after navigation
        return true;
    }
    return false;
}

// Selection:
export function getSelectionRange(): RichTextSelection | undefined {
    const selection = window.getSelection();
    if (!selection) {
        return undefined;
    }

    const anchorPath = pathForNode(selection.anchorNode);
    const focusPath = pathForNode(selection.focusNode);

    if (anchorPath && focusPath) {
        anchorPath.symbol = anchorPath.symbol
            ? selection.anchorOffset + anchorPath.symbol
            : selection.anchorOffset;
        focusPath.symbol = focusPath.symbol
            ? selection.focusOffset + focusPath.symbol
            : selection.focusOffset;
        const range = makeRange(anchorPath, focusPath);
        const text = selection.toString();
        return { range, text };
    } else {
        return undefined;
    }
}

function pathForNode(node: Node | null): Path | undefined {
    return node
        ? pathForHtmlElement(node.parentElement)
        : undefined;
}

function pathForHtmlElement(element: HTMLElement | null): Path | undefined {
    if (!element) {
        return undefined;
    }

    const idString = element.id;
    const path = idToPath(idString);
    if (path) {
        return path;
    } else {
        return pathForHtmlElement(element.parentElement);
    }
}

const idPrefix = '@id';
export function pathToId(path: Path): string {
    return `${idPrefix}:${pathToString(path)}`;
}

function idToPath(str: string): Path | undefined {
    const comps = str.split(':');
    if (comps.length !== 2 || comps[0] !== idPrefix) {
        return undefined;
    }
    const path = parsePath(comps[1]);

    return path;
}

function pathToString(path: Path): string {
    return path.symbol === undefined
        ? `${path.block}`
        : `${path.block}-${path.symbol}`;
}

function parsePath(pathString: string): Path | undefined {
    const path = pathString
        .split('-')
        .map(pc => parseInt(pc, 10))
        ;
    return path.length > 2 || path.some(p => isNaN(p))
        ? undefined
        : {
            block: path[0],
            symbol: path[1],
        };
}
