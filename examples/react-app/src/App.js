import React from "react";
import web3 from "./helper";

class App extends React.Component {
  state = {
    account: "",
    balance: ""
  };

  componentDidMount() {
    web3.eth.getAccounts().then(accounts => {
      this.setState({ account: accounts[0] });
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.account !== this.state.account) {
      web3.eth.getBalance(this.state.account).then(balance => {
        this.setState({ balance: web3.utils.fromWei(balance) });
      });
    }
  }

  enableTorus = () => {
    window.ethereum.enable().then(accounts => {
      this.setState({ account: accounts[0] });
    });
  };

  render() {
    return (
      <div className="App">
        <button onClick={this.enableTorus}>Enable Torus</button>

        <div>Account: {this.state.account}</div>
        <div>Balance: {this.state.balance}</div>
      </div>
    );
  }
}

export default App;
