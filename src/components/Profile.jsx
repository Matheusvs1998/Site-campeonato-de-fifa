import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo } from '../teamLogos';
import { translateAuthError } from '../helpers';

function Profile({ user, userRegistration, onUpdate }) {
    const [formData, setFormData] = useState({
        playername: '',
        teamname: 'Real Madrid',
        // The email field will be managed separately for OTP confirmation
        // email: '', 
        // newEmail: '', // This will be managed by editableEmail
        platform: 'PS5',
        gamertag: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [editableEmail, setEditableEmail] = useState(user?.email || '');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailChangePending, setEmailChangePending] = useState(false); // True if email change requested, waiting for OTP
    const [emailMessage, setEmailMessage] = useState({ text: '', type: '' }); // For email-specific messages

    useEffect(() => {
        if (userRegistration) {
            setFormData({
                playername: userRegistration.playername || '',
                teamname: userRegistration.teamname || 'Real Madrid',
                platform: userRegistration.platform || 'PS5',
                gamertag: userRegistration.gamertag || ''
            });
        }
    }, [userRegistration]);

    // Sincroniza o e-mail editável apenas quando o e-mail do usuário no Supabase muda de fato
    // ou quando não há uma alteração pendente (evita que o campo resete enquanto o usuário digita)
    useEffect(() => {
        if (user?.email && !emailChangePending) {
            setEditableEmail(user.email);
        }
    }, [user?.email, emailChangePending]);

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const { error } = await supabaseClient.auth.updateUser({ email: editableEmail });
            if (error) throw error;
            setEmailMessage({ text: 'Novo código enviado para ' + editableEmail, type: 'success' });
        } catch (err) {
            setEmailMessage({ text: translateAuthError(err.message), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setEmailMessage({ text: '', type: '' }); // Clear email messages
        setMessage({ text: '', type: '' });

        try {
            // 1. Atualiza dados do campeonato (se existir registro)
            if (userRegistration?.id) {
                const { error: regError } = await supabaseClient
                .from('registrations')
                .update({
                    teamname: formData.teamname,
                    platform: formData.platform,
                    gamertag: formData.gamertag.trim()
                })
                .eq('id', userRegistration.id);

                if (regError) throw regError;
            }

            // Handle Email Change separately
            if (editableEmail !== user?.email) {
                if (!emailChangePending) {
                    // Step 1: Request email change (sends OTP to new email)
                    const { error: updateError } = await supabaseClient.auth.updateUser({ email: editableEmail });
                    if (updateError) throw updateError;
                    
                    setEmailChangePending(true);
                    setEmailMessage({ text: 'Um código de verificação foi enviado para o novo e-mail. Insira-o abaixo para confirmar.', type: 'info' });
                    setMessage({ text: 'Verifique seu novo e-mail para o código.', type: 'info' });
                    setLoading(false); // Stop loading, wait for OTP input
                    return; // Exit, wait for OTP
                } else {
                    // Step 2: Confirm email change with OTP
                    const { error: verifyError } = await supabaseClient.auth.verifyOtp({
                        email: editableEmail,
                        token: emailOtp.trim(),
                        type: 'email_change'
                    });
                    if (verifyError) throw verifyError;

                    setEmailChangePending(false);
                    setEmailOtp('');
                    setEmailMessage({ text: 'E-mail verificado com sucesso!', type: 'success' });
                }
            }

            // Only update metadata if not currently waiting for email OTP
            if (!emailChangePending) {
                // 2. Sincroniza metadados do Auth (opcional para persistência de estado)
                // This is important for the user object to reflect changes immediately
                const { error: metadataError } = await supabaseClient.auth.updateUser({
                    data: {
                        teamname: formData.teamname,
                        platform: formData.platform,
                        gamertag: formData.gamertag.trim()
                    }
                });
                if (metadataError) throw metadataError;
            }

            setMessage({ text: 'Perfil atualizado com sucesso!', type: 'success' });
            if (onUpdate) await onUpdate();
        } catch (err) {
            if (emailChangePending) { // If error during OTP verification
                setEmailMessage({ text: translateAuthError(err.message), type: 'error' });
            }
            setMessage({ text: translateAuthError(err.message), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="container section">
            <div className="form-container">
                <form onSubmit={handleUpdate} className="card" style={{ maxWidth: '450px', margin: '0 auto', padding: '25px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '25px', color: 'var(--primary-color)' }}>Meu Perfil</h2>
                    
                    {message.text && (
                        <p style={{ 
                            color: message.type === 'error' ? '#ff4444' : '#28a745', 
                            marginBottom: '15px', 
                            textAlign: 'center', 
                            fontWeight: 'bold' 
                        }}>
                            {message.text}
                        </p>
                    )}
                    {emailMessage.text && (
                        <p style={{ 
                            color: emailMessage.type === 'error' ? '#ff4444' : (emailMessage.type === 'info' ? '#007bff' : '#28a745'), 
                            marginBottom: '15px', 
                            textAlign: 'center', 
                            fontWeight: 'bold' 
                        }}>
                            {emailMessage.text}
                        </p>
                    )}
                    
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label>E-mail</label> {/* This label is for the input below */}
                        <input 
                            type="email" 
                            value={editableEmail} 
                            onChange={e => {
                                setEditableEmail(e.target.value);
                                setEmailChangePending(false); // Reset pending state if email is edited
                                setEmailMessage({ text: '', type: '' });
                            }}
                            required 
                            style={{ width: '100%' }} 
                            disabled={loading && !emailChangePending} // Disable if loading, unless it's for OTP
                        />
                        {emailChangePending && (
                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <label>Código de Verificação (E-mail)</label>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={emailOtp} 
                                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))} 
                                    placeholder="6 dígitos" 
                                    maxLength="6"
                                    required 
                                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px', fontWeight: 'bold', border: '2px solid var(--primary-color)', background: 'rgba(0,0,0,0.3)' }}
                                />
                            </div>
                        )}
                        {emailChangePending && (
                            <button type="button" onClick={handleResendOtp} className="btn-text" style={{ fontSize: '0.8rem', marginTop: '5px', textDecoration: 'underline' }}>
                                Não recebeu? Reenviar código
                            </button>
                        )}
                    </div>

                    <div className="form-group" style={{ textAlign: 'center', marginTop: '10px' }}>
                        <img src={getTeamLogo(formData.teamname)} alt="Escudo" style={{ width: '60px', marginBottom: '10px' }} />
                        <label>Alterar Time</label>
                        <select value={formData.teamname} onChange={e => setFormData({...formData, teamname: e.target.value})} required>
                            <optgroup label="Espanha">
                                <option value="Real Madrid">Real Madrid</option>
                                <option value="Barcelona">Barcelona</option>
                                <option value="Atlético de Madrid">Atlético de Madrid</option>
                            </optgroup>
                            <optgroup label="Inglaterra">
                                <option value="Manchester City">Manchester City</option>
                                <option value="Arsenal">Arsenal</option>
                                <option value="Liverpool">Liverpool</option>
                            </optgroup>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label>Nome do Jogador</label>
                        <input type="text" value={formData.playername} disabled style={{ width: '100%', opacity: 0.7 }} />
                        <small style={{ color: 'var(--text-muted)' }}>O nome não pode ser alterado após a inscrição.</small>
                    </div>

                    <div className="profile-grid-fields">
                        <div className="form-group">
                            <label>Plataforma</label>
                            <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                                <option value="PS5">PlayStation 5</option>
                                <option value="Xbox">Xbox Series X/S</option>
                                <option value="PC">PC</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Gamertag / PSN ID</label>
                            <input type="text" value={formData.gamertag} onChange={e => setFormData({...formData, gamertag: e.target.value})} required />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
                        {loading ? 'Salvando...' : (emailChangePending ? 'Confirmar E-mail e Salvar' : 'Salvar Alterações')}
                    </button>
                </form>
            </div>
        </section>
    );
}

export default Profile;