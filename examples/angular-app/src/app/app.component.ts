import { Component } from '@angular/core';
import web3Obj from './helper';

declare const window: any;

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	title = 'angular-app';
	address: string;
	balance: string;

	async setStateInfo() {
		let accounts = await web3Obj.web3.eth.getAccounts()
		let balance = await web3Obj.web3.eth.getBalance(accounts[0]);
		this.address = accounts[0];
		this.balance = balance;
	}

	async startTorus(event: any) {
		event.preventDefault();
		try {
			await web3Obj.initialize()
			this.setStateInfo()
		} catch (error) {
			console.error(error)
		}
	}

	async createPaymentTx() {
		await window.torus
			.initiateTopup('moonpay', {
				selectedCurrency: 'USD'
			})
			.finally(console.log)
	}

	async changeProvider() {
		await window.torus
			.setProvider({ host: 'ropsten' })
			.finally(console.log)
	}

	async getUserInfo() {
		await window.torus
			.getUserInfo()
			.finally(console.log)

	}

	// async sendEth() {
	// 	console.log(window.torus.web3)
	// 	await window.torus.web3.eth.sendTransaction({ from: this.address, to: this.address, value: window.torus.web3.toWei('0.01') })
	// }

	async sendDai() {

	}

	async logout() {
		await window.torus.logout().then(() => (this.address = '', this.balance = ''))
	}

	async signMessage() {
		// hex message
		const message = '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'
		window.torus.web3.currentProvider.send(
			{
				method: 'eth_sign',
				params: [window.torus.web3.eth.accounts[0], message],
				from: window.torus.web3.eth.accounts[0]
			},
			function (err, result) {
				if (err) {
					return console.error(err)
				}
				console.log('sign message => true \n', result)
			}
		)
	}

	async signTypedData_v1() {
		const typedData = [
			{
				type: 'string',
				name: 'message',
				value: 'Hi, Alice!'
			},
			{
				type: 'uint8',
				name: 'value',
				value: 10
			}
		]
		window.torus.web3.currentProvider.send(
			{
				method: 'eth_signTypedData',
				params: [typedData, window.torus.web3.eth.accounts[0]],
				from: window.torus.web3.eth.accounts[0]
			},
			function (err, result) {
				if (err) {
					return console.error(err)
				}
				console.log('sign typed message v1 => true \n', result)
			}
		)
	}

	signTypedData_v3() {
		const typedData = {
			types: {
				EIP712Domain: [
					{ name: 'name', type: 'string' },
					{ name: 'version', type: 'string' },
					{ name: 'chainId', type: 'uint256' },
					{ name: 'verifyingContract', type: 'address' }
				],
				Person: [
					{ name: 'name', type: 'string' },
					{ name: 'wallet', type: 'address' }
				],
				Mail: [
					{ name: 'from', type: 'Person' },
					{ name: 'to', type: 'Person' },
					{ name: 'contents', type: 'string' }
				]
			},
			primaryType: 'Mail',
			domain: {
				name: 'Ether Mail',
				version: '1',
				chainId: 4,
				verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
			},
			message: {
				from: {
					name: 'Cow',
					wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
				},
				to: {
					name: 'Bob',
					wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
				},
				contents: 'Hello, Bob!'
			}
		}
		window.torus.web3.currentProvider.send(
			{
				method: 'eth_signTypedData_v3',
				params: [window.torus.web3.eth.accounts[0], JSON.stringify(typedData)],
				from: window.torus.web3.eth.accounts[0]
			},
			function (err, result) {
				if (err) {
					return console.error(err)
				}
				console.log('sign typed message v3 => true \n', result)
			}
		)
	}

	signTypedData_v4() {
		const typedData = {
			types: {
				EIP712Domain: [
					{ name: 'name', type: 'string' },
					{ name: 'version', type: 'string' },
					{ name: 'chainId', type: 'uint256' },
					{ name: 'verifyingContract', type: 'address' }
				],
				Person: [
					{ name: 'name', type: 'string' },
					{ name: 'wallets', type: 'address[]' }
				],
				Mail: [
					{ name: 'from', type: 'Person' },
					{ name: 'to', type: 'Person[]' },
					{ name: 'contents', type: 'string' }
				],
				Group: [
					{ name: 'name', type: 'string' },
					{ name: 'members', type: 'Person[]' }
				]
			},
			domain: {
				name: 'Ether Mail',
				version: '1',
				chainId: 4,
				verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
			},
			primaryType: 'Mail',
			message: {
				from: {
					name: 'Cow',
					wallets: ['0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826', '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF']
				},
				to: [
					{
						name: 'Bob',
						wallets: [
							'0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
							'0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
							'0xB0B0b0b0b0b0B000000000000000000000000000'
						]
					}
				],
				contents: 'Hello, Bob!'
			}
		}
		window.torus.web3.currentProvider.send(
			{
				method: 'eth_signTypedData_v4',
				params: [window.torus.web3.eth.accounts[0], JSON.stringify(typedData)],
				from: window.torus.web3.eth.accounts[0]
			},
			function (err, result) {
				if (err) {
					return console.error(err)
				}
				console.log('sign typed message v4 => true \n', result)
			}
		)
	}

}
