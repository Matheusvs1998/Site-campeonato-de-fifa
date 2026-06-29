import React, { useState } from 'react';
import { supabaseClient } from '../supabase.js';
import { translateAuthError } from '../helpers.js';
import InviteEnvelope from './InviteEnvelope.jsx';

function Login({ onGoToSignUp, onGoHome }) {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showAnimation, setShowAnimation] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [showSignUpSuggestion, setShowSignUpSuggestion] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowSignUpSuggestion(false);
        setIsChecking(true);

        try {
            if (!supabaseClient) throw new Error('Erro de inicialização: Verifique suas chaves no arquivo .env');

            const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
            if (authError) throw authError;
            if (!data.session) throw new Error('Falha ao estabelecer sessão. Tente novamente.');
            setShowAnimation(true);
        } catch (err) {
            const rawMsg = err?.message || '';
            if (rawMsg.includes('Invalid login credentials')) {
                setShowSignUpSuggestion(true);
            }
            setError(translateAuthError(rawMsg) || 'Erro ao validar acesso.');
        } finally {
            setIsChecking(false);
        }
    };

    const handleResetRequest = async (e) => {
        e.preventDefault();
        setError('');
        setIsChecking(true);
        try {
            if (!supabaseClient) throw new Error('Erro de inicialização: Verifique suas chaves no arquivo .env');
            const { error } = await supabaseClient.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: window.location.origin
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err) {
            setError(translateAuthError(err.message));
        } finally {
            setIsChecking(false);
        }
    };

    const backToLogin = () => {
        setShowReset(false);
        setResetSent(false);
        setError('');
    };

    // ===== Conteúdo da carta: RECUPERAÇÃO DE SENHA =====
    if (showReset) {
        return (
            <InviteEnvelope
                onGoHome={onGoHome}
                eyebrow="Acesso de competidor"
                title="Recuperar sua senha"
                subtitle="Enviaremos um link de redefinição para o seu e-mail."
            >
                {resetSent ? (
                    <div className="env-form" style={{ textAlign: 'center' }}>
                        <div className="env-success-check" style={{ margin: '0 auto' }}>✓</div>
                        <p className="env-subtitle" style={{ marginTop: 0 }}>
                            Enviamos um link de recuperação para <strong>{resetEmail}</strong>.
                            Verifique sua caixa de entrada e o spam.
                        </p>
                        <button type="button" className="env-submit" onClick={backToLogin}>
                            Voltar para o login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleResetRequest} className="env-form">
                        {error && <p className="env-error">{error}</p>}
                        <div className="env-field-group">
                            <label className="env-label">E-mail</label>
                            <input
                                type="email"
                                className="gc-field"
                                placeholder="seu@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="env-submit" disabled={isChecking}>
                            {isChecking ? 'Enviando...' : 'Enviar link de recuperação'}
                        </button>
                        <button type="button" className="env-link" onClick={backToLogin}>
                            Voltar para o login
                        </button>
                    </form>
                )}
            </InviteEnvelope>
        );
    }

    // ===== Conteúdo da carta: LOGIN =====
    return (
        <InviteEnvelope
            onGoHome={onGoHome}
            eyebrow="Acesso de competidor"
            title="Confirme sua presença"
            subtitle="Entre com suas credenciais para acessar a Gangster Cup."
        >
            <form onSubmit={handleSubmit} className="env-form">
                <div className="env-field-group">
                    <label className="env-label">E-mail</label>
                    <input
                        type="email"
                        className="gc-field"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="env-field-group">
                    <div className="env-label-row">
                        <label className="env-label">Senha</label>
                        <button
                            type="button"
                            className="env-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className="gc-field"
                        placeholder="••••••••"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="env-error">{error}</p>}

                {showSignUpSuggestion && onGoToSignUp && (
                    <div className="env-suggestion">
                        Não encontramos uma conta com esse e-mail.
                        <br />
                        <button type="button" onClick={onGoToSignUp}>
                            Criar minha conta
                        </button>
                    </div>
                )}

                <button type="submit" className="env-submit" disabled={isChecking}>
                    {isChecking ? 'Verificando...' : 'Confirmar presença'}
                </button>

                <button type="button" className="env-link" onClick={() => setShowReset(true)}>
                    Esqueci minha senha
                </button>
            </form>

            {showAnimation && (
                <div className="env-success">
                    <div className="env-success-grain" aria-hidden="true"></div>
                    <div className="env-success-check">✓</div>
                    <div className="env-success-title">Presença confirmada</div>
                    <div className="env-success-sub">Bem-vindo de volta à Gangster Cup.</div>
                </div>
            )}
        </InviteEnvelope>
    );
}

export default Login;
