import React from 'react';
import { PublicBookComp } from './Public';
import { Router } from '@reach/router';
import { BookPath } from 'booka-common';

function BookRoute(props: any) {
  const path = parsePath(props.bookPath);
  return <PublicBookComp bookName={props.bookId} path={path} />;
}
const App: React.FC = () => {
  return <Router>
    <BookRoute path='/book/:bookId' />
    <BookRoute path='/book/:bookId/:bookPath' />
  </Router>;
}

function parsePath(path: string | undefined): BookPath {
  if (!path) {
    return [];
  }
  const result = path.split('-')
    .map(pc => parseInt(pc, 10));
  return result.some(isNaN)
    ? []
    : result;
}

export default App;
