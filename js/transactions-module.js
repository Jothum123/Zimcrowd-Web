/**
 * Transactions Module
 * Transaction history with filters and export functionality
 */

const TransactionsModule = {
    transactionsData: null,
    currentPage: 1,
    
    async loadTransactions(page = 1) {
        const container = document.getElementById('transactionsContent');
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading transactions...</p></div>';
        
        try {
            this.currentPage = page;
            this.transactionsData = await window.DashboardData.fetchTransactions(page, 20);
            this.renderTransactions();
        } catch (error) {
            console.error('Error loading transactions:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Failed to load transactions</p>
                    <button class="btn btn-primary" onclick="TransactionsModule.loadTransactions()">Retry</button>
                </div>
            `;
        }
    },
    
    renderTransactions() {
        const container = document.getElementById('transactionsContent');
        const transactions = this.transactionsData?.transactions || [];
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exchange-alt" style="font-size: 4rem; color: var(--text-secondary); opacity: 0.3; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-secondary);">No Transactions Yet</h3>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <input type="text" class="form-input" id="searchTransactions" placeholder="Search transactions..." style="flex: 1; min-width: 200px;">
                <select class="form-select" id="filterType" onchange="TransactionsModule.applyFilters()" style="width: auto;">
                    <option value="">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="loan">Loan</option>
                    <option value="investment">Investment</option>
                    <option value="repayment">Repayment</option>
                </select>
                <select class="form-select" id="filterStatus" onchange="TransactionsModule.applyFilters()" style="width: auto;">
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </select>
            </div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="transactionsTableBody">
                    ${transactions.map(tx => `
                        <tr>
                            <td>${window.DashboardCore.formatDate(tx.created_at)}</td>
                            <td><span class="badge info">${tx.type}</span></td>
                            <td>${tx.description || '-'}</td>
                            <td style="font-weight: 600; color: ${tx.amount >= 0 ? 'var(--success)' : 'var(--danger)'};">
                                ${tx.amount >= 0 ? '+' : ''}${window.DashboardCore.formatCurrency(tx.amount)}
                            </td>
                            <td><span class="badge ${window.DashboardCore.getStatusBadgeClass(tx.status)}">${tx.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            ${this.renderPagination()}
        `;
        
        // Add search listener
        document.getElementById('searchTransactions').addEventListener('input', (e) => {
            this.searchTransactions(e.target.value);
        });
    },
    
    renderPagination() {
        const { page, totalPages } = this.transactionsData;
        
        if (totalPages <= 1) return '';
        
        return `
            <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1.5rem;">
                <button class="btn btn-outline btn-sm" onclick="TransactionsModule.loadTransactions(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span style="padding: 0.5rem 1rem; color: var(--text-secondary);">
                    Page ${page} of ${totalPages}
                </span>
                <button class="btn btn-outline btn-sm" onclick="TransactionsModule.loadTransactions(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    },
    
    applyFilters() {
        const type = document.getElementById('filterType').value;
        const status = document.getElementById('filterStatus').value;
        
        const tbody = document.getElementById('transactionsTableBody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const rowType = row.cells[1].textContent.toLowerCase();
            const rowStatus = row.cells[4].textContent.toLowerCase();
            
            const typeMatch = !type || rowType.includes(type);
            const statusMatch = !status || rowStatus.includes(status);
            
            row.style.display = (typeMatch && statusMatch) ? '' : 'none';
        });
    },
    
    searchTransactions(query) {
        const tbody = document.getElementById('transactionsTableBody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    },
    
    async exportTransactions() {
        const format = document.getElementById('exportFormat').value;
        
        if (!format) {
            window.DashboardCore.showError('Please select an export format');
            return;
        }
        
        const transactions = this.transactionsData?.transactions || [];
        
        if (transactions.length === 0) {
            window.DashboardCore.showError('No transactions to export');
            return;
        }
        
        switch(format) {
            case 'xlsx':
            case 'xls':
                this.exportToExcel(transactions, format);
                break;
            case 'csv':
                this.exportToCSV(transactions);
                break;
            case 'pdf':
                this.exportToPDF(transactions);
                break;
            case 'txt':
                this.exportToTXT(transactions);
                break;
        }
    },
    
    exportToExcel(transactions, format) {
        const data = transactions.map(tx => ({
            'Date': new Date(tx.created_at).toLocaleDateString(),
            'Type': tx.type,
            'Description': tx.description || '-',
            'Amount': tx.amount,
            'Status': tx.status
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        
        XLSX.writeFile(wb, `transactions.${format}`);
        window.DashboardCore.showSuccess('Transactions exported successfully!');
    },
    
    exportToCSV(transactions) {
        const headers = ['Date', 'Type', 'Description', 'Amount', 'Status'];
        const rows = transactions.map(tx => [
            new Date(tx.created_at).toLocaleDateString(),
            tx.type,
            tx.description || '-',
            tx.amount,
            tx.status
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.csv';
        a.click();
        
        window.DashboardCore.showSuccess('Transactions exported successfully!');
    },
    
    exportToPDF(transactions) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Transaction History', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        
        const tableData = transactions.map(tx => [
            new Date(tx.created_at).toLocaleDateString(),
            tx.type,
            tx.description || '-',
            `$${tx.amount.toFixed(2)}`,
            tx.status
        ]);
        
        doc.autoTable({
            head: [['Date', 'Type', 'Description', 'Amount', 'Status']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [56, 224, 123] }
        });
        
        doc.save('transactions.pdf');
        window.DashboardCore.showSuccess('Transactions exported successfully!');
    },
    
    exportToTXT(transactions) {
        let txt = 'TRANSACTION HISTORY\n';
        txt += '='.repeat(80) + '\n\n';
        txt += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        transactions.forEach(tx => {
            txt += `Date: ${new Date(tx.created_at).toLocaleDateString()}\n`;
            txt += `Type: ${tx.type}\n`;
            txt += `Description: ${tx.description || '-'}\n`;
            txt += `Amount: $${tx.amount.toFixed(2)}\n`;
            txt += `Status: ${tx.status}\n`;
            txt += '-'.repeat(80) + '\n\n';
        });
        
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.txt';
        a.click();
        
        window.DashboardCore.showSuccess('Transactions exported successfully!');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('exportBtn')?.addEventListener('click', () => {
        TransactionsModule.exportTransactions();
    });
});

window.TransactionsModule = TransactionsModule;
console.log('✅ Transactions Module loaded');
