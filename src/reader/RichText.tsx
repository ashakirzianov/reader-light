import * as React from 'react';

export type Color = string;
export type Path = number[];
export type Range = {
    start: Path,
    end: Path,
};
export type RichTextSelection = {
    text: string,
    range: Range,
};
export type RichTextAttrs = Partial<{
    color: Color,
    hoverColor: Color,
    background: Color,
    fontSize: number,
    fontFamily: string,
    dropCaps: boolean,
    italic: boolean,
    bold: boolean,
    letterSpacing: number,
    // TODO: remove ?
    line: boolean,
    ref: string,
}>;
export type RichTextFragment = {
    text: string,
    attrs: RichTextAttrs,
};
export type RichTextBlock = {
    center?: boolean,
    dontIndent?: boolean,
    margin?: number,
    fragments: RichTextFragment[],
};

export type RichTextProps = {
    blocks: RichTextBlock[],
    color: Color,
    fontSize: number,
    fontFamily: string,
    pathToScroll?: Path,
    onScroll?: (path: Path) => void,
    onSelectionChange?: (selection: RichTextSelection | undefined) => void,
    onRefClick?: (refId: string) => void,
};
export function RichText({
    blocks, color, fontSize, fontFamily,
    pathToScroll, onScroll, onSelectionChange,
    onRefClick,
}: RichTextProps) {

    const refMap = React.useRef<PathMap<RefType>>(makePathMap());

    useScroll(React.useCallback(() => {
        if (!onScroll) {
            return;
        }
        const newCurrentPath = computeCurrentPath(refMap.current);
        if (newCurrentPath) {
            onScroll(newCurrentPath);
        }
    }, [onScroll]));

    useSelection(React.useCallback(() => {
        if (onSelectionChange) {
            const selection = getSelectionRange();
            onSelectionChange(selection);
        }
    }, [onSelectionChange]));

    React.useEffect(function scrollToCurrentPath() {
        if (pathToScroll) {
            const refToNavigate = refMap.current.get(pathToScroll);
            if (refToNavigate) {
                scrollToRef(refToNavigate);
            }
        }
    }, [pathToScroll]);

    return <span
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            color: color,
            fontSize: fontSize,
            fontFamily: fontFamily,
        }}>
        {blocks.map(
            (block, idx) =>
                <RichTextBlock
                    key={idx}
                    path={[idx]}
                    block={block}
                    refCallback={(ref, path) => {
                        refMap.current.set(path, ref);
                    }}
                    onRefClick={onRefClick}
                />
        )}
    </span>;
}

type RefType = HTMLSpanElement | null;
type RichTextBlockProps = {
    block: RichTextBlock,
    path: Path,
    refCallback: (ref: RefType, path: Path) => void,
    onRefClick?: (refId: string) => void,
};
function RichTextBlock({ block, refCallback, path, onRefClick }: RichTextBlockProps) {
    const children: JSX.Element[] = [];
    let currentOffset = 0;
    for (let idx = 0; idx < block.fragments.length; idx++) {
        const frag = block.fragments[idx];
        const offset = currentOffset;
        children.push(<RichTextFragment
            key={idx}
            path={[...path, offset]}
            fragment={frag}
            refCallback={refCallback}
            onRefClick={onRefClick}
        />);
        currentOffset += frag.text.length;
    }

    return <div style={{
        display: 'flex',
        alignSelf: block.center
            ? 'center'
            : undefined,
        textAlign: 'justify',
        float: 'left',
        textIndent: !block.dontIndent ? '4em' : undefined,
        margin: block.margin !== undefined
            ? `${block.margin}em`
            : undefined,
    }}>
        <span
            id={pathToId(path)}
            ref={ref => refCallback(ref, path)}
        >
            {children}
        </span>
    </div>;
}

type RichTextFragmentProps = {
    fragment: RichTextFragment,
    path: Path,
    refCallback: (ref: RefType, path: Path) => void,
    onRefClick?: (refId: string) => void,
};
function RichTextFragment({
    fragment: { text, attrs },
    refCallback,
    path,
    onRefClick,
}: RichTextFragmentProps) {
    return <span
        id={pathToId(path)}
        ref={ref => refCallback(ref, path)}
        style={{
            wordBreak: 'break-word',
            color: attrs.color,
            background: attrs.background,
            fontSize: attrs.fontSize,
            fontFamily: attrs.fontFamily,
            fontStyle: attrs.italic ? 'italic' : undefined,
            fontWeight: attrs.bold ? 'bold' : undefined,
            letterSpacing: attrs.letterSpacing !== undefined
                ? `${attrs.letterSpacing}em`
                : undefined,
            ...(attrs.dropCaps && {
                float: 'left',
                fontSize: attrs.fontSize
                    ? attrs.fontSize * 4
                    : '400%',
                lineHeight: '80%',
            }),
            ...(attrs.ref && {
                cursor: 'pointer',
                textDecorationLine: 'underline',
                textDecorationStyle: 'dashed',
            }),
        }}
        onClick={
            onRefClick === undefined || attrs.ref === undefined ? undefined :
                e => {
                    e.preventDefault();
                    onRefClick(attrs.ref!);
                }
        }
    >
        {text}{attrs.line ? <br /> : null}
    </span>;
}

// Utils:

type PathMap<T> = {
    get(path: Path): T | undefined,
    set(path: Path, value: T): void,
    iterator(): IterableIterator<[Path, T]>,
};

function makePathMap<T>(): PathMap<T> {
    type MapNode = {
        [idx: number]: {
            value?: T,
            children: PathMap<T>,
        } | undefined,
    };
    const node: MapNode = {};
    return {
        get(path) {
            if (path.length === 0) {
                return undefined;
            }
            const head = node[path[0]];
            if (path.length === 1) {
                return head && head.value;
            } else {
                return head && head.children.get(path.slice(1));
            }
        },
        set(path, value) {
            if (path.length === 0) {
                return;
            }
            let head = node[path[0]];
            if (head === undefined) {
                head = {
                    children: makePathMap(),
                };
                node[path[0]] = head;
            }
            if (path.length === 1) {
                head.value = value;
            } else {
                head.children.set(path.slice(1), value);
            }
        },
        iterator: function* () {
            for (const [key, value] of Object.entries(node)) {
                const idx = parseInt(key, 10);
                if (value) {
                    if (value.value) {
                        yield [[idx], value.value];
                    }
                    for (const [chPath, chValue] of value.children.iterator()) {
                        yield [[idx, ...chPath], chValue];
                    }
                }
            }
        },
    };
}

// Effects

function useScroll(callback?: (e: Event) => void) {
    React.useEffect(() => {
        if (callback) {
            window.addEventListener('scroll', callback);
        }

        return callback && function unsubscribe() {
            window.removeEventListener('scroll', callback);
        };
    }, [callback]);
}

function useSelection(callback: (e: Event) => void) {
    React.useEffect(() => {
        window.document.addEventListener('selectionchange', callback);

        return function unsubscribe() {
            window.document.removeEventListener('selectionchange', callback);
        };
    }, [callback]);
}

// Scroll

function computeCurrentPath(refMap: PathMap<RefType>) {
    let last: number[] | undefined;
    for (const [path, ref] of refMap.iterator()) {
        const isVisible = isPartiallyVisible(ref);
        if (isVisible) {
            if (path) {
                last = path;
            }
        }
    }

    return last;
}

function isPartiallyVisible(ref?: RefType) {
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

function scrollToRef(ref: RefType) {
    if (ref) {
        ref.scrollIntoView();
        // TODO: find other solution ?
        window.scrollBy(0, 1); // Ugly -- fix issue with showing prev element path in the url after navigation
        return true;
    }
    return false;
}

// Selection:
function getSelectionRange(): RichTextSelection | undefined {
    const selection = window.getSelection();
    if (!selection) {
        return undefined;
    }

    const anchorPath = pathForNode(selection.anchorNode);
    const focusPath = pathForNode(selection.focusNode);

    if (anchorPath && focusPath) {
        anchorPath[anchorPath.length - 1] += selection.anchorOffset;
        focusPath[focusPath.length - 1] += selection.focusOffset;
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

// Path & range:

function makeRange(left: Path, right: Path): Range {
    return pathLessThan(left, right)
        ? { start: left, end: right }
        : { start: right, end: left };
}

function pathLessThan(left: Path, right: Path): boolean {
    for (let idx = 0; idx < right.length; idx++) {
        const lc = left[idx];
        if (lc === undefined) {
            return true;
        }
        const rc = right[idx];
        if (lc < rc) {
            return true;
        } else if (lc > rc) {
            return false;
        }
    }

    return left.length < right.length;
}

const idPrefix = '@id';
function pathToId(path: Path): string {
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
    return `${path.join('-')}`;
}

function parsePath(pathString: string): Path | undefined {
    const path = pathString
        .split('-')
        .map(pc => parseInt(pc, 10))
        ;
    return path.some(p => isNaN(p))
        ? undefined
        : path;
}
