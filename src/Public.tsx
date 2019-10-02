import * as React from 'react';
import { Book, BookPath } from "booka-common";

import { BookComp } from './BookComp';

export type PublicBookProps = {
    bookName: string,
    path: BookPath,
};

export function PublicBookComp({ bookName, path }: PublicBookProps) {
    type BookaCache = {
        [id: string]: Booka | undefined,
    };
    const [cache, setCache] = React.useState<BookaCache>({});
    const booka = cache[bookName];
    if (booka === undefined) {
        fetchBooka(bookName).then(booka => setCache({
            ...cache,
            [bookName]: booka,
        }));
    }

    return booka === undefined
        ? <div>...</div>
        : <BookComp
            book={booka.book}
            id={bookName}
            path={path}
        />;
}

type Booka = {
    book: Book,
}
async function fetchBooka(name: string): Promise<Booka> {
    return fetchPublicFile(`/bookas/${name}.booka`) as Promise<Booka>;
}

async function fetchPublicFile(path: string): Promise<object> {
    const url = `${process.env.PUBLIC_URL}${path}`;
    const response = await fetch(url);
    const json = await response.json();

    return json;
}
