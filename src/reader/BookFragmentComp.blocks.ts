import {
    BookFragment, BookPath, BookContentNode, assertNever, flatten, ParagraphNode, pphSpan, ChapterNode, GroupNode, hasSemantic, ListNode, TableNode, Span, mapSpanFull, AttributeName, pathLessThan, isSubpath, iterateBookFragment, samePath, BookRange,
} from 'booka-common';
import {
    RichTextBlock, AttrsRange, applyAttrsRange, RichTextFragment,
    RichTextAttrs, Color, Path,
} from './RichText';

export type ColorizedRange = {
    color: Color,
    range: BookRange,
};


type BlockWithPath = {
    block: RichTextBlock,
    path: BookPath,
};
type BlockData = BlockWithPath[];
export function bookPathForBlockPath(blockPath: Path, data: BlockData): BookPath | undefined {
    const prefix = data[blockPath.block].path;
    const bookPath = blockPath.symbol !== undefined
        ? [...prefix, blockPath.symbol]
        : prefix;
    return bookPath;
}
export function blockPathForBookPath(path: BookPath, data: BlockData): Path | undefined {
    // TODO: implement properly
    if (path.length === 0) {
        return { block: 0 };
    }
    let blockIndex = data
        .findIndex(datum => samePath(datum.path, path));
    if (blockIndex >= 0) {
        return {
            block: blockIndex,
            symbol: path.length > data[blockIndex].path.length
                ? path[data[blockIndex].path.length]
                : undefined,
        };
    } else {
        const withoutSymbol = path.slice(0, path.length - 1);
        blockIndex = data
            .findIndex(datum => samePath(datum.path, withoutSymbol));
        return blockIndex >= 0 ? {
            block: blockIndex,
            symbol: path[data[blockIndex].path.length],
        } : undefined;
    }
}

export function buildBlocksData(fragment: BookFragment, env: BuildBlocksEnv) {
    return Array.from(generateBlocks(fragment, env));
}

function* generateBlocks(fragment: BookFragment, env: BuildBlocksEnv): Generator<BlockWithPath> {
    for (const [node, path] of iterateBookFragment(fragment)) {
        console.log(path);
        const block = blockForNode(node, {
            ...env,
            path,
        });
        yield { block, path };
    }
}

type BuildBlocksEnv = {
    // TODO: remove ?
    path: BookPath,
    colorization: ColorizedRange[] | undefined,
    fontSize: number,
    refColor: Color,
    refHoverColor: Color,
};

function blockForNode(node: BookContentNode, env: BuildBlocksEnv): RichTextBlock {
    switch (node.node) {
        case undefined:
        case 'pph':
            return blockForParagraph(node, env);
        case 'chapter':
            return blockForChapter(node, env);
        case 'group':
            return blockForGroup(node, env);
        case 'list':
            return blockForList(node, env);
        case 'table':
            return blockForTable(node, env);
        case 'image':
        case 'separator':
            // TODO: support
            return { fragments: [] };
        default:
            assertNever(node);
            // TODO: do not generate empty block
            return { fragments: [] };
    }
}

function blockForParagraph(node: ParagraphNode, env: BuildBlocksEnv): RichTextBlock {
    let fragments = fragmentsForSpan(pphSpan(node), env);
    fragments = colorizeFragments(fragments, env.colorization, env.path);

    const isFirstParagraph = env.path[env.path.length - 1] === 0;
    const needDropCase = isFirstParagraph;
    if (needDropCase) {
        const dropCaps: AttrsRange = {
            attrs: { dropCaps: true },
            start: 0,
            end: 1,
        };
        fragments = applyAttrsRange(fragments, dropCaps);
    }
    return {
        indent: !needDropCase,
        fragments,
    };
}

function blockForChapter({ level, title }: ChapterNode, env: BuildBlocksEnv): RichTextBlock {
    return titleBlock(title, level, env);
}

function blockForGroup(node: GroupNode, env: BuildBlocksEnv): RichTextBlock {
    if (hasSemantic(node, 'footnote')) {
        return titleBlock(node.semantic.footnote.title, -1, env);
    } else {
        // TODO: do not generate ?
        return { fragments: [] };
    }
}

function blockForList(node: ListNode, env: BuildBlocksEnv): RichTextBlock {
    const items = node.items.map(i => fragmentsForSpan(i.item, env));
    let fragments: RichTextFragment[] = [{
        frag: 'list',
        kind: node.kind === 'basic'
            ? 'unordered'
            : 'ordered',
        items,
    }];
    fragments = colorizeFragments(fragments, env.colorization, env.path);
    return { fragments };
}

function blockForTable(node: TableNode, env: BuildBlocksEnv): RichTextBlock {
    const rows = node.rows.map(row => {
        return row.cells
            .map(cell => fragmentsForSpan(cell, env));
    });
    let fragments: RichTextFragment[] = [{
        frag: 'table',
        rows,
    }];
    fragments = colorizeFragments(fragments, env.colorization, env.path);
    return { fragments };
}

function titleBlock(lines: string[], level: number, env: BuildBlocksEnv): RichTextBlock {
    const attrs: RichTextAttrs = {
        letterSpacing: level === 0
            ? 0.15
            : undefined,
        italic: level < 0,
        fontSize: level > 0
            ? env.fontSize * 1.5
            : env.fontSize,
    };

    return {
        margin: level > 0
            ? 1
            : 0.8,
        center: level >= 0,
        fragments: lines.map(line => ({
            text: `${line}\n`,
            attrs,
        })),
    };
}

function fragmentsForSpan(span: Span, env: BuildBlocksEnv): RichTextFragment[] {
    return mapSpanFull<RichTextFragment[]>(span, {
        // return mapSpanFull(span, {
        simple: s => [{ text: s }],
        compound: ss => flatten(ss.map(s => fragmentsForSpan(s, env))),
        attr: (s, attr) => {
            const inside = fragmentsForSpan(s, env);
            const range: AttrsRange = {
                attrs: convertAttr(attr),
                start: 0,
            };
            const result = applyAttrsRange(inside, range);
            return result;
        },
        ref: (s, refToId) => {
            const inside = fragmentsForSpan(s, env);
            const range: AttrsRange = {
                attrs: {
                    ref: refToId,
                    color: env.refColor,
                },
                start: 0,
            };
            const result = applyAttrsRange(inside, range);
            return result;
        },
        // TODO: support images
        image: image => [],
        // TODO: support semantics
        semantic: s => fragmentsForSpan(s, env),
        default: s => [],
    });
}

function convertAttr(an: AttributeName): RichTextAttrs {
    switch (an) {
        case 'italic':
            return { italic: true };
        case 'bold':
            return { bold: true };
        default:
            // TODO: support all
            // TODO: assert never
            return {};
    }
}

function colorizeFragments(fragments: RichTextFragment[], colorization: ColorizedRange[] | undefined, path: BookPath): RichTextFragment[] {
    if (colorization === undefined) {
        return fragments;
    }
    for (const col of colorization) {
        const relative = colorizationRelativeToPath(path, col);
        if (relative) {
            fragments = applyAttrsRange(fragments, relative);
        }
    }

    return fragments;
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
