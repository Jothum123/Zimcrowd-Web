import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

const ZimScoreAvatar = ({ user, onProfileComplete }) => {
    const [zimscore, setZimscore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stars, setStars] = useState('☆☆☆☆☆');
    const [ratingCategory, setRatingCategory] = useState('');

    // Calculate star display based on ZimScore
    const calculateStars = (score) => {
        if (score >= 80) return '★★★★★'; // Excellent
        if (score >= 70) return '★★★★☆'; // Good
        if (score >= 60) return '★★★☆☆'; // Fair
        if (score >= 50) return '★★☆☆☆'; // Average
        if (score >= 40) return '★☆☆☆☆'; // Below Average
        return '☆☆☆☆☆'; // Poor
    };

    // Get rating category and color
    const getRatingCategory = (score) => {
        if (score >= 80) return { text: 'Excellent', color: '#10b981' };
        if (score >= 70) return { text: 'Good', color: '#3b82f6' };
        if (score >= 60) return { text: 'Fair', color: '#f59e0b' };
        if (score >= 50) return { text: 'Average', color: '#6b7280' };
        if (score >= 40) return { text: 'Below Average', color: '#ef4444' };
        return { text: 'Poor', color: '#991b1b' };
    };

    // Fetch ZimScore from backend
    const fetchZimScore = async () => {
        if (!user || !user.id) return;

        try {
            setLoading(true);
            const response = await fetch('/api/zimscore/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ userId: user.id })
            });

            const data = await response.json();
            if (data.success) {
                const score = data.zimscore;
                setZimscore(score);
                setStars(calculateStars(score));
                setRatingCategory(getRatingCategory(score));
                
                // Notify parent component of profile completion with ZimScore
                if (onProfileComplete) {
                    onProfileComplete({
                        zimscore: score,
                        stars: calculateStars(score),
                        category: getRatingCategory(score)
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch ZimScore:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate ZimScore immediately when component mounts or user changes
    useEffect(() => {
        if (user && user.id) {
            fetchZimScore();
        }
    }, [user]);

    // Sidebar Avatar Component
    const SidebarAvatar = () => (
        <div className="user-info" id="sidebar-user-info">
            <div className="user-avatar" id="sidebar-avatar">
                <span id="sidebar-avatar-initials">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                {zimscore > 0 && (
                    <div className="avatar-star-badge">
                        <Star size={12} color="#fbbf24" fill="#fbbf24" />
                    </div>
                )}
            </div>
            <div className="user-details">
                <h4 id="sidebar-user-name">
                    {user?.name || user?.email || 'Loading...'}
                </h4>
                <div className="sidebar-zimscore">
                    <span 
                        id="sidebar-zimscore-stars" 
                        className="sidebar-zimscore-stars"
                        style={{ color: '#fbbf24', fontSize: '11px', letterSpacing: '1px' }}
                    >
                        {loading ? '☆☆☆☆☆' : stars}
                    </span>
                    <span 
                        id="sidebar-zimscore-value" 
                        className="sidebar-zimscore-value"
                        style={{ 
                            color: ratingCategory.color || '#38e77b', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: `${ratingCategory.color || '#38e77b'}20`,
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}
                    >
                        {loading ? '--/85' : `${zimscore}/85`}
                    </span>
                </div>
                {zimscore > 0 && (
                    <div className="sidebar-verified-badge" style={{ display: 'inline-flex' }}>
                        <CheckCircle size={10} color="#38e77b" />
                        <span style={{ fontSize: '10px', color: '#38e77b' }}>Verified</span>
                    </div>
                )}
                <div className="sidebar-user-id">
                    <span className="user-id-label">ID:</span>
                    <span 
                        className="user-id-value" 
                        onClick={() => navigator.clipboard.writeText(user?.id || '')}
                        title="Click to copy"
                        style={{ cursor: 'pointer' }}
                    >
                        {user?.id?.substring(0, 8) || '---'}...
                    </span>
                </div>
            </div>
        </div>
    );

    // Navigation Avatar Component
    const NavigationAvatar = () => (
        <div className="header-user">
            <div 
                className="header-user-avatar" 
                id="nav-avatar"
                style={{ 
                    position: 'relative',
                    background: 'linear-gradient(135deg, #38e77b, #34d399)',
                    color: 'white',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                {zimscore > 0 && (
                    <div 
                        style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            background: '#1e293b',
                            border: '1.5px solid #fbbf24',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Star size={10} color="#fbbf24" fill="#fbbf24" />
                    </div>
                )}
            </div>
            <div className="header-user-info">
                <h4 id="header-user-name">
                    {user?.name || user?.email || 'Loading...'}
                </h4>
                {zimscore > 0 ? (
                    <div 
                        className="verification-badge" 
                        style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: ratingCategory.color || '#38e77b',
                            fontSize: '12px'
                        }}
                    >
                        <Star size={12} color={ratingCategory.color || '#fbbf24'} fill={ratingCategory.color || '#fbbf24'} />
                        <span>{stars} {ratingCategory.text}</span>
                    </div>
                ) : (
                    <div className="verification-badge" style={{ display: 'inline-flex' }}>
                        <AlertCircle size={12} color="#ef4444" />
                        <span style={{ color: '#ef4444' }}>Not Verified</span>
                    </div>
                )}
            </div>
        </div>
    );

    // Combined component that renders both avatars
    return (
        <>
            <SidebarAvatar />
            <NavigationAvatar />
        </>
    );
};

export default ZimScoreAvatar;
