import React from 'react';
import { BookComp } from './BookComp';
import { simple } from './bookExample';

const App: React.FC = () => {
  return <BookComp book={simple} />;
}

export default App;
