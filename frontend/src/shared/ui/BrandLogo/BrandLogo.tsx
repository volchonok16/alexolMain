import { Logo3D } from '../Logo3D';
import './BrandLogo.scss';

export const BrandLogo = () => (
  <div className="brand-logo">
    <div className="brand-logo__mark" aria-hidden="true">
      <Logo3D />
    </div>
    <svg
      className="brand-logo__wordmark"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 322 80"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M40,0 L80,80 L66,80 L56,60 L24,60 L14,80 L0,80 L40,0 Z M40,24 L30,48 L50,48 Z" />
      <path d="M90,0 L104,0 L104,80 L90,80 Z" />
      <path d="M156,54 L128,54 C128.50,61 133,67 142,67 C148,67 153,64 155,59 L168,61 C165,70 155,79 142,79 C125,79 114,66 114,54 C114,41 125,28 141,28 C158,28 168,41 168,54 L168,54 Z M155,46 C154,39 149,37 141,37 C133,37 129,40 128,46 L155,46 Z" />
      <path d="M176,29 L192,29 L204,47 L216,29 L232,29 L212,54 L233,80 L217,80 L204,61 L191,80 L175,80 L196,54 Z" />
      <path d="M266,28 C283,28 294,41 294,54 C294,67 283,80 266,80 C249,80 238,67 238,54 C238,41 249,28 266,28 Z M266,39 C257,39 252,45 252,54 C252,63 257,69 266,69 C275,69 280,63 280,54 C280,45 275,39 266,39 Z" />
      <path d="M312,0 L318,0 L318,80 L312,80 Z" />
    </svg>
  </div>
);
