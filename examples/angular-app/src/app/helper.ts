import Web3 from 'web3';
import Torus from '@toruslabs/torus-embed';

declare const window: any

const web3Obj = {
	web3: new Web3(),
	setweb3(provider) {
		const web3Inst = new Web3(provider);
		web3Obj.web3 = web3Inst;
		sessionStorage.setItem('pageUsingTorus', 'true');
	},
	async initialize() {
		const torus = new Torus({ buttonPosition: 'top-left' });
		await torus.init({ showTorusButton: true });
		await torus.login({ verifier: 'google' });
		web3Obj.setweb3(torus.provider);
		window.torus = torus
	}
};
export default web3Obj;
