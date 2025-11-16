import React, { useState } from 'react';
import axios from 'axios';
import './KYCDocumentUpload.css';

const KYCDocumentUpload = () => {
  const [documentType, setDocumentType] = useState('national_id');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const documentTypes = [
    { value: 'national_id', label: 'National ID (Front)', icon: '🪪' },
    { value: 'id_back', label: 'National ID (Back)', icon: '🪪' },
    { value: 'bank_statement', label: 'Bank Statement', icon: '🏦' }
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, WEBP, or PDF');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
    setExtractedData(null);

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('document_type', documentType);

      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api/profile-setup/upload-document-with-ocr`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setResult(response.data);
      
      if (response.data.data.ocr_data) {
        setExtractedData(response.data.data.ocr_data);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setExtractedData(null);
  };

  const formatFieldName = (name) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="kyc-upload-container">
      <div className="kyc-upload-card">
        <h2 className="title">📄 Upload KYC Document</h2>
        <p className="subtitle">Upload your document for automatic verification</p>

        {/* Document Type Selector */}
        <div className="document-type-selector">
          <label className="label">Select Document Type:</label>
          <div className="document-types">
            {documentTypes.map((type) => (
              <button
                key={type.value}
                className={`doc-type-btn ${documentType === type.value ? 'active' : ''}`}
                onClick={() => setDocumentType(type.value)}
                disabled={loading}
              >
                <span className="icon">{type.icon}</span>
                <span className="text">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File Upload Area */}
        {!selectedFile && (
          <div className="upload-area">
            <input
              type="file"
              id="fileInput"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="fileInput" className="upload-label">
              <div className="upload-icon">📤</div>
              <div className="upload-text">Click to upload or drag and drop</div>
              <div className="upload-hint">JPG, PNG, WEBP, or PDF (Max 5MB)</div>
            </label>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && !result && (
          <div className="preview-section">
            {preview ? (
              <img src={preview} alt="Preview" className="preview-image" />
            ) : (
              <div className="pdf-preview">
                <div className="pdf-icon">📄</div>
                <div className="pdf-name">{selectedFile.name}</div>
              </div>
            )}
            
            <div className="preview-actions">
              <button 
                className="btn btn-secondary" 
                onClick={handleClear}
                disabled={loading}
              >
                Change File
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>🚀 Upload & Process</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h3>Processing Document...</h3>
              <p>Extracting data with AI-powered OCR</p>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && extractedData && (
          <div className="result-section">
            <div className="success-header">
              <span className="success-icon">✅</span>
              <h3>Document Processed Successfully!</h3>
            </div>

            {/* Auto-fill notification */}
            {result.data.auto_filled && (
              <div className="alert alert-success">
                <span className="alert-icon">✨</span>
                <div>
                  <strong>Profile Auto-Filled!</strong>
                  <p>We've automatically filled your profile with data from your ID.</p>
                </div>
              </div>
            )}

            {/* OCR Confidence */}
            <div className="confidence-badge">
              <span className="confidence-label">OCR Confidence:</span>
              <span className="confidence-value">{extractedData.confidence}%</span>
            </div>

            {/* Extracted Fields */}
            <div className="extracted-fields">
              <h4>📋 Extracted Information</h4>
              <div className="fields-grid">
                {Object.entries(extractedData.extracted_fields).map(([key, value]) => (
                  <div key={key} className="field-item">
                    <label className="field-label">{formatFieldName(key)}:</label>
                    <div className="field-value">{value || 'Not found'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Face Detection */}
            {extractedData.face_detected && (
              <div className="face-detection">
                <span className="face-icon">👤</span>
                <span>Face detected on document</span>
                {extractedData.face_count && (
                  <span className="face-count">({extractedData.face_count} face{extractedData.face_count > 1 ? 's' : ''})</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="result-actions">
              <button className="btn btn-secondary" onClick={handleClear}>
                Upload Another
              </button>
              <button className="btn btn-primary" onClick={() => window.location.href = '/profile'}>
                Continue to Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KYCDocumentUpload;
