import React, { useState } from 'react';
import { supabaseClient } from '../supabase';
import { translateAuthError } from '../helpers';

function VerifyEmail({ email, onVerified }) {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [resendStatus, setResendStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResendCode = async () => {
        setResendStatus('Enviando...');
        try {
            const { error: resendError } = await supabaseClient.auth.resend({
                type: 'signup',
                email: email,
                options: { emailRedirectTo: window.location.origin }
            });
            if (resendError) throw resendError;
            setResendStatus('Novo código enviado!');
            setTimeout(() => setResendStatus(''), 5000);
        } catch (err) {
            setError('Erro ao reenviar: ' + err.message);
            setResendStatus('');
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user?.email === email && session?.user?.email_confirmed_at) {
                onVerified();
                return;
            }

            const { error: verifyError } = await supabaseClient.auth.verifyOtp({
                email,
                token: token.trim().replace(/\s/g, ''),
                type: 'signup'
            });
            
            if (verifyError) throw verifyError;
            
            // Aguarda um pequeno momento para o Supabase processar o trigger de confirmação
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Força a atualização da sessão para capturar os metadados (time, etc)
            const { data: { user }, error: refreshError } = await supabaseClient.auth.getUser();
            console.log("Usuário verificado e dados carregados:", user?.user_metadata);
            
            onVerified();
        } catch (err) {
            setError(translateAuthError(err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="container section">
            <div className="form-container">
                <form onSubmit={handleVerify} className="card" style={{ maxWidth: '350px', margin: '0 auto', padding: '20px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '15px', color: 'var(--primary-color)' }}>Verifique seu E-mail</h2>
                    <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Enviamos um código para <strong>{email}</strong>. Insira-o abaixo.
                    </p>

                    <div style={{
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid #ffc107',
                        color: '#ffc107',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <span style={{marginRight: '5px'}}>⚠️</span>
                        Não encontrou? <strong>Verifique sua caixa de spam!</strong>
                    </div>

                    {error && <p style={{ color: '#ff4444', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{error}</p>}
                    {resendStatus && <p style={{ color: '#28a745', marginBottom: '15px', textAlign: 'center', fontSize: '0.85rem' }}>{resendStatus}</p>}
                    <div className="form-group">
                        <label>Código de Verificação</label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={token} 
                            onChange={e => setToken(e.target.value.replace(/\D/g, ''))} 
                            placeholder="6 dígitos" 
                            maxLength="6"
                            required 
                            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px', fontWeight: 'bold' }}
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '15px' }} disabled={loading}>
                        {loading ? 'Verificando...' : 'Confirmar Código'}
                    </button>
                    <button type="button" onClick={handleResendCode} className="btn-text" style={{ marginTop: '15px', width: '100%', textDecoration: 'underline' }}>
                        Não recebeu o código? Reenviar
                    </button>
                </form>
            </div>
        </section>
    );
}

export default VerifyEmail;