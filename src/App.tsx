import React from 'react';
import { PublicBookComp } from './Public';
import { Router } from '@reach/router';

function BookRoute(props: any) {
  return <PublicBookComp bookName={props.bookId} />;
}
const App: React.FC = () => {
  return <Router>
    <BookRoute path='/book/:bookId' />
  </Router>;
}

export default App;
