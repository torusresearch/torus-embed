import Torus, { TorusInpageProvider } from '@toruslabs/torus-embed';
import Web3 from 'web3';
import { AbstractProvider } from 'web3-core';

type Web3Object = {
    web3: Web3;
    torus: Torus;
    setweb3: (provider: TorusInpageProvider) => void;
};
const web3Obj: Web3Object = {
    web3: new Web3(),
    torus: new Torus({}),
    setweb3(provider): void {
        web3Obj.web3.setProvider(provider as AbstractProvider);
    },
};

export default web3Obj;
