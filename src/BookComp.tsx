import * as React from 'react';
import { Book, BookFragment } from 'booka-common';
import { BookFragmentComp } from './reader';

export type BookProps = {
    book: Book,
}
export function BookComp(props: BookProps) {
    const fragment: BookFragment = {
        path: [],
        nodes: props.book.volume.nodes,
    };
    return <BookFragmentComp
        fragment={fragment}
        fontFamily='Georgia'
        fontSize={24}
        color='black'
        refColor='blue'
        refHoverColor='purple'
    />;
}
