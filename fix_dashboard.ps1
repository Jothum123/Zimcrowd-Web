$file = "c:\Users\Bruce M\Desktop\Zimcrowd-Web\admin-dashboard-standalone.html"
$lines = Get-Content $file -TotalCount 1770
$newContent = @"
    <script>
        // Admin Authentication
        const API_KEY_STORAGE = 'zimcrowd_admin_key';
        let adminApiKey = localStorage.getItem(API_KEY_STORAGE);

        // Check for API key on load
        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            if (adminApiKey) {
                initDashboard();
            }
        });

        function checkAuth() {
            if (!adminApiKey) {
                const key = prompt('Please enter Admin API Key (Dev: admin-dev-key-123):');
                if (key) {
                    adminApiKey = key;
                    localStorage.setItem(API_KEY_STORAGE, key);
                    initDashboard();
                } else {
                    alert('Admin access required. Reload to try again.');
                    document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;gap:20px;"><h1>Access Denied</h1><button onclick="location.reload()" style="padding:10px 20px;cursor:pointer;">Retry Login</button></div>';
                }
            }
        }

        // Initialize Dashboard
        function initDashboard() {
            // Initialize Charts (Placeholders for now)
            initRevenueChart();
            initPortfolioChart();
            initUserChart();
            initZimScoreChart();
            initLoanChart();
            initInvestmentChart();
            initAICharts();

            // Load Initial Data
            fetchDashboardData();
            
            // Set up auto-refresh
            setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
        }

        // API Helper
        async function fetchApi(endpoint) {
            try {
                const response = await fetch(`/api/admin-dashboard${endpoint}`, {
                    headers: {
                        'x-admin-key': adminApiKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem(API_KEY_STORAGE);
                    location.reload();
                    throw new Error('Unauthorized');
                }

                if (!response.ok) {
                    throw new Error(`API Error: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                console.error(`Error fetching ${endpoint}:`, error);
                return null;
            }
        }

        // Data Fetching
        async function fetchDashboardData() {
            updateStatusIndicator('loading');
            
            try {
                // Parallel data fetching
                const [overview, userStats, loanStats, aiMetrics, recentActivity] = await Promise.all([
                    fetchApi('/overview'),
                    fetchApi('/stats/users'),
                    fetchApi('/stats/loans'),
                    fetchApi('/ai/monitoring'),
                    fetchApi('/activity/recent?limit=5')
                ]);

                if (overview) updateOverview(overview);
                if (userStats) updateUserStats(userStats.data);
                if (loanStats) updateLoanStats(loanStats.data);
                if (aiMetrics) updateAIMetrics(aiMetrics);
                if (recentActivity) updateRecentActivity(recentActivity.data);

                updateStatusIndicator('active');
            } catch (error) {
                console.error('Dashboard update failed:', error);
                updateStatusIndicator('error');
            }
        }

        // UI Update Functions
        function updateOverview(data) {
            if (!data) return;
            updateStatCard('total-users-detail', data.totalUsers, data.userGrowth);
            // Add other stats updates here as needed
        }

        function updateUserStats(data) {
            if (!data) return;
            // Update user stats
        }

        function updateLoanStats(data) {
            if (!data) return;
            // Update loan stats
        }

        function updateAIMetrics(data) {
            if (!data) return;
            const metricsContainer = document.querySelector('.ai-metrics');
            if (metricsContainer) {
                metricsContainer.innerHTML = `
                    <div class="ai-metric">
                        <div class="ai-metric-value">${data.successRate}%</div>
                        <div class="ai-metric-label">Success Rate</div>
                    </div>
                    <div class="ai-metric">
                        <div class="ai-metric-value">${data.totalRequests}</div>
                        <div class="ai-metric-label">OpenRouter Requests</div>
                    </div>
                    <div class="ai-metric">
                        <div class="ai-metric-value">${data.fallbackCount}</div>
                        <div class="ai-metric-label">Gemini Fallbacks</div>
                    </div>
                    <div class="ai-metric">
                        <div class="ai-metric-value">${data.reliability}%</div>
                        <div class="ai-metric-label">System Reliability</div>
                    </div>
                `;
            }
        }

        function updateRecentActivity(activities) {
            if (!activities || !activities.length) return;
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = activities.map(activity => `
                    <tr>
                        <td>${new Date(activity.timestamp).toLocaleTimeString()}</td>
                        <td>${activity.type}</td>
                        <td>${activity.user}</td>
                        <td>${activity.amount ? formatCurrency(activity.amount) : '-'}</td>
                        <td><span class="status-badge ${getStatusClass(activity.status)}">${activity.status}</span></td>
                        <td><button class="btn btn-primary" onclick="viewActivity('${activity.id}')">View</button></td>
                    </tr>
                `).join('');
            }
        }

        // Helpers
        function formatCurrency(amount) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
        }

        function getStatusClass(status) {
            switch (status.toLowerCase()) {
                case 'completed': return 'approved';
                case 'pending': return 'pending';
                case 'failed': return 'rejected';
                default: return 'pending';
            }
        }

        function updateStatusIndicator(status) {
            const indicator = document.querySelector('.status-indicator');
            const text = document.querySelector('.ai-status-card span');
            if (indicator && text) {
                if (status === 'loading') {
                    indicator.style.background = '#f59e0b';
                    text.textContent = 'Updating...';
                } else if (status === 'error') {
                    indicator.style.background = '#e53e3e';
                    text.textContent = 'Connection Error';
                } else {
                    indicator.style.background = '#10b981';
                    text.textContent = 'Live System Active';
                }
            }
        }

        function updateStatCard(id, value, growth) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        }

        // Navigation
        function showSection(sectionId) {
            document.querySelectorAll('.dashboard-section').forEach(section => {
                section.classList.remove('active');
            });
            const targetSection = document.getElementById(sectionId + '-section');
            if (targetSection) {
                targetSection.classList.add('active');
            }
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            }
        }

        // Action Handlers
        function refreshData() {
            fetchDashboardData();
        }

        function exportUsers() {
            window.open(`/api/admin-dashboard/export/users?key=${adminApiKey}`, '_blank');
        }

        function refreshUsers() {
            fetchApi('/users').then(data => {
                if (data && data.users) {
                    alert('Users refreshed');
                }
            });
        }

        // Chart Placeholders
        function initRevenueChart() {}
        function initPortfolioChart() {}
        function initUserChart() {}
        function initZimScoreChart() {}
        function initLoanChart() {}
        function initInvestmentChart() {}
        function initAICharts() {}
        
        let revenueChart, portfolioChart, userChart, zimscoreChart, loanChart, investmentChart, aiUsageChart, aiPerformanceChart;
    </script>
</body>
</html>
"@

$lines + $newContent | Set-Content $file -Encoding UTF8
