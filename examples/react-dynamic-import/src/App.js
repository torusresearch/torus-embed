import React from "react";
import web3Obj from "./helper";
import Web3 from "web3";

class App extends React.Component {
  state = {
    account: "",
    balance: ""
  };

  componentDidMount() {
    if (window.web3) {
      web3Obj.web3.eth.getAccounts().then(accounts => {
        this.setState({ account: accounts[0] });
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.account && this.state.account !== "" && prevState.account !== this.state.account) {
      web3Obj.web3.eth.getBalance(this.state.account).then(balance => {
        this.setState({ balance: web3Obj.web3.utils.fromWei(balance) });
      });
    }
  }

  enableTorus = () => {
    const web3Inst = new Web3(window.web3.currentProvider || "ws://localhost:8546", null, {});
    web3Obj.web3 = web3Inst;
    window.ethereum.enable().then(accounts => {
      this.setState({ account: accounts[0] });
    });
  };

  importTorus = () => {
    import("@toruslabs/torus-embed/src/embed.js").then(this.enableTorus);
  };

  render() {
    return (
      <div className="App">
        <div>
          <button onClick={this.importTorus}>Start using Torus</button>
        </div>
        <div>
          {/* <button onClick={this.enableTorus}>Enable Torus</button> */}
          <div>Account: {this.state.account}</div>
          <div>Balance: {this.state.balance}</div>
        </div>
      </div>
    );
  }
}

export default App;
