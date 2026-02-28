import { ethers } from 'ethers';
import type { TokenCreationDetails, NFTMintingDetails, TransactionDetails } from './geminiAI';
import { PriceService } from './priceService';

// Smart Contract ABIs (optimized versions)
const OPTIMIZED_TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, uint96 totalSupply, uint8 decimals) external returns (address)",
  "function getCreatedTokens(address creator) external view returns (address[])",
  "function getTotalTokensCount() external view returns (uint256)"
];

// OptimizedNFTFactory ABI - Matches the deployed contract on opBNB
const OPTIMIZED_NFT_FACTORY_ABI = [
  "function mintNFT(address to, string calldata uri, string calldata name, string calldata description) external returns (uint256)",
  "function batchMintNFT(address[] calldata recipients, string[] calldata tokenURIs, string[] calldata names, string[] calldata descriptions) external returns (uint256[])",
  "function getCreatorNFTs(address creator) external view returns (uint256[])",
  "function getNFTInfo(uint256 tokenId) external view returns (tuple(address creator, uint96 timestamp, string name, string description, string tokenURI))",
  "function totalSupply() external view returns (uint256)",
  "function exists(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)"
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  contractAddress?: string;
  tokenId?: string;
  explorerUrl?: string;
}

export class BlockchainService {
  private static getContractAddresses() {
    return {
      tokenFactory: import.meta.env.VITE_TOKEN_FACTORY_CONTRACT,
      nftFactory: import.meta.env.VITE_NFT_FACTORY_CONTRACT,
      paymentContract: import.meta.env.VITE_PAYMENT_CONTRACT,
    };
  }

  private static getProvider(): ethers.JsonRpcProvider {
    const rpcUrl = import.meta.env.VITE_OPBNB_RPC_URL || 'https://opbnb-mainnet-rpc.bnbchain.org';
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  private static getExplorerUrl(hash: string): string {
    const explorer = import.meta.env.VITE_OPBNB_EXPLORER || 'https://opbnbscan.com';
    return `${explorer}/tx/${hash}`;
  }

  // Create BEP-20 Token
  static async createToken(
    tokenDetails: TokenCreationDetails,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      console.log('Creating token:', tokenDetails);
      
      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const addresses = this.getContractAddresses();

      if (!addresses.tokenFactory) {
        throw new Error('Token factory contract address not configured');
      }

      const contract = new ethers.Contract(addresses.tokenFactory, OPTIMIZED_TOKEN_FACTORY_ABI, wallet);

      // Convert totalSupply to uint96 format for optimized contract
      const totalSupplyValue = tokenDetails.totalSupply || '1000000';
      // Remove artificial limit - let users create any supply amount they want
      const uint96TotalSupply = Number(totalSupplyValue);

      const tx = await contract.createToken(
        tokenDetails.name,
        tokenDetails.symbol,
        uint96TotalSupply, // Use uint96 instead of full uint256
        parseInt(tokenDetails.decimals || '18')
      );

      console.log('Token creation transaction sent:', tx.hash);
      const receipt = await tx.wait();

      return {
        success: true,
        hash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash),
        contractAddress: receipt.logs[0]?.address // Token contract address from logs
      };
    } catch (error) {
      console.error('Token creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token creation failed'
      };
    }
  }

  // Mint NFT
  static async mintNFT(
    nftDetails: NFTMintingDetails,
    recipientAddress: string,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      console.log('Minting NFT:', nftDetails);
      console.log('Recipient:', recipientAddress);
      
      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const addresses = this.getContractAddresses();

      if (!addresses.nftFactory) {
        throw new Error('NFT factory contract address not configured');
      }

      console.log('Using NFT Factory address:', addresses.nftFactory);

      // Check if contract exists at address
      const contractCode = await provider.getCode(addresses.nftFactory);
      console.log('Contract code length:', contractCode.length);
      if (contractCode === '0x') {
        throw new Error(`No contract found at address ${addresses.nftFactory}. Contract may not be deployed.`);
      }

      const contract = new ethers.Contract(addresses.nftFactory, OPTIMIZED_NFT_FACTORY_ABI, wallet);

      // Try to call a view function to verify the contract interface
      try {
        console.log('Verifying contract interface by calling totalSupply...');
        const totalNFTs = await contract.totalSupply();
        console.log('Contract verification successful. Total NFTs:', totalNFTs.toString());
        
        // Additional contract diagnostics
        try {
          const owner = await contract.owner();
          console.log('Contract owner:', owner);
          console.log('Your wallet:', wallet.address);
          console.log('Are you the owner?', owner.toLowerCase() === wallet.address.toLowerCase());
        } catch {
          console.log('Could not get contract owner (function may not exist)');
        }
        
      } catch (interfaceError) {
        console.error('Contract interface verification failed:', interfaceError);
        throw new Error(`Contract at ${addresses.nftFactory} exists but doesn't have the expected interface. The contract may not be an NFT factory or may have a different ABI.`);
      }

      // Check wallet balance
      const balance = await provider.getBalance(wallet.address);
      console.log('Wallet balance:', ethers.formatEther(balance), 'BNB');
      
      // Check if we have enough for gas
      const minRequiredForGas = ethers.parseEther('0.0001'); // ~$0.09 at $900/BNB
      
      if (balance < minRequiredForGas) {
        throw new Error(`Insufficient BNB balance for gas fees. You have ${ethers.formatEther(balance)} BNB, need at least 0.0001 BNB (~$0.09).`);
      }

      // Validate metadata
      if (!nftDetails.name || nftDetails.name.trim() === '') {
        throw new Error('NFT name cannot be empty');
      }
      
      // Only accept IPFS/HTTP URLs - data URLs are too large for on-chain storage
      if (!nftDetails.imageUrl || !nftDetails.imageUrl.startsWith('http')) {
        throw new Error('Invalid image URL. Image must be uploaded to IPFS first. Data URLs are too large for on-chain storage.');
      }

      console.log('✅ Image URL validated (IPFS)');
      console.log('🎨 Minting to shared NFT collection...');
      console.log('Minter address:', wallet.address);
      console.log('Collection contract:', addresses.nftFactory);

      // Create metadata JSON
      const metadata = {
        name: nftDetails.name,
        description: nftDetails.description,
        image: nftDetails.imageUrl, // Lighthouse IPFS URL
        attributes: nftDetails.attributes || [],
        external_url: nftDetails.imageUrl
      };

      // Upload metadata JSON to IPFS so tokenURI is a short URL (not a huge base64 blob)
      console.log('📤 Uploading metadata JSON to IPFS...');
      const { LighthouseService } = await import('./lighthouseService');
      const metadataUpload = await LighthouseService.uploadJSON(metadata, `${nftDetails.name.replace(/\s+/g, '_')}_metadata.json`);
      
      let tokenURI: string;
      if (metadataUpload.success && metadataUpload.url) {
        tokenURI = metadataUpload.url;
        console.log('✅ Metadata uploaded to IPFS:', tokenURI);
      } else {
        // Fallback: base64 encode metadata (only safe because imageUrl is a short IPFS URL)
        console.log('⚠️ Metadata IPFS upload failed, using base64 fallback');
        const metadataJson = JSON.stringify(metadata);
        // Guard: if the base64 tokenURI would be too large (>5KB), reject
        if (metadataJson.length > 5000) {
          throw new Error('Metadata is too large for on-chain storage. Please ensure image was uploaded to IPFS successfully.');
        }
        tokenURI = `data:application/json;base64,${btoa(metadataJson)}`;
      }
      
      console.log('📝 NFT Metadata:', {
        name: nftDetails.name,
        description: nftDetails.description,
        imageUrl: nftDetails.imageUrl,
        tokenURILength: tokenURI.length
      });

      // Final safety check: tokenURI must be reasonable size for on-chain storage
      if (tokenURI.length > 10000) {
        throw new Error(`tokenURI is too large (${tokenURI.length} chars). This would cause gas estimation failure. Please ensure both image and metadata are uploaded to IPFS.`);
      }

      // Estimate gas for the mintNFT function on OptimizedNFTFactory
      let gasEstimate: bigint;
      
      try {
        console.log('⛽ Estimating gas for mintNFT...');
        gasEstimate = await contract.mintNFT.estimateGas(
          recipientAddress,
          tokenURI,
          nftDetails.name,
          nftDetails.description || ''
        );
        console.log('✅ Gas estimate for mintNFT():', gasEstimate.toString());
        
        if (recipientAddress.toLowerCase() !== wallet.address.toLowerCase()) {
          console.log('🎁 Gifting NFT to:', recipientAddress);
        }
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        throw new Error(`Failed to estimate gas for NFT minting: ${gasError instanceof Error ? gasError.message : 'Unknown error'}`);
      }

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * 120n / 100n;
      console.log('📊 Using gas limit:', gasLimit.toString());

      // Execute the minting transaction using mintNFT
      console.log('🚀 Calling mintNFT() function...');
      const tx = await contract.mintNFT(
        recipientAddress,
        tokenURI,
        nftDetails.name,
        nftDetails.description || '',
        { gasLimit }
      );

      console.log('✅ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      // Extract token ID from the Transfer event
      // ERC721 Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
      const transferEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('Transfer(address,address,uint256)')
      );
      
      let tokenId = '0';
      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('🎨 Minted NFT Token ID:', tokenId);
      }

      return {
        success: true,
        hash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash),
        tokenId: tokenId
      };
    } catch (error) {
      console.error('NFT minting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'NFT minting failed'
      };
    }
  }

  // Send BNB or Tokens
  static async sendTransaction(
    transactionDetails: TransactionDetails,
    privateKey: string
  ): Promise<TransactionResult> {
    try {
      console.log('🚀 Starting transaction:', transactionDetails);
      
      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);

      // Validate inputs
      if (!transactionDetails.recipient || !transactionDetails.amount) {
        throw new Error('Recipient and amount are required');
      }

      if (!ethers.isAddress(transactionDetails.recipient)) {
        throw new Error(`Invalid recipient address: ${transactionDetails.recipient}`);
      }

      const amount = transactionDetails.amount.toString();
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }

      // Check wallet balance
      const balance = await provider.getBalance(wallet.address);
      console.log('💰 Wallet balance:', ethers.formatEther(balance), 'BNB');

      let tx;
      
      if (transactionDetails.token === 'BNB' || !transactionDetails.token) {
        console.log('📤 Sending BNB transaction...');
        
        const valueToSend = ethers.parseEther(amount);
        const gasLimit = 21000n;
        const gasPrice = (await provider.getFeeData()).gasPrice || ethers.parseUnits('1', 'gwei');
        const gasCost = gasLimit * gasPrice;
        const totalCost = valueToSend + gasCost;
        
        console.log('💸 Transaction details:', {
          amount: ethers.formatEther(valueToSend) + ' BNB',
          gasCost: ethers.formatEther(gasCost) + ' BNB',
          totalCost: ethers.formatEther(totalCost) + ' BNB',
          walletBalance: ethers.formatEther(balance) + ' BNB'
        });

        if (balance < totalCost) {
          throw new Error(
            `Insufficient BNB balance. Need ${ethers.formatEther(totalCost)} BNB but only have ${ethers.formatEther(balance)} BNB. ` +
            `(Amount: ${ethers.formatEther(valueToSend)} + Gas: ${ethers.formatEther(gasCost)})`
          );
        }
        
        // Send BNB
        tx = await wallet.sendTransaction({
          to: transactionDetails.recipient,
          value: valueToSend,
          gasLimit: gasLimit
        });
        
        console.log('✅ BNB transaction sent:', tx.hash);
      } else {
        console.log('📤 Sending ERC-20 token transaction...');
        console.log('🪙 Token address:', transactionDetails.token);
        
        // Check if token address is valid
        if (!ethers.isAddress(transactionDetails.token)) {
          throw new Error(`Invalid token address: ${transactionDetails.token}`);
        }

        // Send ERC-20 Token
        const tokenContract = new ethers.Contract(transactionDetails.token, ERC20_ABI, wallet);
        
        try {
          // Get token info
          const [tokenName, tokenSymbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);
          
          console.log('🪙 Token info:', {
            name: tokenName,
            symbol: tokenSymbol,
            decimals: decimals.toString(),
            address: transactionDetails.token
          });
          
          // Check token balance
          const tokenBalance = await tokenContract.balanceOf(wallet.address);
          const amountToSend = ethers.parseUnits(amount, decimals);
          
          console.log('💰 Token balance:', ethers.formatUnits(tokenBalance, decimals), tokenSymbol);
          console.log('📤 Amount to send:', ethers.formatUnits(amountToSend, decimals), tokenSymbol);
          
          if (tokenBalance < amountToSend) {
            throw new Error(
              `Insufficient ${tokenSymbol} balance. Need ${ethers.formatUnits(amountToSend, decimals)} ${tokenSymbol} ` +
              `but only have ${ethers.formatUnits(tokenBalance, decimals)} ${tokenSymbol}.`
            );
          }
          
          // Check BNB balance for gas
          const estimatedGas = await tokenContract.transfer.estimateGas(transactionDetails.recipient, amountToSend);
          const gasPrice = (await provider.getFeeData()).gasPrice || ethers.parseUnits('1', 'gwei');
          const gasCost = estimatedGas * gasPrice;
          
          console.log('⛽ Gas estimate:', {
            gasLimit: estimatedGas.toString(),
            gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
            gasCost: ethers.formatEther(gasCost) + ' BNB'
          });
          
          if (balance < gasCost) {
            throw new Error(
              `Insufficient BNB for gas fees. Need ${ethers.formatEther(gasCost)} BNB for gas ` +
              `but only have ${ethers.formatEther(balance)} BNB.`
            );
          }
          
          tx = await tokenContract.transfer(transactionDetails.recipient, amountToSend, {
            gasLimit: estimatedGas * 120n / 100n // Add 20% buffer
          });
          
          console.log('✅ Token transaction sent:', tx.hash);
        } catch (tokenError) {
          console.error('Token transaction failed:', tokenError);
          throw new Error(`Token transaction failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
        }
      }

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        hash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash)
      };
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  // Get transaction status
  static async getTransactionStatus(hash: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    blockNumber?: number;
    gasUsed?: string;
  }> {
    try {
      const provider = this.getProvider();
      const receipt = await provider.getTransactionReceipt(hash);
      
      if (!receipt) {
        return { status: 'pending' };
      }

      return {
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return { status: 'failed' };
    }
  }

  // Estimate gas for operations with real BNB price
  static async estimateGas(operation: 'token' | 'nft' | 'transfer'): Promise<string> {
    try {
      const provider = this.getProvider();
      const gasPrice = (await provider.getFeeData()).gasPrice || ethers.parseUnits('1', 'gwei');

      let gasLimit = 21000n; // Default for simple transfers

      switch (operation) {
        case 'token':
          gasLimit = 500000n; // Token creation
          break;
        case 'nft':
          gasLimit = 200000n; // NFT minting
          break;
        case 'transfer':
          gasLimit = 21000n; // Simple transfer
          break;
      }

      const cost = gasLimit * gasPrice;
      return ethers.formatEther(cost);
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return '0.0001'; // Realistic fallback estimate for opBNB (~$0.09 at $900/BNB)
    }
  }

  // Get gas cost in USD using real BNB price
  static async getGasCostUSD(operation: 'token' | 'nft' | 'transfer'): Promise<string> {
    try {
      const gasCostBNB = await this.estimateGas(operation);
      const priceData = await PriceService.getBNBPrice();
      const gasCostUSD = parseFloat(gasCostBNB) * priceData.price;
      
      return `$${gasCostUSD.toFixed(4)}`;
    } catch (error) {
      console.error('Failed to get gas cost in USD:', error);
      // Fallback costs at current price estimates
      const fallbackCosts = {
        token: '$0.27',
        nft: '$0.09', 
        transfer: '$0.009'
      };
      return fallbackCosts[operation];
    }
  }

  // Get all tokens created by a user
  static async getUserCreatedTokens(userAddress: string): Promise<Array<{
    address: string;
    name: string;
    symbol: string;
    totalSupply: string;
    decimals: number;
  }>> {
    try {
      console.log('Fetching tokens for user:', userAddress);
      
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();

      if (!addresses.tokenFactory) {
        throw new Error('Token factory contract address not configured');
      }

      const contract = new ethers.Contract(addresses.tokenFactory, OPTIMIZED_TOKEN_FACTORY_ABI, provider);

      // Get all token addresses created by the user
      const tokenAddresses = await contract.getCreatedTokens(userAddress);
      console.log('Found token addresses:', tokenAddresses);

      if (!tokenAddresses || tokenAddresses.length === 0) {
        console.log('No tokens found for user');
        return [];
      }

      // Fetch details for each token
      const tokenDetailsPromises = tokenAddresses.map(async (tokenAddress: string) => {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          
          const [name, symbol, decimals, totalSupply] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.balanceOf(userAddress) // Get user's balance instead of total supply
          ]);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: ethers.formatUnits(totalSupply, decimals),
            decimals: Number(decimals)
          };
        } catch (error) {
          console.error(`Failed to fetch details for token ${tokenAddress}:`, error);
          return null;
        }
      });

      const tokens = await Promise.all(tokenDetailsPromises);
      const validTokens = tokens.filter((token): token is NonNullable<typeof token> => token !== null);
      
      console.log('Successfully fetched token details:', validTokens);
      return validTokens;
    } catch (error) {
      console.error('Failed to fetch user tokens:', error);
      throw error;
    }
  }

  // Get all NFTs created by a user from the shared collection
  static async getUserNFTs(userAddress: string): Promise<Array<{
    tokenId: string;
    tokenURI: string;
    owner: string;
    creator: string;
    metadata?: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: any[];
    };
  }>> {
    try {
      console.log('📋 Fetching NFTs for user:', userAddress);
      
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();

      if (!addresses.nftFactory) {
        throw new Error('NFT collection contract address not configured');
      }

      const contract = new ethers.Contract(addresses.nftFactory, OPTIMIZED_NFT_FACTORY_ABI, provider);

      // Get all token IDs created by this user using OptimizedNFTFactory's getCreatorNFTs
      const tokenIds = await contract.getCreatorNFTs(userAddress);
      console.log(`Found ${tokenIds.length} NFTs created by user`);

      if (!tokenIds || tokenIds.length === 0) {
        console.log('No NFTs found for user');
        return [];
      }

      // Fetch details for each NFT
      const nftDetailsPromises = tokenIds.map(async (tokenId: bigint) => {
        try {
          const tokenIdStr = tokenId.toString();
          
          // Check if token still exists
          const exists = await contract.exists(tokenId);
          if (!exists) {
            console.log(`Token ${tokenIdStr} no longer exists`);
            return null;
          }

          // Use getNFTInfo to get creator info, and standard ERC721 for owner/tokenURI
          const [nftInfo, owner] = await Promise.all([
            contract.getNFTInfo(tokenId),
            contract.ownerOf(tokenId)
          ]);
          const tokenURI = nftInfo.tokenURI;
          const creator = nftInfo.creator;

          // Parse metadata from tokenURI if it's a data URI
          let metadata;
          if (tokenURI.startsWith('data:application/json;base64,')) {
            try {
              const base64Data = tokenURI.split(',')[1];
              const jsonString = atob(base64Data);
              metadata = JSON.parse(jsonString);
            } catch (e) {
              console.error(`Failed to parse metadata for token ${tokenIdStr}:`, e);
            }
          }

          return {
            tokenId: tokenIdStr,
            tokenURI,
            owner,
            creator,
            metadata
          };
        } catch (error) {
          console.error(`Failed to fetch details for token ${tokenId.toString()}:`, error);
          return null;
        }
      });

      const nfts = await Promise.all(nftDetailsPromises);
      const validNFTs = nfts.filter((nft): nft is NonNullable<typeof nft> => nft !== null);
      
      console.log(`✅ Successfully fetched ${validNFTs.length} NFT details`);
      return validNFTs;
    } catch (error) {
      console.error('Failed to fetch user NFTs:', error);
      throw error;
    }
  }
}
