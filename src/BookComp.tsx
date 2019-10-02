import * as React from 'react';
import { Book, fragmentForPath, BookPath } from 'booka-common';
import { BookFragmentComp } from './reader';

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
        <PathLink
            path={fragment.previous}
            text='Previous'
            onClick={setPath}
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
            onClick={setPath}
        />
    </div>;
}

type PathLinkProps = {
    path?: BookPath,
    onClick: (path: BookPath) => void,
    text: string,
};
function PathLink({ path, onClick, text }: PathLinkProps) {
    return path === undefined
        ? null
        : <button
            onClick={() => {
                onClick(path);
                window.scrollTo(0, 0);
            }}
            style={{
                margin: '1em',
                fontSize: '2em',
            }}
        >
            {text}
        </button>
}
