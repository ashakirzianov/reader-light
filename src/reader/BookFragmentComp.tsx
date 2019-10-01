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
            const start = [...fragment.path, ...selection.range.start];
            const end = [...fragment.path, ...selection.range.end];
            const actualSelection = {
                text: selection.text,
                range: { start, end },
            };
            onSelectionChange(actualSelection);
        } else {
            onSelectionChange(selection);
        }
    }, [fragment.path]);

    const scrollHandler = React.useCallback((path: number[]) => {
        if (onScroll) {
            const actualPath = [...fragment.path, ...path];
            onScroll(actualPath);
        }
    }, [onScroll, fragment.path]);

    const adjustedPathToScroll = (pathToScroll && pathToScroll.slice(fragment.path.length)) || undefined;

    const adjustedColorization = colorization
        ? filterUndefined(colorization.map(col => {
            const relativeRange = rangeRelativeToPath(col.range, fragment.path);
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
