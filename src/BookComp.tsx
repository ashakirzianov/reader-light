import * as React from 'react';
import {
    Book, fragmentForPath, BookPath, findReference,
} from 'booka-common';
import { BookFragmentComp } from './reader';
import { TableOfContents, tocForBook } from 'booka-common';
import { Link, navigate } from '@reach/router';

export type BookProps = {
    book: Book,
    id: string,
    path: BookPath,
}
export function BookComp({ book, id, path }: BookProps) {
    const fragment = fragmentForPath(book, path);
    const onRefClick = React.useCallback((refId: string) => {
        const ref = findReference(refId, book.volume);
        if (ref) {
            navigateToPath(id, ref[1]);
        }
    }, [book, id]);

    // const [selection, setSelection] = React.useState<BookSelection | undefined>(undefined);
    // const colorization: ColorizedRange[] = selection === undefined
    //     ? []
    //     : [{
    //         color: 'yellow',
    //         range: selection.range,
    //     }];

    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '1em',
    }}>
        <Header>
            <TableOfContentsComp
                id={id}
                toc={tocForBook(book)}
            />
        </Header>
        <PathLink
            id={id}
            path={fragment.previous}
            text='Previous'
        />
        <div style={{
            maxWidth: '50em',
        }}>

            <BookFragmentComp
                fragment={fragment}
                fontFamily='Georgia'
                fontSize={24}
                color='black'
                refColor='blue'
                refHoverColor='purple'
                pathToScroll={path}
                onScroll={p => {
                    setBrowserPath(id, p);
                }}
                onRefClick={onRefClick}
            // colorization={colorization}
            // onSelectionChange={setSelection}
            />
        </div>
        <PathLink
            id={id}
            path={fragment.next}
            text='Next'
        />
    </div>;
}

type PathLinkProps = {
    path?: BookPath,
    id: string,
    text: string,
};
function PathLink({ path, id, text }: PathLinkProps) {
    return path === undefined
        ? null
        : <Link
            to={bookUrl(id, path)}
            style={{
                color: 'blue',
                cursor: 'pointer',
                fontSize: '1.5em',
            }}
        >
            {text}
        </Link>
}

type TableOfContentsProps = {
    toc: TableOfContents,
    id: string,
}
function TableOfContentsComp({ toc, id }: TableOfContentsProps) {
    const [visible, setVisible] = React.useState(false);

    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
    }}>
        <div>
            <button
                onClick={() => setVisible(!visible)}
            >
                {visible ? 'Hide Table of Contents' : 'Show Table of Contents'}
            </button>
        </div>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            background: '#EEEEEE',
        }}>
            {
                !visible ? null :
                    toc.items.map(i =>
                        <PathLink
                            key={i.path.join('-')}
                            id={id}
                            path={i.path}
                            text={i.title[0]}
                        />)
            }
        </div>
    </div>
}

type HeaderProps = {
    children?: React.ReactNode,
};
function Header({ children }: HeaderProps) {
    return <div style={{
        position: 'fixed',
        left: 0, top: 0,
        overflow: 'scroll',
        height: '100%',
        maxHeight: '100%',
    }}>
        {children}
    </div>
}

function navigateToPath(id: string, path: BookPath) {
    navigate(bookUrl(id, path));
}

function bookUrl(id: string, path: BookPath) {
    return `/book/${id}/${path.join('-')}`;
}

function setBrowserPath(id: string, path: BookPath) {
    const url = bookUrl(id, path);
    window.history.replaceState(null, '', url);
}
