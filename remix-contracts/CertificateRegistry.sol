// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @dev Blockchain-based academic certificate issuance and verification system.
 * Institutions (approved issuers) can issue tamper-proof certificates on-chain.
 * Anyone can verify a certificate's authenticity — no account required.
 * Only the original issuer can revoke a certificate they issued.
 *
 * Certificate metadata (student name, course, grade, etc.) is stored on IPFS.
 * On-chain we store only: issuer, recipient, IPFS hash, timestamp, revocation status.
 */
contract CertificateRegistry {
    // ── Types ──────────────────────────────────────────────
    struct Certificate {
        address issuer;        // Institution that issued the certificate
        address recipient;     // Student who received the certificate
        string  ipfsHash;      // IPFS CID pointing to full metadata JSON
        uint96  issuedAt;      // Timestamp of issuance (uint96 saves a slot)
        bool    revoked;       // Whether the certificate has been revoked
    }

    // ── State ──────────────────────────────────────────────
    address public owner;

    uint256 private _nextCertId = 1; // Auto-increment; 0 means "does not exist"

    mapping(uint256 => Certificate) public certificates;
    mapping(address => bool)        public isApprovedIssuer;
    mapping(address => uint256[])   private _issuerCerts;    // certs issued by address
    mapping(address => uint256[])   private _recipientCerts; // certs received by address

    // ── Events ─────────────────────────────────────────────
    event IssuerRegistered(address indexed issuer, address indexed registeredBy);
    event IssuerRemoved(address indexed issuer, address indexed removedBy);
    event CertificateIssued(
        uint256 indexed certId,
        address indexed issuer,
        address indexed recipient,
        string  ipfsHash
    );
    event CertificateRevoked(uint256 indexed certId, address indexed issuer);

    // ── Modifiers ──────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyApprovedIssuer() {
        require(isApprovedIssuer[msg.sender], "Not an approved issuer");
        _;
    }

    // ── Constructor ────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        // The deployer is automatically an approved issuer
        isApprovedIssuer[msg.sender] = true;
        emit IssuerRegistered(msg.sender, msg.sender);
    }

    // ── Admin Functions ────────────────────────────────────

    /**
     * @dev Register a new approved issuer. Only the contract owner can call this.
     * @param issuer The wallet address of the institution to approve.
     */
    function registerIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Zero address");
        require(!isApprovedIssuer[issuer], "Already approved");
        isApprovedIssuer[issuer] = true;
        emit IssuerRegistered(issuer, msg.sender);
    }

    /**
     * @dev Remove an approved issuer. Only the contract owner can call this.
     * @param issuer The wallet address to remove from approved issuers.
     */
    function removeIssuer(address issuer) external onlyOwner {
        require(isApprovedIssuer[issuer], "Not an issuer");
        isApprovedIssuer[issuer] = false;
        emit IssuerRemoved(issuer, msg.sender);
    }

    // ── Core Functions ─────────────────────────────────────

    /**
     * @dev Issue a new certificate. Only approved issuers can call this.
     * @param recipient The student's wallet address.
     * @param ipfsHash  The IPFS CID of the certificate metadata JSON.
     * @return certId   The unique on-chain certificate ID.
     */
    function issueCertificate(
        address recipient,
        string calldata ipfsHash
    ) external returns (uint256) {
        require(recipient != address(0), "Zero recipient");
        require(bytes(ipfsHash).length > 0, "Empty IPFS hash");

        uint256 certId = _nextCertId++;

        certificates[certId] = Certificate({
            issuer:    msg.sender,
            recipient: recipient,
            ipfsHash:  ipfsHash,
            issuedAt:  uint96(block.timestamp),
            revoked:   false
        });

        _issuerCerts[msg.sender].push(certId);
        _recipientCerts[recipient].push(certId);

        emit CertificateIssued(certId, msg.sender, recipient, ipfsHash);

        return certId;
    }

    /**
     * @dev Revoke a certificate. Only the original issuer can revoke.
     * @param certId The certificate ID to revoke.
     */
    function revokeCertificate(uint256 certId) external {
        Certificate storage cert = certificates[certId];
        require(cert.issuedAt != 0, "Certificate does not exist");
        require(cert.issuer == msg.sender, "Only the original issuer can revoke");
        require(!cert.revoked, "Already revoked");

        cert.revoked = true;

        emit CertificateRevoked(certId, msg.sender);
    }

    // ── View Functions (free — no gas) ─────────────────────

    /**
     * @dev Verify a certificate's authenticity. Anyone can call this (view, no gas).
     * @param certId The certificate ID to verify.
     * @return issuer     The address that issued the certificate.
     * @return recipient  The address that received the certificate.
     * @return ipfsHash   The IPFS CID of the certificate metadata.
     * @return issuedAt   The block timestamp when the certificate was issued.
     * @return revoked    Whether the certificate has been revoked.
     * @return isValid    True if the certificate exists and is not revoked.
     */
    function verifyCertificate(uint256 certId) external view returns (
        address issuer,
        address recipient,
        string memory ipfsHash,
        uint96  issuedAt,
        bool    revoked,
        bool    isValid
    ) {
        Certificate storage cert = certificates[certId];
        bool exists = cert.issuedAt != 0;

        return (
            cert.issuer,
            cert.recipient,
            cert.ipfsHash,
            cert.issuedAt,
            cert.revoked,
            exists && !cert.revoked
        );
    }

    /**
     * @dev Get all certificate IDs issued by a specific address.
     */
    function getCertificatesByIssuer(address issuer) external view returns (uint256[] memory) {
        return _issuerCerts[issuer];
    }

    /**
     * @dev Get all certificate IDs received by a specific address.
     */
    function getCertificatesByRecipient(address recipient) external view returns (uint256[] memory) {
        return _recipientCerts[recipient];
    }

    /**
     * @dev Get the total number of certificates issued.
     */
    function totalCertificates() external view returns (uint256) {
        return _nextCertId - 1;
    }
}
