import React, { useState } from 'react';
import { supabaseClient } from '../supabase';
import { translateAuthError } from '../helpers';
import InviteEnvelope from './InviteEnvelope';

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
        <InviteEnvelope
            onGoHome={() => window.location.href = '/'}
            eyebrow="Quase lá"
            title="Verifique seu E-mail"
            subtitle={`Enviamos um código para ${email}.`}
            initialOpen={true}
        >
            <div className="env-card-content">
                <form onSubmit={handleVerify} className="env-form">
                    <div style={{
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        color: '#ffc107',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <span style={{marginRight: '5px'}}>⚠️</span>
                        Não encontrou? <strong>Verifique sua caixa de spam!</strong>
                    </div>

                    {error && <p className="env-error" style={{ textAlign: 'center' }}>{error}</p>}
                    {resendStatus && <p className="env-success-sub" style={{ textAlign: 'center', marginBottom: '15px' }}>{resendStatus}</p>}
                    
                    <div className="env-field-group">
                        <label className="env-label">Código de Verificação</label>
                        <input 
                            type="text" 
                            className="gc-field"
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
                    
                    <button type="submit" className="env-submit" disabled={loading}>
                        {loading ? 'Verificando...' : 'Confirmar Código'}
                    </button>
                    
                    <button type="button" onClick={handleResendCode} className="env-toggle" style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }}>
                        Não recebeu o código? <strong>Reenviar</strong>
                    </button>
                </form>
            </div>
        </InviteEnvelope>
    );
}

export default VerifyEmail;

