/// <reference types="./svg.d.ts" />

/// <reference types="vite/client" />

import Web3 from 'web3';


interface Window {
    ethereum?: import('ethers').Eip1193Provider;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Telegram: any | undefined;
    web3: Web3;
}