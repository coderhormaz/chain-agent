/**
 * Deploy CertificateRegistry to opBNB Mainnet
 *
 * Usage:
 *   node scripts/deploy-certificate-registry.mjs <YOUR_PRIVATE_KEY>
 *
 * Example:
 *   node scripts/deploy-certificate-registry.mjs 0xabc123...
 *
 * After deployment, paste the contract address into .env as VITE_CERTIFICATE_CONTRACT
 */

import { ethers } from 'ethers';

// ── Config ────────────────────────────────────────────
const RPC_URL = 'https://opbnb-mainnet-rpc.bnbchain.org';
const CHAIN_ID = 204;

// ── ABI + Bytecode (compiled with solc 0.8.20, optimization 200 runs) ──
// Paste the bytecode from Remix: Compile → ABI → Copy Bytecode
// Or compile with solc. For convenience, we'll compile at runtime if solc is missing.

const ABI = [
  'constructor()',
  'event IssuerRegistered(address indexed issuer, address indexed registeredBy)',
  'event IssuerRemoved(address indexed issuer, address indexed removedBy)',
  'event CertificateIssued(uint256 indexed certId, address indexed issuer, address indexed recipient, string ipfsHash)',
  'event CertificateRevoked(uint256 indexed certId, address indexed issuer)',
  'function owner() view returns (address)',
  'function isApprovedIssuer(address) view returns (bool)',
  'function registerIssuer(address issuer)',
  'function removeIssuer(address issuer)',
  'function issueCertificate(address recipient, string ipfsHash) returns (uint256)',
  'function revokeCertificate(uint256 certId)',
  'function verifyCertificate(uint256 certId) view returns (address issuer, address recipient, string ipfsHash, uint96 issuedAt, bool revoked, bool isValid)',
  'function getCertificatesByIssuer(address issuer) view returns (uint256[])',
  'function getCertificatesByRecipient(address recipient) view returns (uint256[])',
  'function totalCertificates() view returns (uint256)',
];

// ── Main ──────────────────────────────────────────────
async function main() {
  const privateKey = process.argv[2];
  if (!privateKey) {
    console.error('\n❌ Usage: node scripts/deploy-certificate-registry.mjs <PRIVATE_KEY>\n');
    process.exit(1);
  }

  // You MUST paste the bytecode from Remix here.
  // In Remix: Compile CertificateRegistry.sol → click "ABI" dropdown → "Bytecode" → copy the "object" field
  const BYTECODE = process.argv[3] || BYTECODE_PLACEHOLDER;

  if (!BYTECODE || BYTECODE === 'PASTE_BYTECODE_HERE') {
    console.error('\n❌ Bytecode not provided.');
    console.error('   Option 1: Pass as 3rd argument:');
    console.error('     node scripts/deploy-certificate-registry.mjs <KEY> <BYTECODE>');
    console.error('   Option 2: Edit this file and replace BYTECODE_PLACEHOLDER\n');
    process.exit(1);
  }

  console.log('\n🚀 Deploying CertificateRegistry to opBNB Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`   Deployer:  ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`   Balance:   ${ethers.formatEther(balance)} BNB`);

  if (balance === 0n) {
    console.error('\n❌ No BNB on opBNB. Bridge some from BSC first.\n');
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);

  // Deploy with explicit gas settings to avoid estimation issues
  console.log('   Sending deploy transaction...');
  const contract = await factory.deploy({
    gasLimit: 3_000_000n,
  });

  console.log(`   Tx hash:   ${contract.deploymentTransaction().hash}`);
  console.log('   Waiting for confirmation...');

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\n✅ CertificateRegistry deployed!\n');
  console.log(`   Contract:  ${address}`);
  console.log(`   Explorer:  https://opbnbscan.com/address/${address}`);
  console.log(`\n📋 Next step: paste this into your .env file:`);
  console.log(`   VITE_CERTIFICATE_CONTRACT=${address}\n`);
}

const BYTECODE_PLACEHOLDER = 'PASTE_BYTECODE_HERE';

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
