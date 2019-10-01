import * as React from 'react';
import { Book } from "booka-common";

import { BookComp } from './BookComp';

export type PublicBookProps = {
    bookName: string,
};

export function PublicBookComp({ bookName }: PublicBookProps) {
    const [booka, setBooka] = React.useState<Booka | undefined>(undefined);
    fetchBooka(bookName).then(setBooka);
    return booka === undefined
        ? <div>...</div>
        : <BookComp book={booka.book} />;
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
