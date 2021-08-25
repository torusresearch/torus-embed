import NodeDetailManager from "@toruslabs/fetch-node-details";
import TorusJs from "@toruslabs/torus.js";
import TorusInpageProvider from "./inpage-provider";
import { BUTTON_POSITION_TYPE, EMBED_TRANSLATION_ITEM, PAYMENT_PROVIDER_TYPE, PaymentParams, TorusCtorArgs, TorusParams, TorusPublicKey, UserInfo, VerifierArgs, WALLET_PATH, WhiteLabelParams } from "./interfaces";
import ExtendedObjectMultiplex from "./ObjectMultiplex";
declare class Torus {
    buttonPosition: BUTTON_POSITION_TYPE;
    torusUrl: string;
    torusIframe: HTMLIFrameElement;
    styleLink: HTMLLinkElement;
    isLoggedIn: boolean;
    isInitialized: boolean;
    torusWidgetVisibility: boolean;
    torusAlert: HTMLDivElement;
    nodeDetailManager: NodeDetailManager;
    torusJs: TorusJs;
    apiKey: string;
    modalZIndex: number;
    alertZIndex: number;
    torusAlertContainer: HTMLDivElement;
    isIframeFullScreen: boolean;
    whiteLabel: WhiteLabelParams;
    requestedVerifier: string;
    currentVerifier: string;
    embedTranslations: EMBED_TRANSLATION_ITEM;
    ethereum: TorusInpageProvider;
    provider: TorusInpageProvider;
    communicationMux: ExtendedObjectMultiplex;
    isLoginCallback: () => void;
    dappStorageKey: string;
    constructor({ buttonPosition, modalZIndex, apiKey }?: TorusCtorArgs);
    init({ buildEnv, enableLogging, enabledVerifiers, network, loginConfig, showTorusButton, integrity, whiteLabel, skipTKey, useLocalStorage, }?: TorusParams): Promise<void>;
    login({ verifier }?: {
        verifier?: string;
    }): Promise<string[]>;
    logout(): Promise<void>;
    cleanUp(): Promise<void>;
    clearInit(): void;
    /** @ignore */
    _createPopupBlockAlert(preopenInstanceId: string, url: string): void;
    /** @ignore */
    _sendWidgetVisibilityStatus(status: boolean): void;
    hideTorusButton(): void;
    showTorusButton(): void;
    /** @ignore */
    _displayIframe(isFull?: boolean): void;
    /** @ignore */
    _setupWeb3(): void;
    /** @ignore */
    _showLoginPopup(calledFromEmbed: boolean, resolve: (a: string[]) => void, reject: (err: Error) => void): void;
    setProvider({ host, chainId, networkName, ...rest }?: {
        host?: string;
        chainId?: any;
        networkName?: string;
    }): Promise<void>;
    /** @ignore */
    _setProvider({ host, chainId, networkName, ...rest }?: {
        host?: string;
        chainId?: any;
        networkName?: string;
    }): Promise<void>;
    showWallet(path: WALLET_PATH, params?: Record<string, string>): void;
    getPublicAddress({ verifier, verifierId, isExtended }: VerifierArgs): Promise<string | TorusPublicKey>;
    getUserInfo(message: string): Promise<UserInfo>;
    /** @ignore */
    _handleWindow(preopenInstanceId: string, { url, target, features }?: {
        url?: string;
        target?: string;
        features?: string;
    }): void;
    paymentProviders: {
        rampnetwork: import("./interfaces").IPaymentProvider;
        moonpay: import("./interfaces").IPaymentProvider;
        wyre: import("./interfaces").IPaymentProvider;
        xanpool: import("./interfaces").IPaymentProvider;
        mercuryo: import("./interfaces").IPaymentProvider;
    };
    initiateTopup(provider: PAYMENT_PROVIDER_TYPE, params: PaymentParams): Promise<boolean>;
    /** @ignore */
    _setEmbedWhiteLabel(element: HTMLElement): void;
    /** @ignore */
    _getLogoUrl(): string;
}
export default Torus;
