import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Copy, CheckCircle, ExternalLink, Clock, ShieldCheck, ShieldX, Send, X, RefreshCw, Building2, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { useCertificateStore } from '../../store/certificateStore';
import { CertificateService, type CertificateData } from '../../services/certificateService';
import { WalletService } from '../../lib/wallet';
import { shortenAddress, copyToClipboard } from '../../lib/utils';

const Certificates: React.FC = () => {
  const { wallet } = useWalletStore();
  const { user, isInitialized } = useAuthStore();
  const {
    myCertificates,
    issuedCertificates,
    isApprovedIssuer,
    issuerRecord,
    isLoadingMyCerts,
    isLoadingIssuedCerts,
    fetchMyCertificates,
    fetchIssuedCertificates,
    checkIssuerStatus
  } = useCertificateStore();

  const [activeView, setActiveView] = useState<'received' | 'issued' | 'issue'>('received');
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Issue form state
  const [issueForm, setIssueForm] = useState({
    recipientWallet: '',
    recipientName: '',
    institution: '',
    course: '',
    grade: '',
    certificateType: 'completion' as 'completion' | 'achievement' | 'credential' | 'degree',
    description: ''
  });
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  // Issuer request form
  const [showIssuerRequest, setShowIssuerRequest] = useState(false);
  const [issuerRequestForm, setIssuerRequestForm] = useState({
    institutionName: '',
    institutionType: 'university' as string,
    description: ''
  });
  const [isRequestingIssuer, setIsRequestingIssuer] = useState(false);

  // Revoke state
  const [revokingCertId, setRevokingCertId] = useState<number | null>(null);

  // Load data on mount — wait for Supabase session to be ready (isInitialized)
  // so that RLS policies can evaluate auth.uid() correctly
  useEffect(() => {
    if (isInitialized && wallet?.address && user?.id) {
      checkIssuerStatus(user.id);
      fetchMyCertificates(wallet.address);
    }
  }, [isInitialized, wallet?.address, user?.id]);

  useEffect(() => {
    if (isApprovedIssuer && wallet?.address) {
      fetchIssuedCertificates(wallet.address);
    }
  }, [isApprovedIssuer, wallet?.address]);

  // Generate QR code when a certificate is selected
  useEffect(() => {
    if (selectedCert) {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const verifyUrl = `${appUrl}/verify/${selectedCert.certId}`;
      QRCode.toDataURL(verifyUrl, { width: 200, margin: 2 })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [selectedCert]);

  const handleCopy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const handleDownloadPDF = (cert: CertificateData) => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const verifyUrl = `${appUrl}/verify/${cert.certId}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Certificate #${cert.certId}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#1a1a1a;padding:40px}
.cert{max-width:700px;margin:0 auto;border:3px solid #1a1a1a;border-radius:12px;padding:48px;text-align:center;position:relative}
.cert::before{content:'';position:absolute;inset:8px;border:1px solid #ccc;border-radius:8px;pointer-events:none}
.badge{display:inline-block;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px}
.valid{background:#dcfce7;color:#166534}.revoked{background:#fce4ec;color:#b71c1c}
h1{font-size:28px;font-weight:700;margin-bottom:6px}
.inst{font-size:16px;color:#666;margin-bottom:32px}
.label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888;margin-bottom:4px}
.value{font-size:16px;font-weight:500;margin-bottom:20px}
.row{display:flex;justify-content:space-between;text-align:left;gap:24px;margin-top:24px;padding-top:24px;border-top:1px solid #eee}
.row div{flex:1}
.mono{font-family:monospace;font-size:12px;word-break:break-all;color:#555}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999}
.verify{margin-top:8px;font-size:12px;color:#2563eb}
@media print{body{padding:20px}.cert{border-width:2px}}
</style></head><body>
<div class="cert">
<div class="badge ${cert.isValid ? 'valid' : 'revoked'}">${cert.isValid ? '✓ Verified Certificate' : '✗ Revoked'}</div>
<h1>${cert.metadata?.course || 'Certificate #' + cert.certId}</h1>
<p class="inst">${cert.metadata?.institution || ''}</p>
${cert.metadata?.recipientName ? `<p class="label">Awarded To</p><p class="value">${cert.metadata.recipientName}</p>` : ''}
${cert.metadata?.grade ? `<p class="label">Grade</p><p class="value">${cert.metadata.grade}</p>` : ''}
${cert.metadata?.certificateType ? `<p class="label">Type</p><p class="value" style="text-transform:capitalize">${cert.metadata.certificateType}</p>` : ''}
<p class="label">Date Issued</p><p class="value">${formatDate(cert.issuedAt)}</p>
${cert.metadata?.description ? `<p class="label">Description</p><p class="value">${cert.metadata.description}</p>` : ''}
<div class="row">
<div><p class="label">Recipient Wallet</p><p class="mono">${cert.recipient}</p></div>
<div><p class="label">Issuer Wallet</p><p class="mono">${cert.issuer}</p></div>
</div>
<div class="row">
<div><p class="label">Certificate ID</p><p class="mono">#${cert.certId}</p></div>
<div><p class="label">Blockchain</p><p class="mono">opBNB Mainnet (Chain 204)</p></div>
</div>
<div class="footer">
<p>This certificate is permanently recorded on the opBNB blockchain and can be independently verified.</p>
<p class="verify">Verify: ${verifyUrl}</p>
</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
    printWindow.document.close();
  };

  const handleIssueCertificate = async () => {
    if (!wallet?.privateKey) return;
    if (!issueForm.recipientWallet || !issueForm.recipientName || !issueForm.institution || !issueForm.course) {
      setIssueError('Please fill in all required fields');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(issueForm.recipientWallet)) {
      setIssueError('Invalid wallet address format');
      return;
    }

    setIsIssuing(true);
    setIssueError('');
    setIssueSuccess('');

    try {
      const privateKey = WalletService.decryptPrivateKey(wallet.privateKey);
      const result = await CertificateService.issueCertificate({
        recipientName: issueForm.recipientName,
        recipientWallet: issueForm.recipientWallet,
        institution: issueForm.institution,
        course: issueForm.course,
        grade: issueForm.grade || undefined,
        certificateType: issueForm.certificateType,
        dateIssued: new Date().toISOString(),
        description: issueForm.description || undefined,
        issuerWallet: wallet.address
      }, privateKey);

      if (result.success) {
        setIssueSuccess(`Certificate #${result.certId} issued successfully!`);
        setIssueForm({ recipientWallet: '', recipientName: '', institution: '', course: '', grade: '', certificateType: 'completion', description: '' });
        fetchIssuedCertificates(wallet.address);
      } else {
        setIssueError(result.error || 'Failed to issue certificate');
      }
    } catch (error: any) {
      setIssueError(error.message || 'Failed to issue certificate');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRevoke = async (certId: number) => {
    if (!wallet?.privateKey) return;
    setRevokingCertId(certId);
    try {
      const privateKey = WalletService.decryptPrivateKey(wallet.privateKey);
      await CertificateService.revokeCertificate(certId, privateKey);
      fetchIssuedCertificates(wallet.address);
    } catch (error) {
      console.error('Revoke failed:', error);
    } finally {
      setRevokingCertId(null);
    }
  };

  const handleRequestIssuer = async () => {
    if (!issuerRequestForm.institutionName) return;
    setIsRequestingIssuer(true);
    try {
      const result = await CertificateService.requestIssuerRole(
        issuerRequestForm.institutionName,
        issuerRequestForm.institutionType,
        issuerRequestForm.description
      );
      if (result.success) {
        setShowIssuerRequest(false);
        if (user?.id) checkIssuerStatus(user.id);
      } else {
        setIssueError(result.error || 'Failed to submit request');
      }
    } catch (error: any) {
      setIssueError(error.message);
    } finally {
      setIsRequestingIssuer(false);
    }
  };

  const handleRefresh = () => {
    if (!wallet?.address || !user?.id) return;
    checkIssuerStatus(user.id);
    fetchMyCertificates(wallet.address);
    if (isApprovedIssuer) fetchIssuedCertificates(wallet.address);
  };

  // ── Certificate card renderer ──
  const renderCertCard = (cert: CertificateData, index: number, showIssuerActions = false) => (
    <motion.div
      key={cert.certId}
      className="cert-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={() => setSelectedCert(cert)}
    >
      <div className="cert-card-header">
        <div className={`cert-status-badge ${cert.isValid ? 'cert-status--valid' : 'cert-status--revoked'}`}>
          {cert.isValid ? <ShieldCheck size={13} /> : <ShieldX size={13} />}
          {cert.isValid ? 'Valid' : 'Revoked'}
        </div>
        <span className="cert-id">#{cert.certId}</span>
      </div>

      <div className="cert-card-body">
        <h3 className="cert-course">{cert.metadata?.course || `Certificate #${cert.certId}`}</h3>
        <p className="cert-institution">{cert.metadata?.institution || shortenAddress(cert.issuer)}</p>
        {cert.metadata?.recipientName && (
          <p className="cert-recipient-name">{cert.metadata.recipientName}</p>
        )}
      </div>

      <div className="cert-card-footer">
        <span className="cert-date">
          <Clock size={12} />
          {formatDate(cert.issuedAt)}
        </span>
        {showIssuerActions && cert.isValid && (
          <button
            className="cert-revoke-btn"
            onClick={(e) => { e.stopPropagation(); handleRevoke(cert.certId); }}
            disabled={revokingCertId === cert.certId}
          >
            {revokingCertId === cert.certId ? 'Revoking...' : 'Revoke'}
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="certs-container">
      {/* Header */}
      <div className="page-header">
        <h1>Certificates</h1>
        <div className="page-header-actions">
          <button className="page-header-btn" onClick={handleRefresh} title="Refresh">
            <RefreshCw size={15} />
          </button>
          {isApprovedIssuer && (
            <button
              className="page-header-btn page-header-btn--primary"
              onClick={() => setActiveView('issue')}
            >
              + Issue Certificate
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="cert-tabs">
        <button
          className={`cert-tab ${activeView === 'received' ? 'cert-tab--active' : ''}`}
          onClick={() => setActiveView('received')}
        >
          Received ({myCertificates.length})
        </button>
        {isApprovedIssuer && (
          <>
            <button
              className={`cert-tab ${activeView === 'issued' ? 'cert-tab--active' : ''}`}
              onClick={() => setActiveView('issued')}
            >
              Issued ({issuedCertificates.length})
            </button>
            <button
              className={`cert-tab ${activeView === 'issue' ? 'cert-tab--active' : ''}`}
              onClick={() => setActiveView('issue')}
            >
              Issue New
            </button>
          </>
        )}
      </div>

      {/* ── Received Certificates ── */}
      {activeView === 'received' && (
        <div className="cert-grid">
          {isLoadingMyCerts ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="cert-card loading">
                <div className="skeleton-line w-40" style={{ height: 20, marginBottom: 12 }} />
                <div className="skeleton-line w-80" style={{ height: 16, marginBottom: 8 }} />
                <div className="skeleton-line w-60" style={{ height: 14 }} />
              </div>
            ))
          ) : myCertificates.length === 0 ? (
            <div className="no-certs">
              <div className="no-certs-icon"><Award size={40} /></div>
              <h3>No certificates yet</h3>
              <p>Certificates you receive from institutions will appear here.</p>
              {!isApprovedIssuer && !issuerRecord && (
                <button className="empty-state-btn" onClick={() => setShowIssuerRequest(true)}>
                  <Building2 size={14} /> Request Issuer Role
                </button>
              )}
              {issuerRecord && !issuerRecord.approved && (
                <p className="cert-pending-text">Your issuer request is pending approval.</p>
              )}
            </div>
          ) : (
            myCertificates.map((cert, i) => renderCertCard(cert, i))
          )}
        </div>
      )}

      {/* ── Issued Certificates ── */}
      {activeView === 'issued' && isApprovedIssuer && (
        <div className="cert-grid">
          {isLoadingIssuedCerts ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="cert-card loading">
                <div className="skeleton-line w-40" style={{ height: 20, marginBottom: 12 }} />
                <div className="skeleton-line w-80" style={{ height: 16, marginBottom: 8 }} />
                <div className="skeleton-line w-60" style={{ height: 14 }} />
              </div>
            ))
          ) : issuedCertificates.length === 0 ? (
            <div className="no-certs">
              <div className="no-certs-icon"><Send size={40} /></div>
              <h3>No certificates issued</h3>
              <p>Issue your first certificate to a student.</p>
              <button className="empty-state-btn" onClick={() => setActiveView('issue')}>
                Issue Certificate
              </button>
            </div>
          ) : (
            issuedCertificates.map((cert, i) => renderCertCard(cert, i, true))
          )}
        </div>
      )}

      {/* ── Issue Certificate Form ── */}
      {activeView === 'issue' && isApprovedIssuer && (
        <motion.div
          className="cert-issue-form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="cert-form-title">Issue a New Certificate</h2>

          {issueError && <div className="cert-alert cert-alert--error">{issueError}</div>}
          {issueSuccess && <div className="cert-alert cert-alert--success">{issueSuccess}</div>}

          <div className="cert-form-grid">
            <div className="cert-field">
              <label>Recipient Wallet Address *</label>
              <input
                type="text"
                placeholder="0x..."
                value={issueForm.recipientWallet}
                onChange={e => setIssueForm(f => ({ ...f, recipientWallet: e.target.value }))}
              />
            </div>
            <div className="cert-field">
              <label>Recipient Name *</label>
              <input
                type="text"
                placeholder="Student full name"
                value={issueForm.recipientName}
                onChange={e => setIssueForm(f => ({ ...f, recipientName: e.target.value }))}
              />
            </div>
            <div className="cert-field">
              <label>Institution Name *</label>
              <input
                type="text"
                placeholder="University of..."
                value={issueForm.institution}
                onChange={e => setIssueForm(f => ({ ...f, institution: e.target.value }))}
              />
            </div>
            <div className="cert-field">
              <label>Course / Program *</label>
              <input
                type="text"
                placeholder="BSc Computer Science"
                value={issueForm.course}
                onChange={e => setIssueForm(f => ({ ...f, course: e.target.value }))}
              />
            </div>
            <div className="cert-field">
              <label>Grade (optional)</label>
              <input
                type="text"
                placeholder="First Class Honours"
                value={issueForm.grade}
                onChange={e => setIssueForm(f => ({ ...f, grade: e.target.value }))}
              />
            </div>
            <div className="cert-field">
              <label>Certificate Type</label>
              <select
                value={issueForm.certificateType}
                onChange={e => setIssueForm(f => ({ ...f, certificateType: e.target.value as any }))}
              >
                <option value="completion">Completion</option>
                <option value="degree">Degree</option>
                <option value="achievement">Achievement</option>
                <option value="credential">Credential</option>
              </select>
            </div>
            <div className="cert-field cert-field--full">
              <label>Description (optional)</label>
              <textarea
                placeholder="Additional details about this certificate..."
                value={issueForm.description}
                onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <button
            className="cert-submit-btn"
            onClick={handleIssueCertificate}
            disabled={isIssuing}
          >
            {isIssuing ? 'Issuing on Blockchain...' : '🎓 Issue Certificate'}
          </button>
        </motion.div>
      )}

      {/* ── Certificate Detail Modal ── */}
      <AnimatePresence>
        {selectedCert && (
          <motion.div
            className="cert-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCert(null)}
          >
            <motion.div
              className="cert-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="cert-modal-close" onClick={() => setSelectedCert(null)}>
                <X size={18} />
              </button>

              <div className="cert-modal-header">
                <div className={`cert-status-badge cert-status-badge--lg ${selectedCert.isValid ? 'cert-status--valid' : 'cert-status--revoked'}`}>
                  {selectedCert.isValid ? <ShieldCheck size={18} /> : <ShieldX size={18} />}
                  {selectedCert.isValid ? 'Valid Certificate' : 'Revoked'}
                </div>
                <h2>{selectedCert.metadata?.course || `Certificate #${selectedCert.certId}`}</h2>
                <p className="cert-modal-institution">{selectedCert.metadata?.institution}</p>
              </div>

              <div className="cert-modal-details">
                {selectedCert.metadata?.recipientName && (
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Recipient</span>
                    <span className="cert-detail-value">{selectedCert.metadata.recipientName}</span>
                  </div>
                )}
                <div className="cert-detail-row">
                  <span className="cert-detail-label">Recipient Wallet</span>
                  <span className="cert-detail-value cert-detail-value--mono">
                    {shortenAddress(selectedCert.recipient)}
                    <button className="cert-copy-btn" onClick={() => handleCopy(selectedCert.recipient)}>
                      {copiedText === selectedCert.recipient ? <CheckCircle size={13} /> : <Copy size={13} />}
                    </button>
                  </span>
                </div>
                <div className="cert-detail-row">
                  <span className="cert-detail-label">Issuer Wallet</span>
                  <span className="cert-detail-value cert-detail-value--mono">
                    {shortenAddress(selectedCert.issuer)}
                    <button className="cert-copy-btn" onClick={() => handleCopy(selectedCert.issuer)}>
                      {copiedText === selectedCert.issuer ? <CheckCircle size={13} /> : <Copy size={13} />}
                    </button>
                  </span>
                </div>
                {selectedCert.metadata?.certificateType && (
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Type</span>
                    <span className="cert-detail-value" style={{ textTransform: 'capitalize' }}>
                      {selectedCert.metadata.certificateType}
                    </span>
                  </div>
                )}
                {selectedCert.metadata?.grade && (
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Grade</span>
                    <span className="cert-detail-value">{selectedCert.metadata.grade}</span>
                  </div>
                )}
                <div className="cert-detail-row">
                  <span className="cert-detail-label">Issued</span>
                  <span className="cert-detail-value">{formatDate(selectedCert.issuedAt)}</span>
                </div>
                <div className="cert-detail-row">
                  <span className="cert-detail-label">Certificate ID</span>
                  <span className="cert-detail-value cert-detail-value--mono">#{selectedCert.certId}</span>
                </div>
                {selectedCert.metadata?.description && (
                  <div className="cert-detail-row cert-detail-row--full">
                    <span className="cert-detail-label">Description</span>
                    <span className="cert-detail-value">{selectedCert.metadata.description}</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="cert-qr-section">
                <p className="cert-qr-label">Scan to verify</p>
                {qrDataUrl && <img src={qrDataUrl} alt="Verification QR" className="cert-qr-code" />}
                <button
                  className="cert-verify-link-btn"
                  onClick={() => {
                    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
                    handleCopy(`${appUrl}/verify/${selectedCert.certId}`);
                  }}
                >
                  {copiedText?.includes('/verify/') ? <CheckCircle size={13} /> : <ExternalLink size={13} />}
                  {copiedText?.includes('/verify/') ? 'Copied!' : 'Copy Verification Link'}
                </button>
                <button
                  className="cert-verify-link-btn"
                  onClick={() => handleDownloadPDF(selectedCert)}
                >
                  <Download size={13} />
                  Download as PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Issuer Request Modal ── */}
      <AnimatePresence>
        {showIssuerRequest && (
          <motion.div
            className="cert-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIssuerRequest(false)}
          >
            <motion.div
              className="cert-modal cert-modal--sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="cert-modal-close" onClick={() => setShowIssuerRequest(false)}>
                <X size={18} />
              </button>
              <h2 style={{ marginBottom: '0.5rem' }}>Request Issuer Role</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '1.25rem' }}>
                Submit a request to become an approved certificate issuer. An admin will review your request.
              </p>

              <div className="cert-field" style={{ marginBottom: '0.75rem' }}>
                <label>Institution Name *</label>
                <input
                  type="text"
                  placeholder="e.g. University of Mumbai"
                  value={issuerRequestForm.institutionName}
                  onChange={e => setIssuerRequestForm(f => ({ ...f, institutionName: e.target.value }))}
                />
              </div>
              <div className="cert-field" style={{ marginBottom: '0.75rem' }}>
                <label>Type</label>
                <select
                  value={issuerRequestForm.institutionType}
                  onChange={e => setIssuerRequestForm(f => ({ ...f, institutionType: e.target.value }))}
                >
                  <option value="university">University</option>
                  <option value="training">Training Center</option>
                  <option value="professional">Professional Body</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="cert-field" style={{ marginBottom: '1rem' }}>
                <label>Description</label>
                <textarea
                  placeholder="Brief description of your institution..."
                  value={issuerRequestForm.description}
                  onChange={e => setIssuerRequestForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <button
                className="cert-submit-btn"
                onClick={handleRequestIssuer}
                disabled={isRequestingIssuer || !issuerRequestForm.institutionName}
              >
                {isRequestingIssuer ? 'Submitting...' : 'Submit Request'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Certificates;
