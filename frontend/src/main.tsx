import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const createBgLayer = () => {
  const theme = localStorage.getItem('theme') || 'dark';
  const src = theme === 'light'
    ? new URL('./shared/assets/bgWhite.png', import.meta.url).href
    : new URL('./shared/assets/bgBlack.png', import.meta.url).href;

  const div = document.createElement('div');
  div.className = 'bg-layer';
  div.style.backgroundImage = `url(${src})`;
  document.body.prepend(div);

  const img = new Image();
  img.onload = () => div.classList.add('bg-layer--loaded');
  img.src = src;

  return div;
};

const bgLayer = createBgLayer();
export { bgLayer };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
