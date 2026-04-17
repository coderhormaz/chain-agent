import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ShieldCheck, ShieldX, AlertTriangle, Search, ArrowLeft, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { CertificateService, type CertificateData } from '../services/certificateService';
import { shortenAddress, copyToClipboard } from '../lib/utils';

const VerifyPage: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(certId || '');
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (certId) {
      handleVerify(certId);
    }
  }, [certId]);

  const handleVerify = async (id?: string) => {
    const idToVerify = id || searchId;
    if (!idToVerify) return;

    const parsed = parseInt(idToVerify, 10);
    if (isNaN(parsed) || parsed <= 0) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await CertificateService.verifyCertificate(parsed);
      setCertificate(data);

      // Generate QR
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const url = `${appUrl}/verify/${parsed}`;
      const qr = await QRCode.toDataURL(url, { width: 160, margin: 2 });
      setQrDataUrl(qr);
    } catch (e) {
      console.error('Verification failed:', e);
      setCertificate(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const explorerBase = import.meta.env.VITE_OPBNB_EXPLORER || 'https://opbnb.bscscan.com';

  const exists = certificate && certificate.issuedAt > 0;

  return (
    <div className="verify-page">
      {/* Background decoration */}
      <div className="verify-bg-glow" />

      {/* Nav bar */}
      <header className="verify-nav">
        <button className="verify-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          opBNB AI
        </button>
        <span className="verify-nav-badge">Certificate Verification</span>
      </header>

      {/* Main content */}
      <main className="verify-main">
        {/* Search */}
        <div className="verify-search-section">
          <h1 className="verify-title">Verify a Certificate</h1>
          <p className="verify-subtitle">
            Enter a certificate ID to verify its authenticity on the opBNB blockchain.
            No account required.
          </p>
          <div className="verify-search-bar">
            <input
              type="text"
              placeholder="Enter Certificate ID (e.g. 1)"
              value={searchId}
              onChange={e => setSearchId(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
            <button onClick={() => handleVerify()} disabled={isLoading || !searchId}>
              {isLoading ? (
                <span className="verify-spinner" />
              ) : (
                <Search size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        {hasSearched && !isLoading && (
          <div className="verify-result">
            {!exists ? (
              // Not found
              <div className="verify-card verify-card--notfound">
                <AlertTriangle size={48} />
                <h2>Certificate Not Found</h2>
                <p>No certificate with this ID exists on the blockchain. Please check the ID and try again.</p>
              </div>
            ) : (
              // Certificate found
              <div className={`verify-card ${certificate!.isValid ? 'verify-card--valid' : 'verify-card--revoked'}`}>
                {/* Status banner */}
                <div className="verify-status-banner">
                  {certificate!.isValid ? (
                    <>
                      <ShieldCheck size={28} />
                      <div>
                        <h2>Certificate Verified</h2>
                        <p>This certificate is authentic and has not been revoked.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldX size={28} />
                      <div>
                        <h2>Certificate Revoked</h2>
                        <p>This certificate was revoked by the issuing institution.</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="verify-details">
                  {certificate!.metadata?.course && (
                    <div className="verify-detail-row verify-detail-row--highlight">
                      <span className="verify-detail-label">Course / Program</span>
                      <span className="verify-detail-value">{certificate!.metadata.course}</span>
                    </div>
                  )}
                  {certificate!.metadata?.institution && (
                    <div className="verify-detail-row">
                      <span className="verify-detail-label">Institution</span>
                      <span className="verify-detail-value">{certificate!.metadata.institution}</span>
                    </div>
                  )}
                  {certificate!.metadata?.recipientName && (
                    <div className="verify-detail-row">
                      <span className="verify-detail-label">Recipient</span>
                      <span className="verify-detail-value">{certificate!.metadata.recipientName}</span>
                    </div>
                  )}
                  {certificate!.metadata?.certificateType && (
                    <div className="verify-detail-row">
                      <span className="verify-detail-label">Type</span>
                      <span className="verify-detail-value" style={{ textTransform: 'capitalize' }}>
                        {certificate!.metadata.certificateType}
                      </span>
                    </div>
                  )}
                  {certificate!.metadata?.grade && (
                    <div className="verify-detail-row">
                      <span className="verify-detail-label">Grade</span>
                      <span className="verify-detail-value">{certificate!.metadata.grade}</span>
                    </div>
                  )}
                  <div className="verify-detail-row">
                    <span className="verify-detail-label">Issued Date</span>
                    <span className="verify-detail-value">{formatDate(certificate!.issuedAt)}</span>
                  </div>
                  <div className="verify-detail-row">
                    <span className="verify-detail-label">Certificate ID</span>
                    <span className="verify-detail-value verify-detail-value--mono">#{certificate!.certId}</span>
                  </div>
                  <div className="verify-detail-row">
                    <span className="verify-detail-label">Issuer Wallet</span>
                    <span className="verify-detail-value verify-detail-value--mono">
                      {shortenAddress(certificate!.issuer)}
                      <button className="verify-copy-btn" onClick={() => handleCopy(certificate!.issuer)}>
                        {copiedText === certificate!.issuer ? <CheckCircle size={13} /> : <Copy size={13} />}
                      </button>
                      <a href={`${explorerBase}/address/${certificate!.issuer}`} target="_blank" rel="noopener noreferrer" className="verify-explorer-link">
                        <ExternalLink size={13} />
                      </a>
                    </span>
                  </div>
                  <div className="verify-detail-row">
                    <span className="verify-detail-label">Recipient Wallet</span>
                    <span className="verify-detail-value verify-detail-value--mono">
                      {shortenAddress(certificate!.recipient)}
                      <button className="verify-copy-btn" onClick={() => handleCopy(certificate!.recipient)}>
                        {copiedText === certificate!.recipient ? <CheckCircle size={13} /> : <Copy size={13} />}
                      </button>
                    </span>
                  </div>
                  {certificate!.metadata?.description && (
                    <div className="verify-detail-row verify-detail-row--full">
                      <span className="verify-detail-label">Description</span>
                      <span className="verify-detail-value">{certificate!.metadata.description}</span>
                    </div>
                  )}
                </div>

                {/* QR + Blockchain proof */}
                <div className="verify-proof-section">
                  <div className="verify-qr-col">
                    {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="verify-qr-image" />}
                    <p className="verify-qr-caption">Scan to share</p>
                  </div>
                  <div className="verify-proof-col">
                    <h4>Blockchain Proof</h4>
                    <p>This certificate is recorded on the <strong>opBNB</strong> blockchain and cannot be tampered with or forged.</p>
                    <p className="verify-ipfs-link">
                      IPFS: <a href={`https://gateway.lighthouse.storage/ipfs/${certificate!.ipfsHash}`} target="_blank" rel="noopener noreferrer">
                        {certificate!.ipfsHash.slice(0, 16)}...
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="verify-footer">
        <p>Powered by opBNB Blockchain &middot; Decentralized Certificate Verification</p>
      </footer>
    </div>
  );
};

export default VerifyPage;
