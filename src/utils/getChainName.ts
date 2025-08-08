export const getChainName = (chainId: string): string => {
  const chainMap: Record<string, string> = {
    "1": "Ethereum",
    "137": "Polygon",
    "42161": "Arbitrum",
    "10": "Optimism",
    "8453": "Base",
    "59144": "Linea",
    "43114": "Avalanche",
    "11155111": "Sepolia Testnet",
  };

  return chainMap[chainId] || `Chain ${chainId}`;
};
