const React = require('react');
const PropTypes = require('prop-types');
const isEmpty = require('lodash/isEmpty');
const AccountUnavailable = require('./AccountUnavailable');
const Web3Unavailable = require('./Web3Unavailable');
// TODO Change to web3 1.0.0
const Web3 = require('web3/src');

const ONE_SECOND = 1000;
const propTypes = {
  web3UnavailableScreen: PropTypes.any,
  accountUnavailableScreen: PropTypes.any,
  onChangeAccount: PropTypes.func
};

const defaultProps = {
  passive: false,
  web3UnavailableScreen: Web3Unavailable,
  accountUnavailableScreen: AccountUnavailable
};

const childContextTypes = {
  web3Utils: PropTypes.shape({
    selectedAccount: PropTypes.string,
    network: PropTypes.string,
    networkId: PropTypes.Number
  })
};

class Web3Provider extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      networkId: null,
      networkError: null,
      accounts: []
    };
    this.interval = null;
    this.networkInterval = null;
    this.fetchAccounts = this.fetchAccounts.bind(this);
    this.fetchNetwork = this.fetchNetwork.bind(this);
  }

  getChildContext() {
    return {
      web3Utils: {
        selectedAccount: this.state.accounts[0],
        network: getNetwork(this.state.networkId),
        networkId: this.state.networkId
      }
    };
  }

  /**
   * Start polling accounts, & network. We poll indefinitely so that we can
   * react to the user changing accounts or netowrks.
   */
  componentWillMount() {
    if (window.web3 !== undefined) {
      window.web3js = new Web3(Web3.givenProvider || "ws://localhost:8546");
      console.log(window.web3, window.web3js);
    }
    else
      this.setState({web3: undefined});
  }
  componentDidMount() {
    this.fetchAccounts();
    this.fetchNetwork();
    this.initPoll();
    this.initNetworkPoll();
  }

  /**
   * Init web3/account polling, and prevent duplicate interval.
   * @return {void}
   */
  initPoll() {
    if (!this.interval) {
      this.interval = setInterval(this.fetchAccounts, ONE_SECOND);
    }
  }

  /**
   * Init network polling, and prevent duplicate intervals.
   * @return {void}
   */
  initNetworkPoll() {
    if (!this.networkInterval) {
      this.networkInterval = setInterval(this.fetchNetwork, ONE_SECOND);
    }
  }

  /**
   * Update state regarding the availability of web3 and an ETH account.
   * @return {void}
   */
  async fetchAccounts() {
    const ethAccounts = await this.getAccounts();
    if (isEmpty(ethAccounts)) {
      this.setState({
        accountsError: 'No account available'
      });
    }
    else {
      this.handleAccounts(ethAccounts);
    }
  }

  handleAccounts(accounts, isConstructor = false) {
    const { onChangeAccount } = this.props;
    let next = accounts[0];

    let curr = this.state.accounts[0];
    next = next && next.toLowerCase();
    curr = curr && curr.toLowerCase();
    const didChange = curr && next && (curr !== next);
    if (!isConstructor && (didChange || didChange === undefined)) {
      this.setState({
        accountsError: null,
        accounts
      });
    }
    
    // If provided, execute callback
    if (didChange) {
      console.log(next, curr);
      this.setState({
        selectedAccount: next
      });
      console.log("Changing account to:", next);
      onChangeAccount(next);
    }
  }

  /**
   * Get the network and update state accordingly.
   * @return {void}
   */
  fetchNetwork() {
    window.web3js.eth.net.getId()
    .then(netId => {
      if (this.state.networkId != netId) {
        this.setState({
          networkError: null,
          networkId: netId
        })
      }
    });
  }

  /**
   * Get the account. We wrap in try/catch because reading `web3.eth.accounrs`
   * will throw if no account is selected.
   * @return {String}
   */
  getAccounts() {
    return new Promise((resolve, reject) => {
      window.web3.eth.getAccounts((err, accounts) => {
        if (err)
          reject(err);
        else
          resolve(accounts);
      });
    });
  }

  render() {
    const {
      web3UnavailableScreen: Web3UnavailableComponent,
      // accountUnavailableScreen: AccountUnavailableComponent
    } = this.props;

    if (!window.web3 || !this.state.networkId) {
      return <Web3UnavailableComponent />;
    }

    // if (isEmpty(this.state.accounts)) {
    //   return <AccountUnavailableComponent />;
    // }

    return this.props.children;
  }
}

Web3Provider.propTypes = propTypes;
Web3Provider.defaultProps = defaultProps;
Web3Provider.childContextTypes = childContextTypes;

module.exports = Web3Provider;

/* =============================================================================
=    Deps
============================================================================= */
function getNetwork(networkId) {
  switch (networkId) {
    case 1:
      return 'MAINNET';
    case 2:
      return 'MORDEN';
    case 3:
      return 'ROPSTEN';
    case 42:
      return 'KOVAN';
    default:
      return 'UNKNOWN';
  }
}
