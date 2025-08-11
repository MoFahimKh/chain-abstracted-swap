import { Address, createWalletClient, custom, Hash } from "viem";
import type { ConnectedWallet } from "@privy-io/react-auth";
import type { ChainOperation, Quote } from "@/lib/types/quote";

type Eip712TypedData = {
  domain: { chainId: number; [k: string]: any };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, any>;
};

export const signTypedDataWithPrivy =
  (embeddedWallet: ConnectedWallet) =>
  async (typedData: Eip712TypedData): Promise<Hash> => {
    const provider = await embeddedWallet.getEthereumProvider();
    const walletClient = createWalletClient({
      transport: custom(provider),
      account: embeddedWallet.address as Address,
    });
    return walletClient.signTypedData(typedData as any);
  };

async function ensureChain(provider: any, targetChainIdDec: number) {
  const hex = "0x" + targetChainIdDec.toString(16);
  const current = await provider.request({ method: "eth_chainId" });
  if (current !== hex) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hex }],
      });
    } catch (e) {
      throw new Error(`Please switch network to chainId ${targetChainIdDec}.`);
    }
  }
}

export const signOperation =
  (embeddedWallet: ConnectedWallet) =>
  (operation: ChainOperation): (() => Promise<ChainOperation>) =>
  async () => {
    const provider = await embeddedWallet.getEthereumProvider();
    const requiredChainId = operation?.typedDataToSign?.domain?.chainId;
    if (typeof requiredChainId !== "number") {
      throw new Error("typedDataToSign.domain.chainId is missing.");
    }
    await ensureChain(provider, requiredChainId);
    const signature = await signTypedDataWithPrivy(embeddedWallet)(
      operation.typedDataToSign as Eip712TypedData
    );
    return {
      ...operation,
      userOp: {
        ...operation.userOp,
        signature,
      },
    };
  };

export const signQuote = async (
  quote: Quote,
  embeddedWallet: ConnectedWallet
) => {
  const signWithEmbeddedWallet = signOperation(embeddedWallet);
  const signedQuote: any = { ...quote };
  if (quote.originChainsOperations) {
    signedQuote.originChainsOperations = await sequentialPromises(
      quote.originChainsOperations.map(signWithEmbeddedWallet)
    );
  }
  if (quote.destinationChainOperation) {
    signedQuote.destinationChainOperation = await signWithEmbeddedWallet(
      quote.destinationChainOperation
    )();
  }
  return signedQuote;
};

export const sequentialPromises = (
  factories: Array<() => Promise<any>>
): Promise<any[]> =>
  factories.reduce<Promise<any[]>>(
    (acc, next) => acc.then((arr) => next().then((val) => [...arr, val])),
    Promise.resolve([])
  );
