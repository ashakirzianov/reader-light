import * as React from 'react';

import { BookFragment, rangeRelativeToPath, filterUndefined } from 'booka-common';
import { BookNodesProps, BookNodesComp, BookSelection as BS } from './BookNodesComp';

export type BookSelection = BS;
export type BookFragmentProps = Omit<BookNodesProps, 'nodes'> & {
    fragment: BookFragment,
};

export function BookFragmentComp({
    fragment, onScroll, onSelectionChange,
    pathToScroll, colorization,
    ...rest }: BookFragmentProps) {
    const selectionHandler = React.useCallback((selection: BookSelection | undefined) => {
        if (!onSelectionChange) {
            return;
        }
        if (selection) {
            const start = [...fragment.current, ...selection.range.start];
            const end = [...fragment.current, ...selection.range.end];
            const actualSelection = {
                text: selection.text,
                range: { start, end },
            };
            onSelectionChange(actualSelection);
        } else {
            onSelectionChange(selection);
        }
    }, [onSelectionChange, fragment]);

    const scrollHandler = React.useCallback((path: number[]) => {
        if (onScroll) {
            const actualPath = [...fragment.current, ...path];
            onScroll(actualPath);
        }
    }, [onScroll, fragment]);

    const adjustedPathToScroll = (pathToScroll && pathToScroll.slice(fragment.current.length)) || undefined;

    const adjustedColorization = colorization
        ? filterUndefined(colorization.map(col => {
            const relativeRange = rangeRelativeToPath(col.range, fragment.current);
            return relativeRange && {
                ...col,
                range: relativeRange,
            };
        }))
        : undefined;
    return <BookNodesComp
        {...rest}
        onScroll={scrollHandler}
        onSelectionChange={selectionHandler}
        nodes={fragment.nodes}
        pathToScroll={adjustedPathToScroll}
        colorization={adjustedColorization}
    />;
}
