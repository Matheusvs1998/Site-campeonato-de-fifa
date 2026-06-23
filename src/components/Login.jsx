import React, { useState } from 'react';
import { supabaseClient } from '../supabase.js';
import { translateAuthError } from '../helpers.js';

function Login({ onGoToSignUp }) {
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

    if (showReset) {
        return (
            <section className="container section">
                <div className="form-container">
                    <form onSubmit={handleResetRequest} className="card" style={{ maxWidth: '400px', margin: '0 auto', padding: '25px' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--primary-color)' }}>Recuperar Senha</h2>
                        
                        {resetSent ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📧</div>
                                <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>E-mail enviado!</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                                    Enviamos um link de recuperação para <strong>{resetEmail}</strong>. Verifique sua caixa de entrada e spam.
                                </p>
                                <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => setShowReset(false)}>Voltar para Login</button>
                            </div>
                        ) : (
                            <>
                                <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.9rem' }}>
                                    Insira seu e-mail cadastrado para receber o link de redefinição de senha.
                                </p>
                                {error && <p style={{ color: '#ff4444', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{error}</p>}
                                <div className="form-group">
                                    <label>E-mail</label>
                                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isChecking}>
                                    {isChecking ? 'Enviando...' : 'Enviar Link de Recuperação'}
                                </button>
                                <button type="button" className="btn-text" style={{ width: '100%', marginTop: '15px', justifyContent: 'center' }} onClick={() => setShowReset(false)}>
                                    Voltar para o Login
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </section>
        );
    }

    return (
        <section className="container section">
            {showAnimation && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>✅</div>
                        <h2>Acesso Autorizado!</h2>
                        <p>Bem-vindo de volta!</p>
                    </div>
                </div>
            )}
            <div className="form-container">
                <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '350px', margin: '0 auto', padding: '20px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '25px', color: 'var(--primary-color)' }}>Entrar</h2>
                    {error && (
                        <p style={{ color: '#ff4444', marginBottom: showSignUpSuggestion ? '5px' : '15px', textAlign: 'center', fontWeight: 'bold' }}>
                            {error}
                        </p>
                    )}
                    {showSignUpSuggestion && onGoToSignUp && (
                        <div style={{
                            background: 'rgba(0, 123, 255, 0.1)',
                            border: '1px solid rgba(0, 123, 255, 0.3)',
                            borderRadius: '10px',
                            padding: '15px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            <p style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-color)' }}>
                                Não encontramos uma conta com esse e-mail. <br/>
                                <strong>Deseja criar uma conta?</strong>
                            </p>
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ 
                                    background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                    width: '100%',
                                    fontSize: '0.9rem'
                                }}
                                onClick={onGoToSignUp}
                            >
                                📝 Criar minha conta agora
                            </button>
                        </div>
                    )}
                    <div className="form-group">
                        <label>E-mail</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Senha</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={pass} 
                                onChange={(e) => setPass(e.target.value)} 
                                required 
                                style={{ width: '100%', paddingRight: '45px' }}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                            >
                                <img 
                                    src="https://cdn-icons-png.flaticon.com/128/158/158746.png" 
                                    alt="Ver senha" 
                                    className="eye-icon"
                                    style={{ 
                                        width: '22px', 
                                        height: 'auto', 
                                        opacity: showPassword ? '1' : '0.5'
                                    }} 
                                />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isChecking}>
                        {isChecking ? 'Verificando...' : 'Entrar'}
                    </button>
                    <button type="button" className="btn-text" style={{ width: '100%', marginTop: '15px', justifyContent: 'center' }} onClick={() => setShowReset(true)}>
                        🔑 Esqueci minha senha
                    </button>
                </form>
            </div>
        </section>
    );
}

export default Login;