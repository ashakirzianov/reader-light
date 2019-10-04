import * as React from 'react';

import {
    BookContentNode, Span, flatten, spanAttrs, assertNever,
    ParagraphNode, ChapterNode, BookPath, isSubpath,
    BookRange, pathLessThan, pphSpan, hasSemantic,
} from 'booka-common';

import {
    RichTextBlock, RichTextAttrs, RichTextFragment, RichText,
    Color, Path, RichTextSelection,
} from './RichText';
import { GroupNode } from 'booka-common';
import { samePath } from 'booka-common';

export type ColorizedRange = {
    color: Color,
    range: BookRange,
};
export type BookSelection = {
    text: string,
    range: BookRange,
};
export type BookNodesProps = {
    nodes: BookContentNode[],
    colorization?: ColorizedRange[],
    color: Color,
    refColor: Color,
    refHoverColor: Color,
    fontSize: number,
    fontFamily: string,
    pathToScroll?: BookPath,
    onScroll?: (path: BookPath) => void,
    onSelectionChange?: (selection: BookSelection | undefined) => void,
    onRefClick?: (refId: string) => void,
};
export function BookNodesComp({
    nodes, color, fontSize, fontFamily, refColor, refHoverColor,
    pathToScroll, onScroll, onSelectionChange, onRefClick,
    colorization,
}: BookNodesProps) {
    const blocksData = buildBlocksData(nodes, {
        path: [],
        refColor: refColor,
        refHoverColor: refHoverColor,
        colorization: colorization,
        fontSize: fontSize,
    });
    const scrollHandler = React.useCallback((path: Path) => {
        if (!onScroll) {
            return;
        } else {
            const bookPath = blocksData.blockPathToBookPath(path);
            onScroll(bookPath);
        }
    }, [onScroll, blocksData]);

    const selectionHandler = React.useCallback((richTextSelection: RichTextSelection | undefined) => {
        if (!onSelectionChange) {
            return;
        }
        if (richTextSelection === undefined) {
            onSelectionChange(richTextSelection);
        } else {
            const start = blocksData.blockPathToBookPath(richTextSelection.range.start);
            const end = blocksData.blockPathToBookPath(richTextSelection.range.end);
            const bookSelection: BookSelection = {
                text: richTextSelection.text,
                range: { start, end },
            };
            onSelectionChange(bookSelection);
        }
    }, [onSelectionChange, blocksData]);

    const blockPathToScroll = pathToScroll && blocksData.bookPathToBlockPath(pathToScroll);

    return <RichText
        blocks={blocksData.blocks}
        color={color}
        fontSize={fontSize}
        fontFamily={fontFamily}
        onScroll={scrollHandler}
        pathToScroll={blockPathToScroll}
        onSelectionChange={selectionHandler}
        onRefClick={onRefClick}
    />;
}

type BuildBlocksEnv = {
    path: BookPath,
    colorization: ColorizedRange[] | undefined,
    fontSize: number,
    refColor: Color,
    refHoverColor: Color,
    dontDropCase?: boolean,
};
// TODO: better naming
type BlocksData = {
    blocks: RichTextBlock[],
    blockPathToBookPath(path: Path): BookPath,
    bookPathToBlockPath(path: BookPath): Path | undefined,
};

function buildBlocksData(nodes: BookContentNode[], env: BuildBlocksEnv): BlocksData {
    const prefixedBlocks = blocksForNodes(nodes, env);
    const blocks = prefixedBlocks.map(pb => pb.block);
    const prefixes = prefixedBlocks.map(pb => pb.prefix);

    return {
        blocks,
        blockPathToBookPath(path) {
            const prefix = prefixedBlocks[path.block].prefix;
            const bookPath = path.symbol !== undefined
                ? [...prefix, path.symbol]
                : prefix;
            return bookPath;
        },
        bookPathToBlockPath(path) {
            // TODO: implement properly
            if (path.length === 0) {
                return { block: 0 };
            }
            let blockIndex = prefixes
                .findIndex(pre => samePath(pre, path));
            if (blockIndex >= 0) {
                return {
                    block: blockIndex,
                    symbol: path.length > prefixes[blockIndex].length
                        ? path[prefixes[blockIndex].length]
                        : undefined,
                };
            } else {
                const withoutSymbol = path.slice(0, path.length - 1);
                blockIndex = prefixes
                    .findIndex(pre => samePath(pre, withoutSymbol));
                return blockIndex >= 0 ? {
                    block: blockIndex,
                    symbol: path[prefixes[blockIndex].length],
                } : undefined;
            }
        },
    };
}

type BlockWithPrefix = {
    block: RichTextBlock,
    prefix: number[],
};
function blocksForNode(node: BookContentNode, env: BuildBlocksEnv): BlockWithPrefix[] {
    switch (node.node) {
        case undefined:
        case 'pph':
            return blocksForParagraph(node, env);
        case 'chapter':
            return blocksForChapter(node, env);
        case 'group':
            return blocksForGroup(node, env);
        case 'image-data':
        case 'image-ref':
        case 'table':
        case 'list':
        case 'separator':
            // TODO: support
            return [];
        default:
            assertNever(node);
            return [];
    }
}

function blocksForNodes(nodes: BookContentNode[], env: BuildBlocksEnv): BlockWithPrefix[] {
    return flatten(
        nodes.map((n, i) => blocksForNode(n, {
            ...env,
            path: env.path.concat(i),
        }))
    );
}

function blocksForParagraph(node: ParagraphNode, env: BuildBlocksEnv): BlockWithPrefix[] {
    let fragments = fragmentsForSpan(pphSpan(node), env);
    if (env.colorization) {
        for (const col of env.colorization) {
            const relative = colorizationRelativeToPath(env.path, col);
            if (relative) {
                fragments = applyAttrsRange(fragments, relative);
            }
        }
    }
    const isFirstParagraph = env.path[env.path.length - 1] === 0;
    const needDropCase = isFirstParagraph && !env.dontDropCase;
    if (needDropCase) {
        const dropCaps: AttrsRange = {
            attrs: { dropCaps: true },
            start: 0,
            end: 1,
        };
        fragments = applyAttrsRange(fragments, dropCaps);
    }
    return [{
        block: {
            dontIndent: needDropCase,
            fragments,
        },
        prefix: env.path,
    }];
}

function blocksForChapter(node: ChapterNode, env: BuildBlocksEnv): BlockWithPrefix[] {
    const title = titleBlock(node.title, node.level, env);
    const inside = blocksForNodes(node.nodes, env);
    return [title, ...inside];
}

function blocksForGroup(node: GroupNode, env: BuildBlocksEnv): BlockWithPrefix[] {
    if (hasSemantic(node, 'footnote')) {
        const title = titleBlock(node.semantic.footnote.title, -1, env);
        const inside = blocksForNodes(node.nodes, {
            ...env,
            dontDropCase: true,
        });
        return [title, ...inside];
    } else {
        return blocksForNodes(node.nodes, env);
    }
}

function titleBlock(lines: string[], level: number, env: BuildBlocksEnv): BlockWithPrefix {
    const attrs: RichTextAttrs = {
        letterSpacing: level === 0
            ? 0.15
            : undefined,
        italic: level < 0,
        fontSize: level > 0
            ? env.fontSize * 1.5
            : env.fontSize,
    };
    const title: BlockWithPrefix = {
        block: {
            margin: level > 0
                ? 1
                : 0.8,
            center: level >= 0,
            dontIndent: true,
            fragments: lines.map(line => ({
                text: `${line}\n`,
                attrs,
            })),
        },
        prefix: env.path,
    };

    return title;
}

function fragmentsForSpan(span: Span, env: BuildBlocksEnv): RichTextFragment[] {
    switch (span.span) {
        case undefined:
            return [{ text: span }];
        case 'compound':
            return flatten(span.spans.map(s => fragmentsForSpan(s, env)));
        case 'attrs':
            {
                const inside = fragmentsForSpan(span.content, env);
                const map = spanAttrs(span);
                const range: AttrsRange = {
                    attrs: {
                        italic: map.italic,
                        bold: map.bold,
                    },
                    start: 0,
                };
                const result = applyAttrsRange(inside, range);
                return result;
            }
        case 'ref':
            {
                const inside = fragmentsForSpan(span.content, env);
                const range: AttrsRange = {
                    attrs: {
                        ref: span.refToId,
                        color: env.refColor,
                    },
                    start: 0,
                };
                const result = applyAttrsRange(inside, range);
                return result;
            }
        default:
            assertNever(span);
            return [];
    }
}

type AttrsRange = {
    start: number,
    end?: number,
    attrs: RichTextAttrs,
};
function applyAttrsRange(fragments: RichTextFragment[], range: AttrsRange) {
    const result: RichTextFragment[] = [];
    let start = 0;
    for (const frag of fragments) {
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

function colorizationRelativeToPath(path: BookPath, colorized: ColorizedRange): AttrsRange | undefined {
    const attrs: RichTextAttrs = {
        background: colorized.color,
    };
    if (colorized.range.end && pathLessThan(colorized.range.end, path)) {
        return undefined;
    }

    let start: number | undefined;
    if (!pathLessThan(path, colorized.range.start)) {
        start = 0;
    } else if (isSubpath(path, colorized.range.start)) {
        start = colorized.range.start[path.length];
    }
    let end: number | undefined;
    if (colorized.range.end && isSubpath(path, colorized.range.end)) {
        end = colorized.range.end[path.length];
    }

    return start !== undefined
        ? { start, end, attrs }
        : undefined;
}
