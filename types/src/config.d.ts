import { EMBED_TRANSLATION_ITEM, IPaymentProvider, LocaleLinks } from "./interfaces";
declare const _default: {
    supportedVerifierList: ("google" | "reddit" | "discord")[];
    paymentProviders: {
        rampnetwork: IPaymentProvider;
        moonpay: IPaymentProvider;
        wyre: IPaymentProvider;
        xanpool: IPaymentProvider;
        mercuryo: IPaymentProvider;
        transak: IPaymentProvider;
    };
    api: string;
    translations: LocaleLinks<{
        embed: EMBED_TRANSLATION_ITEM;
    }>;
    prodTorusUrl: string;
    localStorageKey: string;
};
export default _default;
