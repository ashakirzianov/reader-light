import * as React from 'react';

import {
    Color, Path,
    RichTextFragment, RichTextBlock, RichTextSelection, RichTextSimpleFragment, RichTextImageFragment, RichTextListFragment, RichTextTableFragment, RichTextLineFragment,
} from './model';
import {
    fragmentLength, makePathMap, PathMap, assertNever,
} from './utils';
import {
    RefType, useScroll, computeCurrentPath, useSelection,
    pathToId, getSelectionRange, scrollToRef,
} from './web-utils';

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
                <RichTextBlockComp
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

type RichTextBlockProps = {
    block: RichTextBlock,
    path: Path,
    refCallback: (ref: RefType, path: Path) => void,
    onRefClick?: (refId: string) => void,
};
function RichTextBlockComp({ block, refCallback, path, onRefClick }: RichTextBlockProps) {
    return <div style={{
        display: 'flex',
        alignSelf: block.center
            ? 'center'
            : undefined,
        textAlign: 'justify',
        float: 'left',
        textIndent: block.indent ? '4em' : undefined,
        margin: block.margin !== undefined
            ? `${block.margin}em`
            : undefined,
    }}>
        <span
            id={pathToId(path)}
            ref={ref => refCallback(ref, path)}
        >
            {buildFragments({
                offset: 0,
                fragments: block.fragments,
                path, refCallback, onRefClick,
            }).fragments}
        </span>
    </div>;
}

type BuildFragmentsProps = {
    fragments: RichTextFragment[],
    offset: number,
    path: Path,
    refCallback: (ref: RefType, path: Path) => void,
    onRefClick?: (refId: string) => void,
};
function buildFragments({
    fragments, path, refCallback, onRefClick, offset,
}: BuildFragmentsProps) {
    const children: JSX.Element[] = [];
    let currentOffset = offset;
    for (let idx = 0; idx < fragments.length; idx++) {
        const frag = fragments[idx];
        const offset = currentOffset;
        children.push(<RichTextFragmentComp
            key={idx}
            path={{ ...path, symbol: offset }}
            fragment={frag}
            refCallback={refCallback}
            onRefClick={onRefClick}
        />);
        currentOffset += fragmentLength(frag);
    }

    return {
        fragments: children,
        offset: currentOffset,
    };
}

type RichTextFragmentProps<F extends RichTextFragment = RichTextFragment> = {
    fragment: F,
    path: Path,
    refCallback: (ref: RefType, path: Path) => void,
    onRefClick?: (refId: string) => void,
};
function RichTextFragmentComp({ fragment, ...rest }: RichTextFragmentProps) {
    switch (fragment.frag) {
        case undefined:
            return RichTextSimpleFragmentComp({ fragment, ...rest });
        case 'image':
            return RichTextImageFragmentComp({ fragment, ...rest });
        case 'list':
            return RichTextListFragmentComp({ fragment, ...rest });
        case 'table':
            return RichTextTableFragmentComp({ fragment, ...rest });
        case 'line':
            return RichTextLineFragmentComp({ fragment, ...rest });
        default:
            assertNever(fragment);
            return null;
    }
}

function RichTextSimpleFragmentComp({
    fragment: { text, attrs },
    refCallback,
    path,
    onRefClick,
}: RichTextFragmentProps<RichTextSimpleFragment>) {
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

function RichTextImageFragmentComp({
    fragment: { src, title },
    refCallback,
    path,
}: RichTextFragmentProps<RichTextImageFragment>) {
    return <img
        src={src}
        alt={title}
        title={title}
        ref={ref => refCallback(ref, path)}
    />;
}

function RichTextListFragmentComp({
    fragment: { kind, items },
    onRefClick, refCallback, path,
}: RichTextFragmentProps<RichTextListFragment>) {
    const lis: JSX.Element[] = [];
    let currentOffset = 0;
    for (let listIdx = 0; listIdx < items.length; listIdx++) {
        const item = items[listIdx];
        const { fragments, offset } = buildFragments({
            fragments: item,
            offset: currentOffset,
            onRefClick, refCallback, path,
        });
        lis.push(<li key={listIdx}>
            {fragments}
        </li>);
        currentOffset = offset;
    }
    if (kind === 'ordered') {
        return <ol>
            {lis}
        </ol>;
    } else {
        return <ul>
            {lis}
        </ul>;
    }
}

function RichTextTableFragmentComp({
    fragment: { rows },
    onRefClick, refCallback, path,
}: RichTextFragmentProps<RichTextTableFragment>) {
    const trs: JSX.Element[] = [];
    let currentOffset = 0;
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const tds: JSX.Element[] = []
        for (let cellIdx = 0; cellIdx < row.length; cellIdx++) {
            const cell = row[cellIdx];
            const { fragments, offset } = buildFragments({
                fragments: cell,
                offset: currentOffset,
                onRefClick, refCallback, path,
            });
            tds.push(<td key={cellIdx}>
                {fragments}
            </td>);
            currentOffset = offset;
        }
        trs.push(<tr key={rowIdx}>
            {tds}
        </tr>);
    }
    return <table style={{
        border: '1px solid',
    }}>
        <tbody>{trs}</tbody>
    </table>
}

function RichTextLineFragmentComp({
    fragment: { direction },
    onRefClick, refCallback, path,
}: RichTextFragmentProps<RichTextLineFragment>) {
    return <hr />;
}
