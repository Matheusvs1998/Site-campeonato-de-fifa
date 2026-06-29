import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo } from '../teamLogos';
import { translateAuthError } from '../helpers';
import DashboardShell from './DashboardShell';
import CustomSelect from './CustomSelect';
import InviteEnvelope from './InviteEnvelope';
import GamertagBadge from './GamertagBadge';
import { teamOptions, platformOptions } from '../optionsData';

function Profile({ user, userRegistration, onUpdate, onGoHome }) {
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);

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

    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            // Usa a mesma RPC server-side que o Admin usa, garantindo que
            // Auth + Profiles + Registrations sejam removidos de uma vez,
            // sem depender de políticas de RLS do client.
            const { error: deleteError } = await supabaseClient.rpc('delete_full_user_complete', {
                target_user_id: user.id
            });
            if (deleteError) throw deleteError;

            // Encerra a sessão local
            await supabaseClient.auth.signOut();
            setShowDeleteConfirm(false);
            setIsDeleted(true);
            setTimeout(() => {
                window.location.reload(); // Recarrega para limpar o estado global da aplicação
            }, 2500);
        } catch (err) {
            setMessage({ text: 'Erro ao excluir conta: ' + translateAuthError(err.message), type: 'error' });
            setLoading(false);
        }
    };

    return (
        <DashboardShell
            onGoHome={onGoHome}
            eyebrow="Acesso Restrito"
            title="Meu Perfil"
            subtitle="Gerencie sua conta"
        >
            <div>
                <form onSubmit={handleUpdate} className="env-form" style={{ maxWidth: '450px', margin: '0 auto', padding: '25px', background: 'transparent', boxShadow: 'none' }}>
                    

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

                    <div className="env-field-group">
                        <label className="env-label">Player Name</label>
                        <input 
                            type="text" 
                            className="gc-field"
                            value={formData.playername} 
                            disabled 
                            style={{ opacity: 0.7 }}
                        />
                    </div>
                    
                    <div className="env-field-group">
                        <label className="env-label">E-mail (Login)</label>
                        <input 
                            type="email" 
                            className="gc-field"
                            value={editableEmail} 
                            onChange={e => {
                                setEditableEmail(e.target.value);
                                if (e.target.value !== user?.email) {
                                    setEmailChangePending(false);
                                }
                            }}
                            required 
                            placeholder="seu@email.com"
                            disabled={loading && !emailChangePending}
                        />
                        {emailChangePending && (
                            <div className="env-field-group" style={{ marginTop: '10px' }}>
                                <label className="env-label">Código de Verificação (E-mail)</label>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={emailOtp} 
                                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))} 
                                    placeholder="6 dígitos" 
                                    maxLength="6"
                                    required 
                                    className="gc-field"
                                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px', fontWeight: 'bold' }}
                                />
                            </div>
                        )}
                        {emailChangePending && (
                            <button 
                                type="button" 
                                onClick={handleResendOtp} 
                                className="btn-text" 
                                style={{ marginTop: '15px', width: '100%', justifyContent: 'center' }}
                            >
                                📩 Não recebeu o código? <strong>Reenviar agora</strong>
                            </button>
                        )}
                    </div>

                    <div className="env-field-group" style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src={getTeamLogo(formData.teamname)} alt="Escudo" style={{ width: '70px', marginBottom: '15px' }} />
                        <GamertagBadge gamertag={formData.gamertag} platform={formData.platform} style={{ marginBottom: '25px' }} />
                        
                        <label className="env-label" style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>Alterar Time</label>
                        <div style={{ width: '100%', textAlign: 'left' }}>
                            <CustomSelect 
                                options={teamOptions}
                                value={formData.teamname}
                                onChange={(val) => setFormData({ ...formData, teamname: val })}
                                placeholder="Selecione um time..."
                                isTeam={true}
                            />
                        </div>
                    </div>

                    <div className="env-field-group" style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '8px' }}>
                        <label className="env-label" style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>Privacidade e Dados</label>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0' }}>
                            Em conformidade com a LGPD, você pode gerenciar ou excluir seus dados permanentemente através das opções abaixo.
                        </p>
                    </div>

                    <div className="env-field-group">
                        <label className="env-label">Gamertag (EA ID)</label>
                        <input 
                            type="text" 
                            className="gc-field"
                            value={formData.gamertag} 
                            onChange={e => setFormData({...formData, gamertag: e.target.value})} 
                            required 
                            placeholder="Seu nick no jogo"
                        />
                    </div>
                    
                    <div className="env-field-group">
                        <label className="env-label">Plataforma</label>
                        <CustomSelect 
                            options={platformOptions}
                            value={formData.platform}
                            onChange={(val) => setFormData({ ...formData, platform: val })}
                            placeholder="Selecione..."
                            isPlatform={true}
                        />
                    </div>

                    <button type="submit" className="env-submit" disabled={loading} style={{ marginTop: '20px' }}>
                        {loading ? 'Salvando...' : (emailChangePending ? 'Confirmar E-mail e Salvar' : 'Salvar Alterações')}
                    </button>

                    <hr style={{ margin: '30px 0', borderColor: 'rgba(255,255,255,0.05)' }} />

                    <div style={{ textAlign: 'center' }}>
                        <button type="button" className="env-submit" style={{ background: 'transparent', borderColor: '#ff4444', color: '#ff4444' }} onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                            Excluir minha conta e dados permanentemente
                        </button>
                    </div>
                </form>
            </div>

            {showDeleteConfirm && (
                <div className="success-overlay" style={{ zIndex: 5000 }}>
                    <div className="success-modal" style={{ borderColor: '#ff4444' }}>
                        <div style={{ fontSize: '5rem' }}>⚠️</div>
                        <h2 style={{ color: '#ff4444' }}>Excluir Conta?</h2>
                        <p>Esta ação é <strong>irreversível</strong>. Todos os seus dados de perfil e inscrições em campeonatos serão apagados.</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px', flexWrap: 'wrap' }}>
                            <button 
                                className="btn-primary" 
                                style={{ background: '#ff4444' }} 
                                onClick={handleDeleteAccount} 
                                disabled={loading}
                            >
                                {loading ? 'Processando...' : 'Sim, Excluir Tudo'}
                            </button>
                            <button className="btn-primary" style={{ background: '#444' }} onClick={() => setShowDeleteConfirm(false)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleted && (
                <div className="success-overlay" style={{ zIndex: 6000 }}>
                    <div className="success-modal" style={{ borderColor: '#ff4444' }}>
                        <div style={{ fontSize: '5rem' }}>👋</div>
                        <p>Seus dados foram removidos com sucesso de nossos servidores.</p>
                        <p style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.7 }}>Esperamos te ver em breve!</p>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}

export default Profile;