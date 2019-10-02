import * as React from 'react';
import { Book, fragmentForPath, BookPath } from 'booka-common';
import { BookFragmentComp } from './reader';
import { TableOfContents, tocForBook } from 'booka-common';

export type BookProps = {
    book: Book,
}
export function BookComp({ book }: BookProps) {
    const [path, setPath] = React.useState<BookPath>([]);
    const fragment = fragmentForPath(book, path);
    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    }}>
        <TableOfContentsComp
            toc={tocForBook(book)}
            navigateToPath={setPath}
        />
        <PathLink
            path={fragment.previous}
            text='Previous'
            navigateToPath={setPath}
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
            />
        </div>
        <PathLink
            path={fragment.next}
            text='Next'
            navigateToPath={setPath}
        />
    </div>;
}

type PathLinkProps = {
    path?: BookPath,
    navigateToPath: (path: BookPath) => void,
    text: string,
};
function PathLink({ path, navigateToPath: onClick, text }: PathLinkProps) {
    return path === undefined
        ? null
        : <a
            href=''
            onClick={e => {
                e.preventDefault();
                onClick(path);
                window.scrollTo(0, 0);
            }}
            style={{
                // margin: '1em',
                fontSize: '2em',
            }}
        >
            {text}
        </a>
}

type TableOfContentsProps = {
    toc: TableOfContents,
    navigateToPath: (path: BookPath) => void,
}
function TableOfContentsComp({ toc, navigateToPath }: TableOfContentsProps) {
    const [visible, setVisible] = React.useState(false);

    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
    }}>
        <button onClick={() => setVisible(!visible)}>
            Table of Contents
        </button>
        {
            !visible ? null :
                toc.items.map(i =>
                    <PathLink
                        key={i.path.join('-')}
                        path={i.path}
                        text={i.title[0]}
                        navigateToPath={p => {
                            navigateToPath(p);
                            setVisible(false);
                        }}
                    />)
        }
    </div>
}
