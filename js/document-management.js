// Document Management System for ZimCrowd
// Handles document uploads, verification status, and admin approvals

class DocumentManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        this.uploadProgress = {};
        this.init();
    }

    async init() {
        try {
            // Initialize Supabase client
            this.supabase = window.supabase;
            if (!this.supabase) {
                console.error('Supabase client not initialized - document management disabled');
                this.showInitializationError();
                return;
            }

            // Get current user
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            
            if (authError) {
                console.error('Authentication error:', authError);
                this.showInitializationError();
                return;
            }
            
            if (!user) {
                console.log('No authenticated user - document management disabled');
                return;
            }

            this.currentUser = user;
            console.log('Document Manager initialized for user:', user.id);

            await this.loadUserVerificationStatus();
            this.setupEventListeners();
            this.startStatusPolling();
            
        } catch (error) {
            console.error('Error initializing Document Manager:', error);
            this.showInitializationError();
        }
    }

    showInitializationError() {
        const badge = document.getElementById('verification-badge');
        if (badge) {
            badge.style.display = 'flex';
            badge.className = 'verification-badge not-verified';
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            badge.title = 'Document system unavailable - please refresh';
        }
    }

    // Load user verification status and update UI
    async loadUserVerificationStatus() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('verification_status, verification_level, kyc_completed, kyc_completed_date')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;

            this.updateVerificationBadge(profile);
            this.updateVerificationSidebar(profile);
            
            return profile;
        } catch (error) {
            console.error('Error loading verification status:', error);
        }
    }

    // Update verification badge on avatar
    updateVerificationBadge(profile) {
        const badge = document.getElementById('verification-badge');
        if (!badge) {
            console.warn('Verification badge element not found');
            return;
        }

        const { verification_status, verification_level } = profile;
        
        // Show the badge
        badge.style.display = 'flex';
        
        // Remove existing classes
        badge.className = 'verification-badge';
        
        // Add status-specific classes and content
        switch (verification_status) {
            case 'verified':
                badge.classList.add('verified');
                badge.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
                badge.title = 'KYC Verified - Full access to all features';
                break;
            case 'pending':
                badge.classList.add('pending');
                badge.innerHTML = '<i class="fas fa-clock"></i> Pending';
                badge.title = 'Documents under review';
                break;
            case 'rejected':
                badge.classList.add('rejected');
                badge.innerHTML = '<i class="fas fa-times-circle"></i> Rejected';
                badge.title = 'Some documents were rejected. Please resubmit.';
                break;
            default:
                badge.classList.add('not-verified');
                badge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Not Verified';
                badge.title = 'Complete KYC to unlock all features';
        }

        // Add level indicator if premium
        if (verification_level === 'premium') {
            badge.classList.add('premium');
            badge.innerHTML += ' <i class="fas fa-crown"></i>';
        }
    }

    // Update verification status in sidebar
    updateVerificationSidebar(profile) {
        const sidebarStatus = document.querySelector('.sidebar-verification-status');
        if (!sidebarStatus) return;

        const { verification_status, verification_level, kyc_completed_date } = profile;
        
        let statusHtml = `
            <div class="verification-info">
                <div class="verification-status ${verification_status}">
                    <i class="fas fa-${this.getStatusIcon(verification_status)}"></i>
                    <span>${this.getStatusText(verification_status)}</span>
                </div>
                <div class="verification-level">
                    Level: <strong>${verification_level.charAt(0).toUpperCase() + verification_level.slice(1)}</strong>
                </div>
        `;

        if (kyc_completed_date) {
            statusHtml += `
                <div class="verification-date">
                    Verified: ${new Date(kyc_completed_date).toLocaleDateString()}
                </div>
            `;
        }

        statusHtml += `
                <button class="btn-primary btn-sm" onclick="documentManager.openDocumentCenter()">
                    <i class="fas fa-file-upload"></i> Manage Documents
                </button>
            </div>
        `;

        sidebarStatus.innerHTML = statusHtml;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'verified': return 'check-circle';
            case 'pending': return 'clock';
            case 'rejected': return 'times-circle';
            default: return 'exclamation-circle';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'verified': return 'KYC Verified';
            case 'pending': return 'Under Review';
            case 'rejected': return 'Verification Failed';
            default: return 'Not Verified';
        }
    }

    // Open document center modal/page
    openDocumentCenter() {
        // Show loading state
        this.showDocumentCenter();
        this.loadUserDocuments();
    }

    // Show document center interface
    showDocumentCenter() {
        const modal = document.createElement('div');
        modal.className = 'document-center-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="documentManager.closeDocumentCenter()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-file-alt"></i> Document Center</h2>
                    <button class="modal-close" onclick="documentManager.closeDocumentCenter()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="document-upload-section">
                        <h3>Upload Documents</h3>
                        <div class="upload-area" id="documentUploadArea">
                            <div class="upload-content">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Drag and drop files here or click to browse</p>
                                <p class="upload-hint">Supported formats: JPG, PNG, PDF (Max 5MB)</p>
                            </div>
                            <input type="file" id="documentInput" multiple accept="image/jpeg,image/png,application/pdf" style="display: none;">
                        </div>
                        <div class="document-type-selector">
                            <select id="documentTypeSelect" class="form-select">
                                <option value="">Select Document Type</option>
                                <option value="kyc_id">National ID Card</option>
                                <option value="kyc_passport">Passport</option>
                                <option value="bank_statement">Bank Statement</option>
                                <option value="payslip">Payslip</option>
                                <option value="proof_of_address">Proof of Address</option>
                                <option value="tax_return">Tax Return</option>
                            </select>
                        </div>
                    </div>
                    <div class="document-list-section">
                        <h3>Your Documents</h3>
                        <div class="document-list" id="documentList">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i> Loading documents...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupUploadArea();
    }

    // Setup drag and drop upload area
    setupUploadArea() {
        const uploadArea = document.getElementById('documentUploadArea');
        const fileInput = document.getElementById('documentInput');
        const documentTypeSelect = document.getElementById('documentTypeSelect');

        if (!uploadArea || !fileInput) return;

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileSelection(e.dataTransfer.files);
        });

        // Document type change
        documentTypeSelect.addEventListener('change', () => {
            if (documentTypeSelect.value && fileInput.files.length > 0) {
                this.uploadDocuments(fileInput.files, documentTypeSelect.value);
            }
        });
    }

    // Handle file selection
    handleFileSelection(files) {
        const documentTypeSelect = document.getElementById('documentTypeSelect');
        
        if (!documentTypeSelect.value) {
            window.TestNotifications.warning('Document Type Required', 'Please select a document type before uploading');
            return;
        }

        this.uploadDocuments(files, documentTypeSelect.value);
    }

    // Upload documents to Supabase Storage and database
    async uploadDocuments(files, documentType) {
        try {
            for (const file of files) {
                await this.uploadSingleDocument(file, documentType);
            }
            
            window.TestNotifications.success('Documents Uploaded', 'Your documents have been submitted for verification');
            this.loadUserDocuments();
            this.loadUserVerificationStatus();
            
        } catch (error) {
            console.error('Error uploading documents:', error);
            window.TestNotifications.error('Upload Failed', error.message);
        }
    }

    // Upload single document
    async uploadSingleDocument(file, documentType) {
        // Validate file
        if (!this.validateFile(file)) {
            throw new Error(`Invalid file: ${file.name}`);
        }

        // Show progress
        this.showUploadProgress(file.name);

        try {
            // Upload to Supabase Storage
            const fileName = `${this.currentUser.id}/${documentType}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('user-documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('user-documents')
                .getPublicUrl(fileName);

            // Save to database
            const { error: dbError } = await this.supabase.rpc('upload_user_document', {
                p_user_id: this.currentUser.id,
                p_document_type: documentType,
                p_document_name: file.name,
                p_file_path: fileName,
                p_file_size: file.size,
                p_file_type: file.type
            });

            if (dbError) throw dbError;

            this.hideUploadProgress(file.name);
            
        } catch (error) {
            this.hideUploadProgress(file.name);
            throw error;
        }
    }

    // Validate file
    validateFile(file) {
        if (file.size > this.maxFileSize) {
            window.TestNotifications.error('File Too Large', 'Maximum file size is 5MB');
            return false;
        }

        if (!this.allowedTypes.includes(file.type)) {
            window.TestNotifications.error('Invalid File Type', 'Only JPG, PNG, and PDF files are allowed');
            return false;
        }

        return true;
    }

    // Show upload progress
    showUploadProgress(fileName) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'upload-progress';
        progressContainer.id = `progress-${fileName}`;
        progressContainer.innerHTML = `
            <div class="progress-item">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Uploading ${fileName}...</span>
            </div>
        `;
        
        const uploadArea = document.getElementById('documentUploadArea');
        if (uploadArea) {
            uploadArea.appendChild(progressContainer);
        }
    }

    // Hide upload progress
    hideUploadProgress(fileName) {
        const progressElement = document.getElementById(`progress-${fileName}`);
        if (progressElement) {
            progressElement.remove();
        }
    }

    // Load user documents
    async loadUserDocuments() {
        try {
            const { data: documents, error } = await this.supabase.rpc('get_user_document_summary', {
                p_user_id: this.currentUser.id
            });

            if (error) throw error;

            this.renderDocumentList(documents);
            
        } catch (error) {
            console.error('Error loading documents:', error);
            document.getElementById('documentList').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading documents
                </div>
            `;
        }
    }

    // Render document list
    renderDocumentList(documents) {
        const listContainer = document.getElementById('documentList');
        
        if (!documents || documents.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-upload"></i>
                    <p>No documents uploaded yet</p>
                </div>
            `;
            return;
        }

        const documentsHtml = documents.map(doc => {
            const statusClass = this.getDocumentStatusClass(doc.status);
            const statusIcon = this.getDocumentStatusIcon(doc.status);
            const statusText = this.getDocumentStatusText(doc.status);
            
            return `
                <div class="document-item ${statusClass}">
                    <div class="document-info">
                        <div class="document-type">
                            <i class="fas fa-${this.getDocumentIcon(doc.document_type)}"></i>
                            <span>${doc.display_name}</span>
                            ${doc.is_required ? '<span class="required-badge">Required</span>' : ''}
                        </div>
                        <div class="document-status">
                            <i class="fas fa-${statusIcon}"></i>
                            <span>${statusText}</span>
                        </div>
                        ${doc.upload_date ? `
                            <div class="document-date">
                                Uploaded: ${new Date(doc.upload_date).toLocaleDateString()}
                            </div>
                        ` : ''}
                    </div>
                    <div class="document-actions">
                        ${doc.status === 'rejected' ? `
                            <button class="btn-secondary btn-sm" onclick="documentManager.reuploadDocument('${doc.document_type}')">
                                <i class="fas fa-redo"></i> Re-upload
                            </button>
                        ` : ''}
                        ${doc.document_id ? `
                            <button class="btn-outline btn-sm" onclick="documentManager.viewDocument('${doc.document_id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = documentsHtml;
    }

    getDocumentStatusClass(status) {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'pending': return 'status-pending';
            default: return 'status-missing';
        }
    }

    getDocumentStatusIcon(status) {
        switch (status) {
            case 'approved': return 'check-circle';
            case 'rejected': return 'times-circle';
            case 'pending': return 'clock';
            default: return 'upload';
        }
    }

    getDocumentStatusText(status) {
        switch (status) {
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            case 'pending': return 'Under Review';
            default: return 'Not Uploaded';
        }
    }

    getDocumentIcon(type) {
        switch (type) {
            case 'kyc_id':
            case 'kyc_passport': return 'id-card';
            case 'bank_statement': return 'file-invoice-dollar';
            case 'payslip': return 'money-bill-wave';
            case 'proof_of_address': return 'home';
            case 'tax_return': return 'file-contract';
            default: return 'file';
        }
    }

    // Close document center
    closeDocumentCenter() {
        const modal = document.querySelector('.document-center-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Add verification badge click handler
        const verificationBadge = document.querySelector('.verification-badge');
        if (verificationBadge) {
            verificationBadge.style.cursor = 'pointer';
            verificationBadge.addEventListener('click', () => {
                this.openDocumentCenter();
            });
        }
    }

    // Start polling for verification status updates
    startStatusPolling() {
        // Poll every 30 seconds for status updates
        setInterval(async () => {
            await this.loadUserVerificationStatus();
        }, 30000);
    }

    // View document
    async viewDocument(documentId) {
        try {
            const { data: document, error } = await this.supabase
                .from('user_documents')
                .select('*')
                .eq('id', documentId)
                .single();

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('user-documents')
                .getPublicUrl(document.file_path);

            // Open in new tab
            window.open(publicUrl, '_blank');
            
        } catch (error) {
            console.error('Error viewing document:', error);
            window.TestNotifications.error('Error', 'Could not load document');
        }
    }

    // Re-upload document
    reuploadDocument(documentType) {
        const select = document.getElementById('documentTypeSelect');
        if (select) {
            select.value = documentType;
        }
        
        const input = document.getElementById('documentInput');
        if (input) {
            input.click();
        }
    }
}

// Initialize document manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.documentManager = new DocumentManager();
});
