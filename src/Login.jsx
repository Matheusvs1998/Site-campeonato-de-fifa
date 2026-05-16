import React, { useState } from 'react';
import { supabaseClient } from './supabase.js';
import { translateAuthError } from './helpers.js';

function Login() {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showAnimation, setShowAnimation] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsChecking(true);
        
        try {
            if (!supabaseClient) throw new Error('Erro de inicialização: Verifique suas chaves no arquivo .env');

            const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
            if (authError) throw authError;
            if (!data.session) throw new Error('Falha ao estabelecer sessão. Tente novamente.');
            setShowAnimation(true);
        } catch (err) {
            setError(translateAuthError(err?.message) || 'Erro ao validar acesso.');
        } finally {
            setIsChecking(false);
        }
    };

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
                        <p style={{ color: '#ff4444', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                            {error}
                        </p>
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
                                    style={{ width: '22px', height: 'auto', opacity: showPassword ? '1' : '0.3', filter: showPassword ? 'none' : 'grayscale(1)' }} 
                                />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={isChecking}>
                        {isChecking ? 'Verificando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </section>
    );
}

export default Login;