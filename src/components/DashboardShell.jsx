import React from 'react';

function DashboardShell({ onGoHome, eyebrow, title, subtitle, children }) {
    return (
        <div className="dashboard-container" style={{ padding: '40px 20px 80px', minHeight: '80vh' }}>
            <main className="auth-main" style={{ display: 'block', maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '0' }}>
                <div className="auth-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
                    {eyebrow && (
                        <div className="auth-badge">
                            <span className="auth-badge-dot" aria-hidden="true"></span>
                            <span className="auth-badge-text">{eyebrow}</span>
                        </div>
                    )}
                    <h1 className="auth-title" style={{ fontSize: '36px' }}>{title}</h1>
                    {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                </div>

                <div className="dashboard-panel" style={{
                    background: 'linear-gradient(162deg, #1d1a20 0%, #141218 52%, #0f0d12 100%)',
                    borderRadius: '14px',
                    padding: '30px',
                    boxShadow: '0 26px 60px rgba(0, 0, 0, .55), 0 2px 0 rgba(255, 255, 255, .05) inset',
                    position: 'relative',
                    zIndex: 10
                }}>
                    {/* Grão e efeitos idênticos ao envelope */}
                    <div className="env-card-grain" style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none', borderRadius: '14px' }}></div>
                    <div className="env-card-vignette" style={{ position: 'absolute', inset: 0, borderRadius: '14px', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8)', pointerEvents: 'none' }}></div>
                    
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default DashboardShell;
