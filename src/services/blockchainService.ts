import { ethers } from 'ethers';
import type { TokenCreationDetails, NFTMintingDetails, TransactionDetails } from './geminiAI';
import { PriceService } from './priceService';
import type { NFTMetadataRow } from './nftMetadataService';

type NFTAttribute = { trait_type: string; value: string };

interface NFTMetadataPayload extends Record<string, unknown> {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: NFTAttribute[];
}

interface UserNFT {
  tokenId: string;
  tokenURI: string;
  owner: string;
  creator: string;
  createdAt?: Date;
  image_url?: string;
  metadata?: NFTMetadataPayload;
}

// Smart Contract ABIs (optimized versions)
const OPTIMIZED_TOKEN_FACTORY_ABI = [
  "function createToken(string name, string symbol, uint96 totalSupply, uint8 decimals) external returns (address)",
  "function getCreatedTokens(address creator) external view returns (address[])",
  "function getTotalTokensCount() external view returns (uint256)"
];

// SimpleNFTCollection ABI - Matches the actual deployed contract on opBNB
// Contract at VITE_NFT_FACTORY_CONTRACT uses mint(string) not mintNFT(address,string,string,string)
const SIMPLE_NFT_COLLECTION_ABI = [
  "function mint(string calldata uri) external returns (uint256)",
  "function batchMint(string[] calldata uris) external returns (uint256[])",
  "function getTokensByCreator(address creator) external view returns (uint256[])",
  "function nftCreator(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "function exists(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "event NFTMinted(uint256 indexed tokenId, address indexed creator, string uri)"
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

// CertificateRegistry ABI — matches remix-contracts/CertificateRegistry.sol
const CERTIFICATE_REGISTRY_ABI = [
  "function issueCertificate(address recipient, string calldata ipfsHash) external returns (uint256)",
  "function revokeCertificate(uint256 certId) external",
  "function verifyCertificate(uint256 certId) external view returns (address issuer, address recipient, string ipfsHash, uint96 issuedAt, bool revoked, bool isValid)",
  "function getCertificatesByIssuer(address issuer) external view returns (uint256[])",
  "function getCertificatesByRecipient(address recipient) external view returns (uint256[])",
  "function totalCertificates() external view returns (uint256)",
  "function isApprovedIssuer(address) external view returns (bool)",
  "function registerIssuer(address issuer) external",
  "function removeIssuer(address issuer) external"
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
      certificateRegistry: import.meta.env.VITE_CERTIFICATE_CONTRACT,
    };
  }

  private static getProvider(): ethers.JsonRpcProvider {
    const rpcUrl = import.meta.env.VITE_OPBNB_RPC_URL || 'https://opbnb-mainnet-rpc.bnbchain.org';
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  private static getExplorerUrl(hash: string): string {
    const explorer = import.meta.env.VITE_OPBNB_EXPLORER || 'https://opbnb.bscscan.com';
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
      console.log('Recipient (will mint to sender):', recipientAddress);
      
      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const addresses = this.getContractAddresses();

      if (!addresses.nftFactory) {
        throw new Error('NFT factory contract address not configured');
      }

      console.log('Using NFT Collection address:', addresses.nftFactory);

      // Check if contract exists at address
      const contractCode = await provider.getCode(addresses.nftFactory);
      console.log('Contract code length:', contractCode.length);
      if (contractCode === '0x') {
        throw new Error(`No contract found at address ${addresses.nftFactory}. Contract may not be deployed.`);
      }

      // Use the correct ABI for SimpleNFTCollection
      const contract = new ethers.Contract(addresses.nftFactory, SIMPLE_NFT_COLLECTION_ABI, wallet);

      // Verify the contract interface
      try {
        console.log('Verifying contract interface by calling totalSupply...');
        const totalNFTs = await contract.totalSupply();
        console.log('Contract verification successful. Total NFTs:', totalNFTs.toString());
      } catch (interfaceError) {
        console.error('Contract interface verification failed:', interfaceError);
        throw new Error(`Contract at ${addresses.nftFactory} doesn't have the expected interface.`);
      }

      // Check wallet balance
      const balance = await provider.getBalance(wallet.address);
      console.log('Wallet balance:', ethers.formatEther(balance), 'BNB');
      
      const minRequiredForGas = ethers.parseEther('0.0001');
      if (balance < minRequiredForGas) {
        throw new Error(`Insufficient BNB balance for gas fees. You have ${ethers.formatEther(balance)} BNB, need at least 0.0001 BNB.`);
      }

      // Validate metadata
      if (!nftDetails.name || nftDetails.name.trim() === '') {
        throw new Error('NFT name cannot be empty');
      }

      // Build metadata JSON
      const metadata: NFTMetadataPayload = {
        name: nftDetails.name,
        description: nftDetails.description || '',
        attributes: nftDetails.attributes || [],
      };

      // Add image URL if provided (must be IPFS/HTTP URL)
      if (nftDetails.imageUrl) {
        if (!nftDetails.imageUrl.startsWith('http')) {
          throw new Error('Invalid image URL. Image must be uploaded to IPFS first.');
        }
        // Store both ipfs:// (for on-chain standard) and HTTPS gateway URL (for explorers)
        if (nftDetails.imageUrl.includes('/ipfs/')) {
          const cid = nftDetails.imageUrl.split('/ipfs/')[1];
          metadata.image = 'ipfs://' + cid;
          // external_url as HTTPS so block explorers can render the image directly
          metadata.external_url = 'https://gateway.lighthouse.storage/ipfs/' + cid;
        } else {
          metadata.image = nftDetails.imageUrl;
          metadata.external_url = nftDetails.imageUrl;
        }
      }

      console.log('🎨 Minting to shared NFT collection...');
      console.log('Minter address:', wallet.address);
      console.log('Collection contract:', addresses.nftFactory);

      // Upload metadata JSON to IPFS so tokenURI is a short URL
      let tokenURI: string;
      
      try {
        console.log('📤 Uploading metadata JSON to IPFS...');
        const { LighthouseService } = await import('./lighthouseService');
        const metadataUpload = await LighthouseService.uploadJSON(metadata, `${nftDetails.name.replace(/\\s+/g, '_')}_metadata.json`);
        
        if (metadataUpload.success && metadataUpload.ipfsHash) {
          // Use ipfs:// protocol URI so block explorers can resolve metadata
          tokenURI = `ipfs://${metadataUpload.ipfsHash}`;
          console.log('✅ Metadata uploaded to IPFS:', tokenURI);
        } else {
          console.log('⚠️ Metadata IPFS upload failed:', metadataUpload.error);
          // Fallback: use base64 data URI (only safe when image is a short IPFS URL, not a data URL)
          const metadataJson = JSON.stringify(metadata);
          if (metadataJson.length > 5000) {
            throw new Error('Metadata too large for on-chain storage and IPFS upload failed. ' + (metadataUpload.error || ''));
          }
          tokenURI = `data:application/json;base64,${btoa(metadataJson)}`;
          console.log('📝 Using base64 fallback tokenURI, length:', tokenURI.length);
        }
      } catch {
        // If IPFS upload completely fails, try base64 fallback
        console.log('⚠️ IPFS upload error, attempting base64 fallback...');
        const metadataJson = JSON.stringify(metadata);
        if (metadataJson.length > 5000) {
          throw new Error(`Cannot store metadata: IPFS upload failed and metadata too large for on-chain storage.`);
        }
        tokenURI = `data:application/json;base64,${btoa(metadataJson)}`;
      }

      // Safety check
      if (tokenURI.length > 10000) {
        throw new Error(`tokenURI is too large (${tokenURI.length} chars). Please ensure metadata is uploaded to IPFS.`);
      }

      console.log('📝 Token URI length:', tokenURI.length);

      // Estimate gas for mint(string) on SimpleNFTCollection
      let gasEstimate: bigint;
      
      try {
        console.log('⛽ Estimating gas for mint()...');
        gasEstimate = await contract.mint.estimateGas(tokenURI);
        console.log('✅ Gas estimate for mint():', gasEstimate.toString());
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        // Use a safe default gas limit for minting on opBNB
        console.log('⚠️ Using default gas limit of 300000');
        gasEstimate = 300000n;
      }

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * 120n / 100n;
      console.log('📊 Using gas limit:', gasLimit.toString());

      // Execute: mint(string uri) — mints to msg.sender (the wallet)
      console.log('🚀 Calling mint() function...');
      const tx = await contract.mint(tokenURI, { gasLimit });

      console.log('✅ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      // Extract token ID from the Transfer event
      const transferEvent = receipt.logs.find((log: ethers.Log | ethers.EventLog) => 
        log.topics[0] === ethers.id('Transfer(address,address,uint256)')
      );
      
      let tokenId = '0';
      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('🎨 Minted NFT Token ID:', tokenId);
      }

      // Cache metadata in Supabase with 8s timeout so it doesn't hang indefinitely
      try {
        const { NFTMetadataService } = await import('./nftMetadataService');
        await Promise.race([
          NFTMetadataService.saveMetadata({
            token_id: tokenId,
            contract_address: (addresses.nftFactory || '').toLowerCase(),
            name: metadata.name,
            description: metadata.description,
            image_ipfs_hash: metadata.image?.startsWith('ipfs://')
              ? metadata.image.slice(7)
              : undefined,
            metadata_ipfs_hash: tokenURI.startsWith('ipfs://')
              ? tokenURI.slice(7)
              : undefined,
            metadata_json: metadata,
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 8000)),
        ]);
      } catch (cacheErr) {
        console.warn('NFT metadata cache failed (non-fatal):', cacheErr);
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
  static async getUserNFTs(userAddress: string): Promise<UserNFT[]> {
    try {
      console.log('📋 Fetching NFTs for user:', userAddress);
      
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();

      if (!addresses.nftFactory) {
        throw new Error('NFT collection contract address not configured');
      }

      // Use the correct ABI for SimpleNFTCollection
      const contract = new ethers.Contract(addresses.nftFactory, SIMPLE_NFT_COLLECTION_ABI, provider);

      // Get all token IDs created by this user using SimpleNFTCollection's getTokensByCreator
      const tokenIds = await contract.getTokensByCreator(userAddress);
      console.log(`Found ${tokenIds.length} NFTs created by user`);

      if (!tokenIds || tokenIds.length === 0) {
        console.log('No NFTs found for user');
        return [];
      }

      // Helper: wrap any promise with a timeout
      const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

      // Load Supabase cache (with 5s timeout so a slow DB never blocks the page)
      console.log('📦 Loading Supabase metadata cache...');
      let cachedMetadata = new Map<string, NFTMetadataRow>();
      try {
        const { NFTMetadataService } = await import('./nftMetadataService');
        cachedMetadata = await withTimeout(NFTMetadataService.getMetadataByUser(), 5000, new Map());
        console.log(`📦 Loaded ${cachedMetadata.size} cached entries from Supabase`);
      } catch (cacheErr) {
        console.warn('⚠️ Could not load cached NFT metadata:', cacheErr);
      }

      const contractAddr = (addresses.nftFactory || '').toLowerCase();
      const RPC_TIMEOUT = 5000; // per-RPC-call timeout

      // Fetch details for each NFT sequentially to avoid RPC rate limiting.
      // Each NFT has its own timeout so a hung call doesn't block everything.
      const validNFTs: UserNFT[] = [];

      for (const tokenId of tokenIds) {
        const tokenIdStr = (tokenId as bigint).toString();
        try {
          const cacheKey = `${contractAddr}:${tokenIdStr}`;
          const cached = cachedMetadata.get(cacheKey);

          console.log(`🔍 Fetching NFT #${tokenIdStr}${cached?.metadata_json ? ' (cache hit)' : ''}...`);

          // RPC calls with individual timeouts
          let tokenURI = '';
          let owner = '';
          let creator = '';

          if (cached?.metadata_json) {
            // Cache hit: only need owner + creator, skip tokenURI
            try {
              const rpcResults = await withTimeout(
                Promise.all([
                  contract.ownerOf(tokenId),
                  contract.nftCreator(tokenId)
                ]),
                RPC_TIMEOUT,
                null
              );
              if (rpcResults) {
                [owner, creator] = rpcResults;
              } else {
                console.warn(`⏰ RPC timeout for token ${tokenIdStr} — using cached data only`);
              }
            } catch {
              console.warn(`⚠️ RPC failed for token ${tokenIdStr}`);
            }

            console.log(`✅ Using cached metadata for token ${tokenIdStr}`);
            validNFTs.push({
              tokenId: tokenIdStr,
              tokenURI,
              owner: owner || userAddress,
              creator: creator || userAddress,
              createdAt: cached.created_at ? new Date(cached.created_at) : new Date(),
              image_url: cached.image_url || undefined,
              metadata: cached.metadata_json,
            });
            continue;
          }

          // No cache — need full RPC + metadata fetch
          try {
            const rpcResults = await withTimeout(
              Promise.all([
                contract.tokenURI(tokenId),
                contract.ownerOf(tokenId),
                contract.nftCreator(tokenId)
              ]),
              RPC_TIMEOUT,
              null
            );
            if (!rpcResults) {
              console.warn(`⏰ RPC timeout for token ${tokenIdStr} — skipping`);
              // Still return a basic entry so user sees something
              validNFTs.push({
                tokenId: tokenIdStr,
                tokenURI: '',
                owner: userAddress,
                creator: userAddress,
                metadata: undefined,
              });
              continue;
            }
            [tokenURI, owner, creator] = rpcResults;
          } catch {
            console.log(`Token ${tokenIdStr} no longer exists or is inaccessible`);
            continue;
          }

          // Parse metadata from tokenURI
          let metadata: NFTMetadataPayload | undefined;
          if (tokenURI.startsWith('data:application/json;base64,')) {
            try {
              metadata = JSON.parse(atob(tokenURI.split(',')[1]));
            } catch (e) {
              console.error(`Failed to parse base64 metadata for token ${tokenIdStr}:`, e);
            }
          } else if (tokenURI.startsWith('ipfs://')) {
            const ipfsHash = tokenURI.slice(7);
            try {
              const { LighthouseService } = await import('./lighthouseService');
              const response = await withTimeout(
                LighthouseService.fetchFromIPFS(ipfsHash),
                8000,
                null
              );
              if (response) {
                metadata = JSON.parse(await response.text());
              } else {
                console.warn(`Gateway timeout for token ${tokenIdStr}`);
              }
            } catch (e) {
              console.error(`Failed to fetch IPFS metadata for token ${tokenIdStr}:`, e);
            }
          } else if (tokenURI.startsWith('http')) {
            // Check if it's an IPFS gateway URL (e.g. Lighthouse) — extract CID and use fetchFromIPFS
            // This avoids CORS issues with direct Lighthouse gateway fetch()
            const ipfsCidMatch = tokenURI.match(/\/ipfs\/([a-zA-Z0-9]+)/);
            if (ipfsCidMatch) {
              const cid = ipfsCidMatch[1];
              console.log(`🔗 HTTP URL is IPFS gateway, extracting CID: ${cid}`);
              try {
                const { LighthouseService } = await import('./lighthouseService');
                const response = await withTimeout(
                  LighthouseService.fetchFromIPFS(cid),
                  8000,
                  null
                );
                if (response) {
                  metadata = JSON.parse(await response.text());
                } else {
                  console.warn(`Gateway timeout for token ${tokenIdStr}`);
                }
              } catch (e) {
                console.error(`Failed to fetch IPFS metadata for token ${tokenIdStr}:`, e);
              }
            } else {
              try {
                const response = await fetch(tokenURI, { signal: AbortSignal.timeout(4000) });
                if (response.ok) {
                  metadata = JSON.parse(await response.text());
                }
              } catch (e) {
                console.error(`Failed to fetch HTTP metadata for token ${tokenIdStr}:`, e);
              }
            }
          }

          console.log(`${metadata ? '✅' : '⚠️'} Token ${tokenIdStr}: name=${metadata?.name || 'unknown'}, hasImage=${!!metadata?.image}`);

          // Cache successful fetches to Supabase (fire-and-forget is OK here)
          if (metadata) {
            import('./nftMetadataService').then(({ NFTMetadataService }) => {
              NFTMetadataService.saveMetadata({
                token_id: tokenIdStr,
                contract_address: contractAddr,
                name: metadata.name,
                description: metadata.description,
                image_ipfs_hash: metadata.image?.startsWith('ipfs://') ? metadata.image.slice(7) : undefined,
                metadata_json: metadata,
              }).catch(() => {});
            }).catch(() => {});
          }

          validNFTs.push({
            tokenId: tokenIdStr,
            tokenURI,
            owner,
            creator,
            metadata,
          });
        } catch (error) {
          console.error(`Failed to process token ${tokenIdStr}:`, error);
        }
      }

      console.log(`✅ Successfully fetched ${validNFTs.length} NFT details`);
      return validNFTs;
    } catch (error) {
      console.error('Failed to fetch user NFTs:', error);
      throw error;
    }
  }

  static async syncUserNFTsToDatabase(userAddress: string): Promise<number> {
    const nfts = await this.getUserNFTs(userAddress);
    return nfts.length;
  }

  // ── Certificate Registry Methods ────────────────────────────

  // Issue a certificate on-chain
  static async issueCertificate(
    recipientAddress: string,
    ipfsHash: string,
    privateKey: string
  ): Promise<TransactionResult & { certId?: string }> {
    try {
      console.log('🎓 Issuing certificate to:', recipientAddress);

      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const addresses = this.getContractAddresses();

      if (!addresses.certificateRegistry) {
        throw new Error('Certificate registry contract address not configured. Deploy CertificateRegistry.sol and set VITE_CERTIFICATE_CONTRACT in .env');
      }

      const contract = new ethers.Contract(addresses.certificateRegistry, CERTIFICATE_REGISTRY_ABI, wallet);

      // Estimate gas
      let gasEstimate: bigint;
      try {
        gasEstimate = await contract.issueCertificate.estimateGas(recipientAddress, ipfsHash);
      } catch {
        gasEstimate = 200000n;
      }

      const tx = await contract.issueCertificate(recipientAddress, ipfsHash, {
        gasLimit: gasEstimate * 120n / 100n
      });

      console.log('📝 Certificate issuance tx sent:', tx.hash);
      const receipt = await tx.wait();

      // Extract certId from CertificateIssued event
      let certId = '0';
      const issuedEvent = receipt.logs.find((log: ethers.Log | ethers.EventLog) =>
        log.topics[0] === ethers.id('CertificateIssued(uint256,address,address,string)')
      );
      if (issuedEvent && issuedEvent.topics[1]) {
        certId = BigInt(issuedEvent.topics[1]).toString();
        console.log('🎓 Certificate ID:', certId);
      }

      return {
        success: true,
        hash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash),
        certId
      };
    } catch (error) {
      console.error('Certificate issuance failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Certificate issuance failed'
      };
    }
  }

  // Verify a certificate (read-only, no gas)
  static async verifyCertificate(certId: number): Promise<{
    exists: boolean;
    issuer: string;
    recipient: string;
    ipfsHash: string;
    issuedAt: number;
    revoked: boolean;
    isValid: boolean;
  }> {
    try {
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();

      if (!addresses.certificateRegistry) {
        throw new Error('Certificate registry contract not configured');
      }

      const contract = new ethers.Contract(addresses.certificateRegistry, CERTIFICATE_REGISTRY_ABI, provider);
      const [issuer, recipient, ipfsHash, issuedAt, revoked, isValid] = await contract.verifyCertificate(certId);

      const exists = issuedAt !== 0n && issuedAt !== 0;

      return {
        exists,
        issuer,
        recipient,
        ipfsHash,
        issuedAt: Number(issuedAt),
        revoked,
        isValid
      };
    } catch (error) {
      console.error('Certificate verification failed:', error);
      return { exists: false, issuer: '', recipient: '', ipfsHash: '', issuedAt: 0, revoked: false, isValid: false };
    }
  }

  // Revoke a certificate
  static async revokeCertificate(certId: number, privateKey: string): Promise<TransactionResult> {
    try {
      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      const addresses = this.getContractAddresses();

      if (!addresses.certificateRegistry) {
        throw new Error('Certificate registry contract not configured');
      }

      const contract = new ethers.Contract(addresses.certificateRegistry, CERTIFICATE_REGISTRY_ABI, wallet);

      let gasEstimate: bigint;
      try {
        gasEstimate = await contract.revokeCertificate.estimateGas(certId);
      } catch {
        gasEstimate = 100000n;
      }

      const tx = await contract.revokeCertificate(certId, {
        gasLimit: gasEstimate * 120n / 100n
      });

      const receipt = await tx.wait();
      console.log('🚫 Certificate revoked in block:', receipt.blockNumber);

      return {
        success: true,
        hash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash)
      };
    } catch (error) {
      console.error('Certificate revocation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Certificate revocation failed'
      };
    }
  }

  // Get certificates by issuer (read-only)
  static async getCertificatesByIssuer(issuerAddress: string): Promise<number[]> {
    try {
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();
      if (!addresses.certificateRegistry) return [];

      const contract = new ethers.Contract(addresses.certificateRegistry, CERTIFICATE_REGISTRY_ABI, provider);
      const ids: bigint[] = await contract.getCertificatesByIssuer(issuerAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      console.error('Failed to fetch issuer certificates:', error);
      return [];
    }
  }

  // Get certificates by recipient (read-only)
  static async getCertificatesByRecipient(recipientAddress: string): Promise<number[]> {
    try {
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();
      if (!addresses.certificateRegistry) return [];

      const contract = new ethers.Contract(addresses.certificateRegistry, CERTIFICATE_REGISTRY_ABI, provider);
      const ids: bigint[] = await contract.getCertificatesByRecipient(recipientAddress);
      return ids.map(id => Number(id));
    } catch (error) {
      console.error('Failed to fetch recipient certificates:', error);
      return [];
    }
  }

  // Check if an address is an approved issuer
  static async checkIsApprovedIssuer(address: string): Promise<boolean> {
    try {
      const provider = this.getProvider();
      const addresses = this.getContractAddresses();
      if (!addresses.certificateRegistry) return false;

      const contract = new ethers.Contract(addresses.certificateRegistry, CERTIFICATE_REGISTRY_ABI, provider);
      return await contract.isApprovedIssuer(address);
    } catch (error) {
      console.error('Failed to check issuer status:', error);
      return false;
    }
  }
}
