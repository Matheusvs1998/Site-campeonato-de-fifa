import React, { useState } from 'react';

/**
 * InviteEnvelope — shell imersivo de tela cheia para Login/Cadastro.
 *
 * Renderiza:
 *  - NAV minimalista (logo + "Voltar ao inicio")
 *  - Header (badge + titulo + subtitulo)
 *  - ENVELOPE animado (glow, back, carta, pocket, flap, selo, botao "Abrir convite")
 *  - Footer proprio (Discord/Twitch + copyright)
 *
 * O conteudo da CARTA (formulario) vem por `children`, renderizado dentro
 * de `.env-card`. Use `tall` para a variante de cadastro (carta alta com rolagem):
 * nesse caso o children deve usar `.env-card-scroll` como container; caso
 * contrario use `.env-card-content`.
 *
 * Estado interno `open` controla a abertura (classe `.is-open` no stage).
 * O selo de cera e o botao "Abrir convite" disparam setOpen(true).
 *
 * Props:
 *   onGoHome  () => void   — chamado pelo logo e pelo link "Voltar ao inicio"
 *   eyebrow   string       — sobre-titulo da carta (ex.: "CONVITE OFICIAL · 2026")
 *   title     string       — titulo da carta (ex.: "Voce esta convidado")
 *   subtitle  string       — subtitulo da carta
 *   children  ReactNode    — conteudo/formulario dentro da carta
 *   tall      boolean      — variante carta alta com rolagem (cadastro)
 *   sealText  string       — texto do selo de cera (default "GC")
 */
function InviteEnvelope({
    onGoHome,
    eyebrow = 'Convite Oficial · 2026',
    title = 'Você está convidado',
    subtitle = 'Sua vaga na temporada está reservada. Confirme sua presença abaixo.',
    children,
    tall = false,
    sealText = 'GC',
    initialOpen = false,
}) {
    const [open, setOpen] = useState(initialOpen);
    const handleOpen = () => setOpen(true);

    const stageClass = [
        'env-stage',
        open ? 'is-open' : '',
        tall ? 'is-tall' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="auth-screen gc-auth-screen">
            {/* NAV minimalista */}
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

            {/* MAIN + HEADER */}
            <main className="auth-main">
                <div className="auth-header">
                    <div className="auth-badge">
                        <span className="auth-badge-dot" aria-hidden="true"></span>
                        <span className="auth-badge-text">Acesso de competidor</span>
                    </div>
                    <h1 className="auth-title">Seu convite chegou</h1>
                    <p className="auth-subtitle">Abra o envelope para acessar a Gangster Cup.</p>
                </div>

                {/* ENVELOPE STAGE */}
                <div className={stageClass}>
                    <div className="env-wrap">
                        {/* ember glow */}
                        <div className="env-glow" aria-hidden="true"></div>

                        {/* envelope back */}
                        <div className="env-back" aria-hidden="true"></div>

                        {/* LETTER / INVITE CARD */}
                        <div
                            className={`env-card${tall ? ' is-tall' : ''}`}
                            /* fechado: nao recebe foco atras do envelope */
                            aria-hidden={!open}
                            inert={!open ? true : undefined}
                        >
                            <div className="env-card-grain" aria-hidden="true"></div>
                            <div className="env-card-vignette" aria-hidden="true"></div>
                            <div className="env-card-deckle" aria-hidden="true"></div>

                            <div className={tall ? 'env-card-scroll' : 'env-card-content'}>
                                <div className="env-monogram">
                                    <span>GC</span>
                                </div>
                                <div className="env-eyebrow">{eyebrow}</div>
                                <h2 className="env-title">{title}</h2>
                                {subtitle && <p className="env-subtitle">{subtitle}</p>}

                                <div className="env-divider" aria-hidden="true">
                                    <span></span>
                                </div>

                                {children}

                                <div className="env-cardfoot">✦ Gangster Cup · 2026 ✦</div>
                            </div>
                        </div>

                        {/* front pocket (triangle up) */}
                        <div className="env-pocket" aria-hidden="true"></div>
                        <div className="env-pocket-sheen" aria-hidden="true"></div>

                        {/* top flap (opens) */}
                        <div className="env-flap" aria-hidden="true"></div>

                        {/* wax seal — gatilho (some ao abrir) */}
                        <button
                            type="button"
                            className="env-seal"
                            onClick={handleOpen}
                            aria-label="Abrir convite"
                            tabIndex={open ? -1 : 0}
                        >
                            <span>{sealText}</span>
                        </button>
                    </div>
                </div>

                {/* trigger button (some ao abrir) */}
                <div className={`env-trigger${open ? ' is-hidden' : ''}`}>
                    <div className="env-trigger-frame">
                        <button
                            type="button"
                            className="env-trigger-btn"
                            onClick={handleOpen}
                            tabIndex={open ? -1 : 0}
                            aria-label="Abrir convite"
                        >
                            Abrir convite
                        </button>
                    </div>
                </div>
            </main>

            {/* RODAPE proprio */}
            <footer className="auth-footer">
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

export default InviteEnvelope;
