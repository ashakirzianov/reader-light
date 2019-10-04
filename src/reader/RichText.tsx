import * as React from 'react';

export type Color = string;
export type Path = {
    block: number,
    symbol?: number,
};
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
    ref: string,
}>;
export type RichTextFragment = {
    text: string,
    attrs?: RichTextAttrs,
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

    useScroll(React.useCallback(async () => {
        if (!onScroll) {
            return;
        }
        const newCurrentPath = await computeCurrentPath(refMap.current);
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
                    path={{ block: idx }}
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
            path={{ ...path, symbol: offset }}
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
    attrs = attrs || {};
    return <span
        id={pathToId(path)}
        ref={ref => refCallback(ref, path)}
        style={{
            whiteSpace: 'pre-line',
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
                    onRefClick(attrs!.ref!);
                }
        }
    >
        {text}
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

async function computeCurrentPath(refMap: PathMap<RefType>) {
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

// Path & range:

function makeRange(left: Path, right: Path): Range {
    return pathLessThan(left, right)
        ? { start: left, end: right }
        : { start: right, end: left };
}

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
