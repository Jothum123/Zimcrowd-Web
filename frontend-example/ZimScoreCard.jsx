import React, { useState, useEffect } from 'react';
import './ZimScoreCard.css';

/**
 * ZimScore Display Card Component
 * Shows user's ZimScore with breakdown and progress
 */
const ZimScoreCard = ({ userId, authToken }) => {
    const [scoreData, setScoreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showBreakdown, setShowBreakdown] = useState(false);

    useEffect(() => {
        fetchZimScore();
    }, [userId]);

    const fetchZimScore = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/zimscore/my-score', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setScoreData(data.data);
                
                // Also fetch breakdown
                const breakdownResponse = await fetch('/api/zimscore/breakdown', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const breakdownData = await breakdownResponse.json();
                if (breakdownData.success) {
                    setScoreData(prev => ({ ...prev, breakdown: breakdownData.data }));
                }
            } else {
                setError(data.message || 'Failed to load ZimScore');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('ZimScore fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const stars = [];

        for (let i = 0; i < fullStars; i++) {
            stars.push(<span key={`full-${i}`} className="star full">⭐</span>);
        }
        if (hasHalfStar) {
            stars.push(<span key="half" className="star half">⭐</span>);
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
        }

        return stars;
    };

    const getProgressPercentage = (score) => {
        return ((score - 30) / 55) * 100; // 30-85 range
    };

    const getRiskColor = (riskLevel) => {
        const colors = {
            'Very Low Risk': '#10b981',
            'Low Risk': '#3b82f6',
            'Medium Risk': '#f59e0b',
            'High Risk': '#f97316',
            'Very High Risk': '#ef4444',
            'Building Credit': '#6b7280'
        };
        return colors[riskLevel] || '#6b7280';
    };

    if (loading) {
        return (
            <div className="zimscore-card loading">
                <div className="spinner"></div>
                <p>Loading your ZimScore...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="zimscore-card error">
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
                <button onClick={fetchZimScore} className="retry-btn">Retry</button>
            </div>
        );
    }

    if (!scoreData) {
        return (
            <div className="zimscore-card no-score">
                <div className="no-score-icon">📊</div>
                <h3>No ZimScore Yet</h3>
                <p>Complete your KYC and upload a bank statement to get your ZimScore!</p>
            </div>
        );
    }

    return (
        <div className="zimscore-card">
            {/* Header */}
            <div className="zimscore-header">
                <h2>🎯 Your ZimScore</h2>
                {scoreData.cold_start_active && (
                    <span className="cold-start-badge">Cold Start Active</span>
                )}
            </div>

            {/* Main Score Display */}
            <div className="score-display">
                <div className="score-value">
                    <span className="score-number">{scoreData.score_value}</span>
                    <span className="score-max">/ 85</span>
                </div>
                <div className="star-rating">
                    {renderStars(scoreData.star_rating)}
                    <span className="rating-value">{scoreData.star_rating.toFixed(1)} Stars</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="score-progress">
                <div 
                    className="progress-bar" 
                    style={{ 
                        width: `${getProgressPercentage(scoreData.score_value)}%`,
                        backgroundColor: getRiskColor(scoreData.risk_level)
                    }}
                ></div>
            </div>

            {/* Risk Level */}
            <div className="risk-level" style={{ color: getRiskColor(scoreData.risk_level) }}>
                <span className="risk-icon">🛡️</span>
                <span className="risk-text">{scoreData.risk_level}</span>
            </div>

            {/* Borrowing Limit */}
            <div className="borrowing-limit">
                <div className="limit-label">💰 Current Borrowing Limit</div>
                <div className="limit-value">${scoreData.max_loan_amount.toFixed(2)}</div>
                {scoreData.cold_start_active && scoreData.score_based_limit && (
                    <div className="limit-note">
                        Score-based limit: ${scoreData.score_based_limit.toFixed(2)} 
                        <br />
                        <small>(Unlocks after first on-time repayment)</small>
                    </div>
                )}
            </div>

            {/* Interest Rate */}
            <div className="interest-info">
                <div className="info-label">📊 Interest Rate</div>
                <div className="info-value">0-10% (You Choose)</div>
            </div>

            {/* Component Breakdown */}
            {scoreData.breakdown && (
                <div className="score-breakdown">
                    <button 
                        className="breakdown-toggle"
                        onClick={() => setShowBreakdown(!showBreakdown)}
                    >
                        {showBreakdown ? '▼' : '▶'} Score Breakdown
                    </button>

                    {showBreakdown && (
                        <div className="breakdown-content">
                            {/* Component 1: Banking */}
                            <div className="component">
                                <div className="component-header">
                                    <span className="component-name">🏦 Banking Data</span>
                                    <span className="component-score">
                                        {scoreData.breakdown.components.component1.score}/60
                                    </span>
                                </div>
                                <div className="component-bar">
                                    <div 
                                        className="component-fill"
                                        style={{ 
                                            width: `${(scoreData.breakdown.components.component1.score / 60) * 100}%`,
                                            backgroundColor: '#3b82f6'
                                        }}
                                    ></div>
                                </div>
                                <div className="component-factors">
                                    <div className="factor">
                                        <span>Cash Flow Ratio</span>
                                        <span>+{scoreData.breakdown.components.component1.factors.cashFlowRatio}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Average Balance</span>
                                        <span>+{scoreData.breakdown.components.component1.factors.avgBalance}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Balance Consistency</span>
                                        <span>+{scoreData.breakdown.components.component1.factors.balanceConsistency}</span>
                                    </div>
                                    <div className="factor">
                                        <span>NSF Events</span>
                                        <span>{scoreData.breakdown.components.component1.factors.nsfEvents >= 0 ? '+' : ''}{scoreData.breakdown.components.component1.factors.nsfEvents}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Account Tenor</span>
                                        <span>+{scoreData.breakdown.components.component1.factors.accountTenor}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Additional Accounts</span>
                                        <span>+{scoreData.breakdown.components.component1.factors.additionalAccounts}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Component 2: Employment */}
                            <div className="component">
                                <div className="component-header">
                                    <span className="component-name">💼 Employment</span>
                                    <span className="component-score">
                                        {scoreData.breakdown.components.component2.score}/10
                                    </span>
                                </div>
                                <div className="component-bar">
                                    <div 
                                        className="component-fill"
                                        style={{ 
                                            width: `${(scoreData.breakdown.components.component2.score / 10) * 100}%`,
                                            backgroundColor: '#10b981'
                                        }}
                                    ></div>
                                </div>
                                <div className="employment-type">
                                    Type: <strong>{scoreData.breakdown.components.component2.employmentType || 'Not specified'}</strong>
                                </div>
                            </div>

                            {/* Component 3: Performance */}
                            <div className="component">
                                <div className="component-header">
                                    <span className="component-name">📈 Performance</span>
                                    <span className="component-score">
                                        {scoreData.breakdown.components.component3.score}/39
                                    </span>
                                </div>
                                <div className="component-bar">
                                    <div 
                                        className="component-fill"
                                        style={{ 
                                            width: `${Math.max(0, (scoreData.breakdown.components.component3.score / 39) * 100)}%`,
                                            backgroundColor: '#f59e0b'
                                        }}
                                    ></div>
                                </div>
                                <div className="component-factors">
                                    <div className="factor">
                                        <span>Total Loans</span>
                                        <span>{scoreData.breakdown.components.component3.factors.totalLoans}</span>
                                    </div>
                                    <div className="factor">
                                        <span>On-Time Payments</span>
                                        <span>{scoreData.breakdown.components.component3.factors.onTimePayments}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Late Payments</span>
                                        <span>{scoreData.breakdown.components.component3.factors.latePayments}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Max Loan Repaid</span>
                                        <span>${scoreData.breakdown.components.component3.factors.maxLoanRepaid}</span>
                                    </div>
                                    <div className="factor">
                                        <span>Platform Tenure</span>
                                        <span>{scoreData.breakdown.components.component3.factors.platformTenure} months</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tips to Improve */}
            <div className="improvement-tips">
                <h4>💡 Tips to Improve Your Score</h4>
                <ul>
                    {scoreData.cold_start_active && (
                        <li>✅ Repay your first loan on-time to unlock your full limit</li>
                    )}
                    {scoreData.score_value < 70 && (
                        <>
                            <li>📊 Maintain a healthy cash flow ratio (income &gt; expenses)</li>
                            <li>💰 Keep a consistent account balance</li>
                            <li>⏰ Always repay loans on time</li>
                        </>
                    )}
                    {scoreData.score_value >= 70 && scoreData.score_value < 85 && (
                        <>
                            <li>🎯 Continue your excellent repayment record</li>
                            <li>📈 Gradually increase your loan amounts</li>
                            <li>⭐ You're on track to reach maximum score!</li>
                        </>
                    )}
                    {scoreData.score_value >= 85 && (
                        <li>🏆 Perfect! You've reached the maximum ZimScore!</li>
                    )}
                </ul>
            </div>

            {/* Last Updated */}
            <div className="last-updated">
                Last calculated: {new Date(scoreData.last_calculated).toLocaleString()}
            </div>
        </div>
    );
};

export default ZimScoreCard;
