import * as React from 'react';
import { Book, fragmentForPath, BookPath } from 'booka-common';
import { BookFragmentComp } from './reader';
import { TableOfContents, tocForBook } from 'booka-common';

export type BookProps = {
    book: Book,
}
export function BookComp({ book }: BookProps) {
    const [path, setPath] = React.useState<BookPath>([]);
    const [scrollPath, setScrollPath] = React.useState<BookPath>([]);
    const fragment = fragmentForPath(book, path);
    return <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '1em',
    }}>
        <Header>
            <span>Path: {scrollPath.join('-')}</span>
            <TableOfContentsComp
                toc={tocForBook(book)}
                navigateToPath={setPath}
            />
        </Header>
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
                onScroll={setScrollPath}
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
        : <span
            onClick={e => {
                e.preventDefault();
                onClick(path);
                window.scrollTo(0, 0);
            }}
            style={{
                color: 'blue',
                cursor: 'pointer',
                fontSize: '1.5em',
            }}
        >
            {text}
        </span>
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
        <div>
            <button
                onClick={() => setVisible(!visible)}
            >
                {visible ? 'Hide Table of Contents' : 'Show Table of Contents'}
            </button>
        </div>
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
