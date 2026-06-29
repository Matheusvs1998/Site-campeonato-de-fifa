import React from 'react';

function DashboardShell({ onGoHome, eyebrow, title, subtitle, children }) {
    return (
        <div className="auth-screen gc-auth-screen" style={{ overflowY: 'auto', display: 'block' }}>
            {/* NAV minimalista idêntica à do login */}
            <header className="auth-nav">
                <button
                    type="button"
                    className="auth-nav-logo"
                    onClick={onGoHome}
                    aria-label="Voltar ao início"
                >
                    <img src="/logo-gangster-cup.png" alt="Gangster Cup" />
                </button>
                <button
                    type="button"
                    className="auth-nav-back"
                    onClick={onGoHome}
                >
                    ← Voltar ao início
                </button>
            </header>

            <main className="auth-main" style={{ display: 'block', maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '20px' }}>
                <div className="auth-header" style={{ marginBottom: '40px' }}>
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

            {/* RODAPÉ idêntico ao do auth */}
            <footer className="auth-footer" style={{ position: 'relative', marginTop: '40px' }}>
                <div className="social-links" style={{ justifyContent: 'center', marginBottom: '14px' }}>
                    <a href="https://discord.gg/neQt9DdJVT" className="discord" target="_blank" rel="noopener noreferrer">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2758-3.68-.2758-5.4876 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                        </svg>
                        Discord
                    </a>
                    <a href="https://twitch.tv/eujohnzinrp" className="twitch" target="_blank" rel="noopener noreferrer">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                        </svg>
                        Twitch
                    </a>
                </div>
                <div className="auth-footer-copy">© 2026 Gangster Cup.</div>
            </footer>
        </div>
    );
}

export default DashboardShell;
