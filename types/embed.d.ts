import Web3 from 'web3'

/**
 * Torus class
 */
declare class Torus {
  /**
   * Creates a new instance of Torus class
   * @param args Constructor arguments used to initialize torus constructor
   */
  constructor(args: TorusCtorArgs);
  /**
   * web3 0.20.7 instance. {@link https://github.com/ethereum/wiki/wiki/JavaScript-API | Documentation}
   */
  web3: Web3;
  /**
   * Ethereum provider instance
   */
  provider: Provider;
  /**
   * Proxy for Ethereum provider instance
   */
  ethereum: Provider;
  /**
   * Gets the public address associated with a verifier & veriferId
   * @param verifierArgs Args of a verifer
   */
  getPublicAddress(verifierArgs: VerifierArgs): Promise<string | TorusPublicKey>;
  /**
   * Changes the current network to the specified one. Opens a popup requesting user confirmation
   * @param networkParams Params used to initialize a network
   */
  setProvider(networkParams: NetworkInterface): Promise<void>;
  /**
   * Opens a popup showing torus wallet 
   * @param path path of torus website to show
   * @param params Additional query params to add to url
   */
  showWallet(path: 'transfer' | 'topup' | 'home' | 'settings' | 'history', params?: object): void;
  /**
   * Exposes the topup api of torus
   * 
   * Allows the dapp to trigger a payment method directly
   * 
   * If no params are provided, it defaults to { selectedAddress? = 'TORUS' fiatValue = MIN_FOR_PROVIDER;
   * selectedCurrency? = 'USD'; selectedCryptoCurrency? = 'ETH'; }
   * 
   * Initiates the topup flow of torus for the provider. Opens a popup of the specified provider
   * @param provider Name of the provider
   * @param params Optional params to pre-fill in provider's site
   */
  initiateTopup(provider: 'moonpay' | 'wyre' | 'rampnetwork' | 'xanpool', params?: PaymentParams): Promise<boolean>;
  /**
   * Shows Torus widget
   */
  showTorusButton(): void;
  /**
   * Hides torus widget
   */
  hideTorusButton(): void;
  /**
   * Gets the user info. Opens a popup requesting user confirmation (once per session)
   * @param message 
   */
  getUserInfo(message: string): Promise<UserInfo>;
  /**
   * Initializes torus client. To be called first before any other methods
   * @param params Optional params for initialization
   */
  init(params: TorusParams): Promise<void>;
  /**
   * Logs the user in. Helper for ethereum.enable or provider.enable
   * @param params Additional params to be passed in for logging in
   */
  login(params: LoginParams): Promise<string[]>;
  /**
   * Logs the user out of torus. Prefer cleanUp
   */
  logout(): Promise<void>;
  /**
   * Logs the user out first. Cleans up torus iframe and other assets. Removes torus instance completely
   */
  cleanUp(): Promise<void>;
}

export as namespace Torus;

export = Torus;


declare class Provider {
  send(payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>): any;
}

interface TorusPublicKey extends TorusNodePub {
  /**
   * Ethereum Public Address
   */
  address: String;
}

interface TorusNodePub {
  /**
   * X component of a Public Key
   */
  X: String;
  /**
   * Y component of a Public Key
   */
  Y: String;
}

interface PaymentParams {
  /**
   * Address to send the funds to 
   */
  selectedAddress?: string;
  /**
   * Default fiat currency for the user to make the payment in
   */
  selectedCurrency?: string;
  /**
   * Amount to buy in the selectedCurrency
   */
  fiatValue?: Number;
  /**
   * Cryptocurrency to buy
   */
  selectedCryptoCurrency?: string;
}

interface VerifierArgs {
  /**
   * Verifier Enum
   */
  verifier: 'google' | 'reddit' | 'discord';
  /**
   * email for google
   * 
   * username for reddit
   * 
   * id for discord
   */
  verifierId: string;
  /**
   * If true, returns {@link TorusPublicKey}, else returns string
   */
  isExtended?: Boolean;
}

interface LoginParams {
  verifier?: 'google' | 'facebook' | 'twitch' | 'reddit' | 'discord';
}

interface TorusCtorArgs {
  /**
   * Determines where the torus widget is visible on the page.
   * Defaults to `bottom-left`
   */
  buttonPosition?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
}

interface UserInfo {
  /**
   * Email of the logged in user
   */
  email: string;
  /**
   * Full name of the logged in user
   */
  name: string;
  /**
   * Profile image of the logged in user
   */
  profileImage: string;
  /**
   * verifier of the logged in user (google, facebook etc)
   */
  verifier: string;
  /**
   * Verifier Id of the logged in user
   * 
   * email for google,
   * id for facebook,
   * username for reddit,
   * id for twitch,
   * id for discord
   */
  verifierId: string;
}

interface TorusParams {
  /**
   * Torus Network Object
   */
  network?: NetworkInterface;
  /**
   * Build Environment of Torus.
   * 
   * production uses https://app.tor.us,
   * 
   * development uses https://localhost:3000 (expects torus-website to be run locally),
   * 
   * staging uses https://staging.tor.us,
   * 
   * testing uses https://testing.tor.us (latest internal build)
   * @default production
   */
  buildEnv?: 'production' | 'development' | 'staging' | 'testing';
  /**
   * Enables or disables logging.
   * 
   * Defaults to false in prod and true in other environments
   */
  enableLogging?: boolean;
  /**
   * whether to show/hide torus widget.
   * 
   * Defaults to true
   * @default true
   */
  showTorusButton?: boolean;
  /**
   * setting false, hides those verifiers from login modal
   */
  enabledVerifiers?: VerifierStatus;
  /**
   * Params to enable integrity checks and load specific versions of torus-website
   */
  integrity?: IntegrityParams;
  /**
   * Params to enable whitelabelling of torus website and widget
   */
  whiteLabel?: WhiteLabelParams;
}

interface WhiteLabelParams {
  /**
   * Whitelabel theme
   */
  theme: ThemeParams;
  /**
   * Language of whitelabel.
   * 
   * order of preference: Whitelabel language > user language (in torus-website) > browser language
   */
  defaultLanguage: string;
  /**
   * Logo Url to be used in light mode (dark logo)
   */
  logoDark: string;
  /**
   * Logo Url to be used in dark mode (light logo)
   */
  logoLight: string;
  /**
   * Shows/hides topup option in torus-website/widget.
   * Defaults to false
   * @default false
   */
  topupHide: boolean;
  /**
   * Shows/hides billboard in torus-website.
   * Defaults to false
   * @default false
   */
  featuredBillboardHide: boolean;
  /**
   * Language specific link for terms and conditions on torus-website. See (examples/vue-app) to configure
   */
  tncLink: any;
  /**
   * Custom translations. See (examples/vue-app) to configure
   */
  customTranslations: any;
}

interface ThemeParams {
  /**
   * If true, enables dark mode
   * Defaults to false
   * @default false
   */
  isDark: boolean;
  /**
   * Colors object to customize colors in torus theme.
   * 
   * Contact us for whitelabel. Example provided in `examples/vue-app`
   */
  colors: any;
}

interface IntegrityParams {
  /**
   * Whether to check for integrity.
   * Defaults to false
   * @default false
   */
  check: boolean;
  /**
   * if check is true, hash must be provided. The SRI sha-384 integrity hash
   * {@link https://www.srihash.org/ | SRI Hash}
   */
  hash?: string;
  /** 
   * Version of torus-website to load
   */
  version?: string;
}

interface VerifierStatus {
  /**
   * Defaults to true
   * @default true
   */
  google?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  facebook?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  reddit?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  twitch?: boolean;
  /**
   * Defaults to true
   * @default true
   */
  discord?: boolean;
}

interface NetworkInterface {
  /**
   * If any network other than the ones in enum, it should a JSON RPC URL
   */
  host: 'mainnet' | 'rinkeby' | 'ropsten' | 'kovan' | 'goerli' | 'localhost' | 'matic' | string,
  /**
   * chainId for the network. If not provided, we query the host
   */
  chainId?: number;
  /**
   * Name of the network
   */
  networkName?: string;
}

interface JsonRPCResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: string;
}

interface JsonRPCRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

interface Callback<ResultType> {
  (error: Error): void;
  (error: null, val: ResultType): void;
}