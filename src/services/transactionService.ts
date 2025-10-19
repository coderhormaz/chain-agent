import { ethers } from 'ethers';

export interface Transaction {
  hash: string;
  type: 'Sent' | 'Received' | 'Contract Interaction';
  amount: string;
  from?: string;
  to?: string;
  timestamp: Date;
  status: 'Success' | 'Failed' | 'Pending';
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
}

export class TransactionService {
  private static getProvider(): ethers.JsonRpcProvider {
    const rpcUrl = import.meta.env.VITE_OPBNB_RPC_URL || 'https://opbnb-mainnet-rpc.bnbchain.org';
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Delay helper to avoid rate limiting
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch transactions for a given address using NodeReal Enhanced API or opBNBScan API
   */
  static async fetchTransactions(address: string): Promise<Transaction[]> {
    console.log('🔍 Starting transaction fetch for address:', address);
    
    try {
      // Try NodeReal Enhanced API first (if available)
      const rpcUrl = import.meta.env.VITE_OPBNB_RPC_URL || '';
      if (rpcUrl.includes('nodereal.io')) {
        console.log('🚀 Using NodeReal Enhanced API...');
        const nodeRealTxs = await this.fetchFromNodeReal(address);
        // Check if we got a valid response (even 0 transactions is valid)
        // But only return if the API call was successful
        console.log(`✅ SUCCESS: Found ${nodeRealTxs.length} transactions from NodeReal API`);
        return nodeRealTxs;
      }
    } catch (nodeRealError) {
      console.warn('⚠️ NodeReal API failed, trying RPC fallback...', nodeRealError);
      // Skip opBNBScan since it's deprecated, go straight to RPC
      return this.fetchFromRPC(address);
    }

    // If NodeReal not available, try opBNBScan (though it's deprecated)
    try {
      console.log('📡 Attempting opBNBScan API...');
      const apiTransactions = await this.fetchFromOpBNBScan(address);
      
      if (apiTransactions.length > 0) {
        console.log(`✅ SUCCESS: Found ${apiTransactions.length} transactions from opBNBScan API`);
        return apiTransactions;
      } else {
        console.log('⚠️ API returned 0 transactions');
        return apiTransactions;
      }
    } catch (apiError) {
      console.error('❌ opBNBScan API failed:', apiError);
      console.log('🔄 Falling back to RPC method...');
      // Fallback to RPC method with optimized querying
      return this.fetchFromRPC(address);
    }
  }

  /**
   * Fetch transactions from NodeReal Enhanced API
   */
  private static async fetchFromNodeReal(address: string): Promise<Transaction[]> {
    try {
      const rpcUrl = import.meta.env.VITE_OPBNB_RPC_URL;
      
      console.log('🌐 Calling NodeReal Enhanced API: nr_getTransactionByAddress');
      
      // Use NodeReal's enhanced API method
      // category options: external (normal BNB transfers), internal (contract calls), 20 (ERC20), 721 (NFT), 1155 (multi-token)
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'nr_getTransactionByAddress',
          params: [
            {
              address: address.toLowerCase(),
              category: ['external', 'internal'], // Get normal BNB transfers and contract interactions
              page: 1,
              pageSize: 20,
              order: 'desc' // newest first
            }
          ],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('📦 NodeReal API Full Response:');
      console.log('   - Has result:', !!data.result);
      console.log('   - Result type:', typeof data.result);
      console.log('   - Result keys:', data.result ? Object.keys(data.result) : 'N/A');
      console.log('   - Complete data:', JSON.stringify(data, null, 2));

      if (data.error) {
        console.error('❌ NodeReal API Error Details:', data.error);
        throw new Error(`NodeReal API Error: ${data.error.message}`);
      }

      // Check if result exists
      if (!data.result) {
        console.warn('⚠️ NodeReal API returned no result object');
        throw new Error('No result in NodeReal API response');
      }

      // Try different possible response structures
      let txArray = null;
      
      // NodeReal returns: { transfers: [...], pageKey: "..." } (not transactions!)
      if (data.result.transfers && Array.isArray(data.result.transfers)) {
        txArray = data.result.transfers;
        console.log(`📊 Found transactions in result.transfers: ${txArray.length} items`);
        console.log(`� PageKey from API: ${data.result.pageKey || 'none'}`);
      } else if (data.result.transactions && Array.isArray(data.result.transactions)) {
        txArray = data.result.transactions;
        console.log(`📊 Found transactions in result.transactions: ${txArray.length} items`);
      } else if (Array.isArray(data.result)) {
        txArray = data.result;
        console.log(`📊 Found transactions directly in result array: ${txArray.length} items`);
      } else {
        console.error('❌ Unexpected NodeReal response structure. Keys:', Object.keys(data.result));
        console.error('   Full result object:', data.result);
        throw new Error('Unexpected response structure from NodeReal API');
      }

      if (txArray && txArray.length > 0) {
        const transactions: Transaction[] = [];
        const userAddress = address.toLowerCase();

        console.log(`📊 Processing ${txArray.length} transactions from NodeReal`);

        for (const tx of txArray) {
          console.log(`   Processing tx:`, {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value
          });
          const txFrom = tx.from?.toLowerCase();
          const txTo = tx.to?.toLowerCase();

          // Determine transaction type
          let type: 'Sent' | 'Received' | 'Contract Interaction' = 'Contract Interaction';
          
          if (txFrom === userAddress && txTo !== userAddress) {
            type = 'Sent';
          } else if (txTo === userAddress && txFrom !== userAddress) {
            type = 'Received';
          }

          // Parse value - NodeReal returns hex string
          const valueInWei = tx.value || '0x0';
          const amount = ethers.formatEther(valueInWei);
          const amountFormatted = parseFloat(amount).toFixed(6);

          // Parse timestamp - NodeReal returns seconds as number
          const timestamp = new Date(tx.blockTimeStamp * 1000);
          
          // Parse block number - NodeReal returns hex string
          const blockNumber = parseInt(tx.blockNum, 16);

          transactions.push({
            hash: tx.hash,
            type,
            amount: type === 'Sent' ? `-${amountFormatted} BNB` : `+${amountFormatted} BNB`,
            from: tx.from,
            to: tx.to,
            timestamp: timestamp,
            status: tx.receiptsStatus === 1 ? 'Success' : 'Failed',
            gasUsed: tx.gasUsed?.toString(),
            gasPrice: tx.gasPrice?.toString(),
            blockNumber: blockNumber
          });

          console.log(`✅ Added transaction: ${tx.hash.substring(0, 10)}... (${type}, ${amountFormatted} BNB)`);
        }

        console.log(`✨ Total ${transactions.length} user-specific transactions from NodeReal`);
        return transactions;
      } else {
        console.log('ℹ️ No transactions found in NodeReal response');
        return [];
      }

    } catch (error) {
      console.error('❌ Error in fetchFromNodeReal:', error);
      throw error;
    }
  }

  /**
   * Fetch transactions from opBNBScan API
   */
  private static async fetchFromOpBNBScan(address: string): Promise<Transaction[]> {
    try {
      // Get API key from environment (optional - works without it but with rate limits)
      const apiKey = import.meta.env.VITE_OPBNBSCAN_API_KEY;
      
      // opBNBScan API endpoint
      // API key is optional - without it you get 1 call per 5 seconds
      // With API key you get 5 calls per second
      let apiUrl = `https://api-opbnb.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
      
      if (apiKey) {
        apiUrl += `&apikey=${apiKey}`;
        console.log('🔑 Using opBNBScan API with API key');
      } else {
        console.log('ℹ️ Using opBNBScan API without key (rate limited to 1 call per 5 seconds)');
      }
      
      console.log('🌐 Calling API URL:', apiUrl.replace(/apikey=[^&]+/, 'apikey=***'));
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      console.log('📦 opBNBScan API Full Response:');
      console.log('   - Status:', data.status);
      console.log('   - Message:', data.message);
      console.log('   - Result type:', typeof data.result);
      console.log('   - Result is array:', Array.isArray(data.result));
      console.log('   - Complete response:', JSON.stringify(data, null, 2));

      // Check if API returned success
      if (data.status === '1' && data.result && Array.isArray(data.result)) {
        const transactions: Transaction[] = [];

        console.log(`📊 Processing ${data.result.length} transactions from API`);

        for (const tx of data.result) {
          const userAddress = address.toLowerCase();
          const txFrom = tx.from?.toLowerCase();
          const txTo = tx.to?.toLowerCase();

          // Only include transactions where user is sender or receiver
          if (txFrom !== userAddress && txTo !== userAddress) {
            console.log(`⏭️ Skipping transaction ${tx.hash} - not relevant to user`);
            continue;
          }

          let type: 'Sent' | 'Received' | 'Contract Interaction' = 'Contract Interaction';
          
          if (txFrom === userAddress && txTo !== userAddress) {
            type = 'Sent';
          } else if (txTo === userAddress && txFrom !== userAddress) {
            type = 'Received';
          }

          const amount = ethers.formatEther(tx.value || '0');
          const amountFormatted = parseFloat(amount).toFixed(6);

          transactions.push({
            hash: tx.hash,
            type,
            amount: type === 'Sent' ? `-${amountFormatted} BNB` : `+${amountFormatted} BNB`,
            from: tx.from,
            to: tx.to,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            status: tx.isError === '0' ? 'Success' : 'Failed',
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            blockNumber: parseInt(tx.blockNumber)
          });

          console.log(`✅ Added transaction: ${tx.hash.substring(0, 10)}... (${type}, ${amountFormatted} BNB)`);
        }

        console.log(`✨ Filtered to ${transactions.length} user-specific transactions`);
        return transactions;
      }

      // If API returns status 0, log the error
      if (data.status === '0') {
        console.warn('⚠️ opBNBScan API returned status 0');
        console.warn('   - Error Message:', data.message);
        console.warn('   - Error Result:', data.result);
        
        // Check if it's "No transactions found" (legitimate) vs actual error
        const message = (data.message || '').toLowerCase();
        if (message.includes('no transactions') || message.includes('no records')) {
          console.log('ℹ️ No transactions found for this address (new wallet or no activity)');
          return []; // Return empty array, don't throw error
        }
        
        // Check for specific error messages
        if (message.includes('invalid api key') || message.includes('missing api key')) {
          console.error('🔑 API Key issue - consider adding VITE_OPBNBSCAN_API_KEY to .env');
        }
        
        if (message.includes('rate limit') || message.includes('max rate')) {
          console.error('⏱️ Rate limit reached - wait 5 seconds or add API key');
        }
        
        // For other errors, throw to trigger RPC fallback
        throw new Error(`API Error: ${data.message || 'NOTOK'}`);
      }

      console.warn('⚠️ Unexpected API response format:', data);
      throw new Error('Unexpected API response format');
      
    } catch (error) {
      console.error('❌ Error in fetchFromOpBNBScan:', error);
      throw error; // Re-throw to trigger RPC fallback
    }
  }

  /**
   * Fetch transactions from RPC (fallback method with heavy optimization)
   */
  private static async fetchFromRPC(address: string): Promise<Transaction[]> {
    try {
      const provider = this.getProvider();
      const transactions: Transaction[] = [];

      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      
      // Scan more blocks but stop early if we find transactions
      const maxBlocks = 1000; // Scan up to 1000 blocks (~16 minutes)
      const fromBlock = Math.max(0, currentBlock - maxBlocks);

      console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock} for wallet ${address}`);
      console.log(`📦 Will scan up to ${maxBlocks} blocks or until 20 transactions are found`);

      // Process blocks one at a time with delays to avoid rate limiting
      let blocksScanned = 0;
      for (let blockNum = currentBlock; blockNum > fromBlock && transactions.length < 20; blockNum--) {
        try {
          const block = await provider.getBlock(blockNum, true);
          blocksScanned++;

          // Log progress every 50 blocks
          if (blocksScanned % 50 === 0) {
            console.log(`📊 Scanned ${blocksScanned} blocks, found ${transactions.length} transactions so far...`);
          }
          
          if (block && block.transactions && block.transactions.length > 0) {
            for (const txItem of block.transactions) {
              if (typeof txItem === 'string') continue;
              
              const tx = txItem as ethers.TransactionResponse;
              const txFrom = tx.from?.toLowerCase();
              const txTo = tx.to?.toLowerCase();
              const userAddress = address.toLowerCase();

              // Only include transactions involving the user's wallet
              if (txFrom === userAddress || txTo === userAddress) {
                let type: 'Sent' | 'Received' | 'Contract Interaction' = 'Contract Interaction';
                
                if (txFrom === userAddress && txTo !== userAddress) {
                  type = 'Sent';
                } else if (txTo === userAddress && txFrom !== userAddress) {
                  type = 'Received';
                }

                const amount = ethers.formatEther(tx.value);
                const amountFormatted = parseFloat(amount).toFixed(6);

                transactions.push({
                  hash: tx.hash,
                  type,
                  amount: type === 'Sent' ? `-${amountFormatted} BNB` : `+${amountFormatted} BNB`,
                  from: tx.from,
                  to: tx.to || undefined,
                  timestamp: new Date(block.timestamp * 1000),
                  status: 'Success',
                  gasUsed: tx.gasLimit?.toString(),
                  gasPrice: tx.gasPrice?.toString(),
                  blockNumber: block.number
                });

                console.log(`✅ Found transaction: ${tx.hash} (${type})`);

                if (transactions.length >= 20) {
                  console.log(`🎯 Found 20 transactions, stopping scan`);
                  break;
                }
              }
            }
          }

          // Add small delay every 10 blocks to avoid rate limiting
          if (blockNum % 10 === 0) {
            await this.delay(100);
          }
        } catch (blockError) {
          // If we hit rate limit, wait longer and continue
          if (blockError instanceof Error && blockError.message.includes('rate limit')) {
            console.warn(`⚠️ Rate limit hit at block ${blockNum}, waiting 2 seconds...`);
            await this.delay(2000);
            continue;
          }
          console.warn(`⚠️ Error fetching block ${blockNum}:`, blockError);
          continue;
        }
      }

      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(`✅ Scan complete: Found ${transactions.length} transactions after scanning ${blocksScanned} blocks`);
      return transactions;
    } catch (error) {
      console.error('❌ Error in RPC fallback:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Fetch a single transaction by hash
   */
  static async fetchTransactionByHash(hash: string): Promise<Transaction | null> {
    try {
      const provider = this.getProvider();
      const tx = await provider.getTransaction(hash);
      const receipt = await provider.getTransactionReceipt(hash);

      if (!tx) return null;

      const block = await provider.getBlock(tx.blockNumber || 0);
      if (!block) return null;

      const amount = ethers.formatEther(tx.value);
      const amountFormatted = parseFloat(amount).toFixed(6);

      return {
        hash: tx.hash,
        type: 'Sent', // Default to sent, caller should determine based on address
        amount: `${amountFormatted} BNB`,
        from: tx.from,
        to: tx.to || undefined,
        timestamp: new Date(block.timestamp * 1000),
        status: receipt?.status === 1 ? 'Success' : 'Failed',
        gasUsed: receipt?.gasUsed?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        blockNumber: tx.blockNumber || undefined
      };
    } catch (error) {
      console.error('Error fetching transaction by hash:', error);
      return null;
    }
  }

  /**
   * Get transaction explorer URL
   */
  static getExplorerUrl(hash: string): string {
    const explorer = import.meta.env.VITE_OPBNB_EXPLORER || 'https://opbnb.bscscan.com';
    return `${explorer}/tx/${hash}`;
  }

  /**
   * Shorten a hash for display
   */
  static shortenHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  /**
   * Shorten an address for display
   */
  static shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}
