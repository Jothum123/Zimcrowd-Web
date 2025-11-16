import React, { useState } from 'react';
import './EmploymentTypeSelector.css';

/**
 * Employment Type Selector Component
 * REQUIRED for ZimScore calculation
 * Users must select employment type before uploading bank statement
 */
const EmploymentTypeSelector = ({ onSelect, initialValue = null, authToken }) => {
    const [selectedType, setSelectedType] = useState(initialValue);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const employmentTypes = [
        {
            value: 'government',
            label: 'Government Employee',
            icon: '🏛️',
            bonus: '+10 points',
            description: 'Civil servants, public sector workers',
            examples: 'Teachers, nurses, police, government officials'
        },
        {
            value: 'private',
            label: 'Private Sector',
            icon: '💼',
            bonus: '+6 points',
            description: 'Employed by private companies',
            examples: 'Corporate jobs, NGOs, private institutions'
        },
        {
            value: 'business',
            label: 'Business Owner',
            icon: '🏢',
            bonus: '+3 points',
            description: 'Self-employed, entrepreneurs',
            examples: 'Shop owners, contractors, freelancers'
        },
        {
            value: 'informal',
            label: 'Informal Sector',
            icon: '🛒',
            bonus: '+0 points',
            description: 'Informal employment',
            examples: 'Street vendors, casual workers, gig economy'
        }
    ];

    const handleSelect = async (type) => {
        setSelectedType(type);
        setError(null);
        setSuccess(false);

        // If authToken provided, save to backend immediately
        if (authToken) {
            await saveEmploymentType(type);
        }

        // Callback to parent component
        if (onSelect) {
            onSelect(type);
        }
    };

    const saveEmploymentType = async (type) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/profile-setup/employment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    employment_status: 'employed',
                    employment_type: type,
                    monthly_income: 0 // Will be updated later
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError(data.message || 'Failed to save employment type');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Save employment type error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="employment-selector">
            <div className="selector-header">
                <h2>👔 Select Your Employment Type</h2>
                <p className="required-badge">REQUIRED for ZimScore</p>
                <p className="selector-description">
                    Your employment type affects your ZimScore bonus. Choose the option that best describes your current employment situation.
                </p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span className="alert-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <span className="alert-icon">✅</span>
                    <span>Employment type saved successfully!</span>
                </div>
            )}

            <div className="employment-grid">
                {employmentTypes.map((type) => (
                    <div
                        key={type.value}
                        className={`employment-card ${selectedType === type.value ? 'selected' : ''} ${loading ? 'disabled' : ''}`}
                        onClick={() => !loading && handleSelect(type.value)}
                    >
                        <div className="card-icon">{type.icon}</div>
                        <h3 className="card-title">{type.label}</h3>
                        <div className="card-bonus">{type.bonus}</div>
                        <p className="card-description">{type.description}</p>
                        <p className="card-examples">
                            <small>Examples: {type.examples}</small>
                        </p>
                        {selectedType === type.value && (
                            <div className="selected-indicator">
                                <span className="checkmark">✓</span>
                                Selected
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {selectedType && (
                <div className="selection-info">
                    <div className="info-box">
                        <h4>📊 How This Affects Your ZimScore</h4>
                        <p>
                            Your selected employment type (<strong>{employmentTypes.find(t => t.value === selectedType)?.label}</strong>) 
                            will add <strong>{employmentTypes.find(t => t.value === selectedType)?.bonus}</strong> to your ZimScore.
                        </p>
                        <p className="info-note">
                            This is Component 2 of your ZimScore calculation. Your final score will be:
                            <br />
                            <strong>Banking Data (30-60) + Employment Bonus (0-10) + Performance (0-39)</strong>
                        </p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Saving employment type...</p>
                </div>
            )}

            <div className="selector-footer">
                <p className="footer-note">
                    💡 <strong>Note:</strong> You can update this later if your employment situation changes.
                </p>
            </div>
        </div>
    );
};

export default EmploymentTypeSelector;
