import React, { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo, getFallbackLogo } from '../teamLogos';
import { calculateStandings, extractGamertag } from '../helpers';
import DashboardShell from './DashboardShell';
import GamertagBadge from './GamertagBadge';

function Admin({ results, registrations, updateResult, onDraw, onKnockoutDraw, onDeleteMatch, onDeleteAll, user, fetchData, showFeaturedMatch, onToggleFeatured, onGoHome }) {
    const [users, setUsers] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState(null);
    const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [roleUpdateMessage, setRoleUpdateMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showScorersModal, setShowScorersModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [newScorer, setNewScorer] = useState({ name: '', team: 1 });
    const [selectedMobileUser, setSelectedMobileUser] = useState(null);
    const [selectedMobileRegistration, setSelectedMobileRegistration] = useState(null);
    const [selectedMobileMatch, setSelectedMobileMatch] = useState(null);

    const handleAddScorer = async () => {
        if (!newScorer.name || !selectedMatch) return;
        const currentScorers = selectedMatch.scorers || [];
        const updatedScorers = [...currentScorers, { name: newScorer.name, team: newScorer.team }];
        
        await updateResult(selectedMatch.id, 'scorers', updatedScorers);
        setSelectedMatch({ ...selectedMatch, scorers: updatedScorers });
        setNewScorer({ ...newScorer, name: '' });
    };

    const handleRemoveScorer = async (index) => {
        const updatedScorers = (selectedMatch.scorers || []).filter((_, i) => i !== index);
        await updateResult(selectedMatch.id, 'scorers', updatedScorers);
        setSelectedMatch({ ...selectedMatch, scorers: updatedScorers });
    };

    const sortedMatches = useMemo(() => {
        if (results.length === 0) return [];
        const stages = [...new Set(results.map(m => m.stage.split(' (')[0]))];
        const order = ["Fase de Grupos", "Oitavas de Final", "Quartas de Final", "Semifinal", "Final"];
        let maxIndex = 0;
        stages.forEach(s => {
            const idx = order.indexOf(s);
            if (idx > maxIndex) maxIndex = idx;
        });
        const currentStage = order[maxIndex];

        return [...results]
            .filter(m => m.stage.startsWith(currentStage))
            .sort((a, b) => {
                if (a.stage !== b.stage) {
                    if (a.stage === 'Fase de Grupos') return -1;
                    if (b.stage === 'Fase de Grupos') return 1;
                    return a.stage.localeCompare(b.stage);
                }
                if (a.group_name !== b.group_name) return (a.group_name || '').localeCompare(b.group_name || '');
                return a.id.localeCompare(b.id);
            });
    }, [results]);

    const isLastStageFinished = useMemo(() => {
        if (results.length === 0) return false;
        const stages = [...new Set(results.map(m => m.stage.split(' (')[0]))];
        const lastStage = stages.includes('Final') ? 'Final' :
                          stages.includes('Semifinal') ? 'Semifinal' :
                          stages.includes('Quartas de Final') ? 'Quartas de Final' :
                          stages.includes('Oitavas de Final') ? 'Oitavas de Final' : 'Fase de Grupos';
        
        // Não mostrar o botão se já estivermos na Final (não há fase seguinte)
        if (lastStage === 'Final') return false;

        return results.filter(m => m.stage.startsWith(lastStage)).every(m => m.status === 'Finalizado');
    }, [results]);

    const userRoleLower = user?.role?.toLowerCase() || 'jogador';
    const isDev = userRoleLower === 'desenvolvedor' || userRoleLower === 'developer';
    const isAdmin = userRoleLower === 'admin' || userRoleLower === 'administrador' || isDev;
    const isMod = userRoleLower === 'moderador' || userRoleLower === 'moderator';

    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabaseClient.from('profiles').select('*');
            if (data) setUsers(data);
        };
        if (isDev) fetchUsers();
    }, [isDev]);

    const handleUpdateUser = async (id, updates) => {
        const { error } = await supabaseClient.from('profiles').update(updates).eq('id', id);
        if (error) {
            alert(error.message);
        } else {
            const targetUser = users.find(u => u.id === id);
            setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
            
            if (updates.role || updates.is_banned !== undefined) {
                const roleNames = { player: 'Jogador', moderador: 'Moderador', admin: 'Administrador', developer: 'Desenvolvedor' };
                const message = updates.role 
                    ? `O cargo de ${targetUser?.username} foi alterado para ${roleNames[updates.role] || updates.role}!`
                    : `${targetUser?.username} foi ${updates.is_banned ? 'banido' : 'desbanido'} com sucesso!`;
                
                setRoleUpdateMessage(message);
                setTimeout(() => setRoleUpdateMessage(null), 3000);
            }
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setLoading(true);
        try {
            // Remove a inscrição do jogador associada ao username para manter a tabela de Inscritos sincronizada
            await supabaseClient.from('registrations')
                .delete()
                .eq('playername', userToDelete.username);

            // Chama a função mestre que remove de: Auth e Profiles
            const { error: deleteError } = await supabaseClient.rpc('delete_full_user_complete', { 
                target_user_id: userToDelete.id 
            });

            if (deleteError) throw deleteError;

            // Atualiza o estado local
            setUsers(users.filter(u => u.id !== userToDelete.id));
            setRoleUpdateMessage(`Usuário ${userToDelete.username} e todos os seus dados foram removidos.`);
            setShowDeleteUserConfirm(false);
            setUserToDelete(null);

            // Sincroniza os dados globais (Inscritos, Partidas, etc)
            if (fetchData) await fetchData();

            // Limpa a mensagem após 3 segundos
            setTimeout(() => setRoleUpdateMessage(null), 3000);
        } catch (err) {
            console.error("Erro na exclusão completa:", err);
            alert("Erro crítico ao excluir usuário: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const roleClass = isDev ? 'developer' : isAdmin ? 'admin' : isMod ? 'moderador' : 'player';
    const roleIcon = isDev ? '🔧' : isAdmin ? '🛡️' : isMod ? '⚖️' : '🎮';
    const roleDisplay = user?.role || 'Jogador';

    return (
        <DashboardShell
            onGoHome={onGoHome}
            eyebrow="Acesso Restrito"
            title="Painel Administrativo"
            subtitle={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    Logado como: 
                    <span className={`role-indicator ${roleClass}`}>
                        {roleIcon} {roleDisplay}
                    </span>
                    <strong style={{ color: '#fff', letterSpacing: '0.05em' }}>{user?.username}</strong>
                </span>
            }
        >
            <div>
                {roleUpdateMessage && (
                <div className="success-overlay" onClick={() => setRoleUpdateMessage(null)}>
                    <div className="success-modal" onClick={e => e.stopPropagation()}>
                        <div style={{fontSize: '5rem'}}>
                            {roleUpdateMessage.includes('banido') ? '🚫' : (roleUpdateMessage.includes('removido') ? '🗑️' : '🛡️')}
                        </div>
                        <h2>
                            {roleUpdateMessage.includes('removido') ? 'Usuário Removido!' : 
                             (roleUpdateMessage.includes('banido') ? 'Status Atualizado!' : 'Cargo Atualizado!')}
                        </h2>
                        <p>{roleUpdateMessage}</p>
                        <button className="btn-primary" style={{marginTop: '20px'}} onClick={() => setRoleUpdateMessage(null)}>OK</button>
                    </div>
                </div>
            )}

            {/* Admin Actions */}
            <div className="admin-header">
                <div style={{ flex: 1 }}></div>
                <div className="admin-actions">
                    {isDev && (
                        <button className="btn-primary" onClick={onDeleteAll}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            <span>Resetar</span>
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn-primary" onClick={onDraw}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                            <span>Sortear Grupos</span>
                        </button>
                    )}
                    {isAdmin && results.length > 0 && isLastStageFinished && (
                        <button className="btn-primary" onClick={onKnockoutDraw}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            <span>Próxima Fase</span>
                        </button>
                    )}
                </div>
            </div>

            {isDev && (
                <div className="admin-section-card">
                    <div className="admin-section-header">
                        <div className="admin-section-icon users">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="anim-users">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3>Gerenciar Usuários</h3>
                        <span className="admin-section-count">{users.length} usuários</span>
                    </div>
                    <div className="admin-section-body" style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th className="mobile-hide">Cargo</th>
                                    <th className="mobile-hide" style={{ textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="user-row" onClick={() => window.innerWidth <= 768 && setSelectedMobileUser(u)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '8px',
                                                        background: u.is_banned ? 'rgba(108, 117, 125, 0.12)' : (u.role === 'developer' ? 'rgba(40, 167, 69, 0.12)' : u.role === 'admin' ? 'rgba(0, 123, 255, 0.12)' : u.role === 'moderador' ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255,255,255,0.05)'),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0
                                                    }}>
                                                        <span className="role-emoji-anim">
                                                            {u.is_banned ? '🚫' : (u.role === 'developer' ? '🔧' : u.role === 'admin' ? '👑' : u.role === 'moderador' ? '🛡️' : '⚽')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: u.is_banned ? '#6c757d' : 'var(--text-main)', opacity: u.is_banned ? 0.6 : 1 }}>
                                                            {u.username}
                                                        </strong>
                                                        {u.is_banned && <span style={{ display: 'block', fontSize: '0.7rem', color: '#ff4444', fontWeight: 700 }}>BANIDO</span>}
                                                    </div>
                                                </div>
                                                <div className="mobile-only-chevron">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="mobile-hide">
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                                                disabled={u.role === 'developer' && !isDev}
                                                className="admin-status-select"
                                                style={{ color: 'var(--text-main)' }}
                                            >
                                                <option value="player" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Jogador</option>
                                                <option value="moderador" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Moderador</option>
                                                <option value="admin" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Administrador</option>
                                                {isDev && <option value="developer" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Desenvolvedor</option>}
                                            </select>
                                        </td>
                                        <td className="mobile-hide">
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button className="admin-btn danger" onClick={() => handleUpdateUser(u.id, { is_banned: !u.is_banned })}>
                                                    {u.is_banned ? 'Desbanir' : 'Banir'}
                                                </button>
                                                <button className="admin-btn danger icon-only" onClick={() => { setUserToDelete(u); setShowDeleteUserConfirm(true); }} title="Excluir Permanentemente">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Configurações da Home */}
            {(isAdmin || isDev) && (
                <div className="admin-section-card">
                    <div className="admin-section-header">
                        <div className="admin-section-icon settings">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="anim-settings">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </div>
                        <h3>Configurações da Home</h3>
                    </div>
                    <div className="admin-section-body">
                        <div className="settings-toggle-row">
                            <div className="settings-toggle-info">
                                <h4>⭐ Partida em Destaque</h4>
                                <p>Exibir a seção de destaque na página inicial</p>
                            </div>
                            <button
                                className={`toggle-switch ${showFeaturedMatch ? 'active' : 'inactive'}`}
                                onClick={onToggleFeatured}
                            >
                                <span className="toggle-switch-knob" style={{ left: showFeaturedMatch ? '27px' : '3px' }} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inscritos */}
            <div className="admin-section-card">
                <div className="admin-section-header">
                    <div className="admin-section-icon registrations">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="anim-registrations">
                            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <path d="M12 11h4" />
                            <path d="M12 16h4" />
                            <path d="M8 11h.01" />
                            <path d="M8 16h.01" />
                        </svg>
                    </div>
                    <h3>Inscritos</h3>
                    <span className="admin-section-count">{registrations.length} jogadores</span>
                </div>
                <div className="admin-section-body" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th className="mobile-hide">Jogador</th>
                                <th className="mobile-hide">Gamertag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map((reg, idx) => (
                                <tr key={idx} className="clickable-row" onClick={() => window.innerWidth <= 768 && setSelectedMobileRegistration(reg)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <strong>{reg.teamname}</strong>
                                            <div className="mobile-only-chevron">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="mobile-hide">{reg.playername}</td>
                                    <td className="mobile-hide" style={{ wordBreak: 'break-word', maxWidth: '120px' }}>
                                        <GamertagBadge gamertag={reg.gamertag} platform={reg.platform || 'ps'} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gerenciar Partidas */}
            <div className="admin-section-card">
                <div className="admin-section-header">
                    <div className="admin-section-icon matches">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="anim-matches">
                            <line x1="6" y1="12" x2="10" y2="12" />
                            <line x1="8" y1="10" x2="8" y2="14" />
                            <line x1="15" y1="13" x2="15.01" y2="13" />
                            <line x1="18" y1="11" x2="18.01" y2="11" />
                            <rect width="20" height="12" x="2" y="6" rx="2" />
                        </svg>
                    </div>
                    <h3>Gerenciar Partidas</h3>
                    <span className="admin-section-count">{sortedMatches.length} partidas</span>
                </div>
                <div className="admin-section-body" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Partida</th>
                                {isDev && <th className="mobile-hide">Data</th>}
                                {isDev && <th className="mobile-hide">Horário</th>}
                                <th>Placar</th>
                                <th className="mobile-hide">Status</th>
                                <th className="mobile-hide" style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMatches.map(match => (
                                <tr key={match.id} className="clickable-row" onClick={() => window.innerWidth <= 768 && setSelectedMobileMatch(match)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', minWidth: '180px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, textAlign: 'center', minWidth: 0 }}>
                                                <img 
                                                    src={getTeamLogo(match.p1)} 
                                                    alt="" 
                                                    style={{ width: '24px', height: '24px', marginBottom: '2px' }} 
                                                    onError={(e) => { e.target.src = getFallbackLogo(match.p1.split(' (')[0]); }}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', lineHeight: '1', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p1.split(' (')[0]}</span>
                                                <GamertagBadge fullName={match.p1} style={{ transform: 'scale(0.7)', transformOrigin: 'center', marginTop: '2px' }} />
                                            </div>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 'bold' }}>VS</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, textAlign: 'center', minWidth: 0 }}>
                                                <img 
                                                    src={getTeamLogo(match.p2)} 
                                                    alt="" 
                                                    style={{ width: '24px', height: '24px', marginBottom: '2px' }} 
                                                    onError={(e) => { e.target.src = getFallbackLogo(match.p2.split(' (')[0]); }}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', lineHeight: '1', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p2.split(' (')[0]}</span>
                                                <GamertagBadge fullName={match.p2} style={{ transform: 'scale(0.7)', transformOrigin: 'center', marginTop: '2px' }} />
                                            </div>
                                            <div className="mobile-only-chevron">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </div>
                                        </div>
                                    </td>
                                    {isDev && (
                                        <td className="mobile-hide">
                                            <input type="date" className="admin-date-input" value={match.date || ''} onChange={(e) => updateResult(match.id, 'date', e.target.value)} onClick={(e) => window.innerWidth <= 768 && e.stopPropagation()} />
                                        </td>
                                    )}
                                    {isDev && (
                                        <td className="mobile-hide">
                                            <input type="time" className="admin-time-input" value={match.time || ''} onChange={(e) => updateResult(match.id, 'time', e.target.value)} onClick={(e) => window.innerWidth <= 768 && e.stopPropagation()} />
                                        </td>
                                    )}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                            <input type="number" className="admin-score-input" value={match.score1} onChange={(e) => updateResult(match.id, 'score1', e.target.value)} onClick={(e) => window.innerWidth <= 768 && e.stopPropagation()} />
                                            <span className="score-separator">×</span>
                                            <input type="number" className="admin-score-input" value={match.score2} onChange={(e) => updateResult(match.id, 'score2', e.target.value)} onClick={(e) => window.innerWidth <= 768 && e.stopPropagation()} />
                                        </div>
                                    </td>
                                    <td className="mobile-hide">
                                        <select 
                                            value={match.status} 
                                            onChange={(e) => updateResult(match.id, 'status', e.target.value)}
                                            className={`admin-status-select ${match.status === 'Ao Vivo' ? 'live' : ''}`}
                                            onClick={(e) => window.innerWidth <= 768 && e.stopPropagation()}
                                        >
                                            <option value="Agendado">Agendado</option>
                                            <option value="Ao Vivo">🔴 Ao Vivo</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </td>
                                    <td className="mobile-hide">
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button className="admin-btn success icon-only" onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); setShowScorersModal(true); }} title="Registrar Gols">⚽</button>
                                            <button className="admin-btn danger icon-only" onClick={(e) => { e.stopPropagation(); onDeleteMatch(match.id); }} title="Excluir Partida">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showScorersModal && selectedMatch && (
                <div className="success-overlay" style={{ zIndex: 6000 }}>
                    <div className="success-modal" style={{ maxWidth: '500px', width: '95%' }} onClick={e => e.stopPropagation()}>
                        <button className="close-alert" onClick={() => setShowScorersModal(false)}>×</button>
                        <h2 style={{ marginBottom: '10px' }}>Artilharia da Partida</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                            {selectedMatch.p1.split(' (')[0]} vs {selectedMatch.p2.split(' (')[0]}
                        </p>

                        <div className="card" style={{ background: 'var(--bg-input)', padding: '15px', marginBottom: '20px', textAlign: 'left' }}>
                            <h4 style={{ marginBottom: '10px', fontSize: '0.9rem' }}>Adicionar Gol</h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select 
                                    style={{ flex: 2, minWidth: '150px' }}
                                    value={newScorer.name}
                                    onChange={e => setNewScorer({ ...newScorer, name: e.target.value })}
                                >
                                    <option value="">Selecione o Jogador</option>
                                    <optgroup label={selectedMatch.p1.split(' (')[0]}>
                                        <option value={extractGamertag(selectedMatch.p1)}>{extractGamertag(selectedMatch.p1)}</option>
                                    </optgroup>
                                    <optgroup label={selectedMatch.p2.split(' (')[0]}>
                                        <option value={extractGamertag(selectedMatch.p2)}>{extractGamertag(selectedMatch.p2)}</option>
                                    </optgroup>
                                </select>
                                <select 
                                    style={{ flex: 1 }}
                                    value={newScorer.team}
                                    onChange={e => setNewScorer({ ...newScorer, team: parseInt(e.target.value) })}
                                >
                                    <option value={1}>Time 1</option>
                                    <option value={2}>Time 2</option>
                                </select>
                                <button className="btn-primary" style={{ padding: '10px 15px' }} onClick={handleAddScorer}>+</button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {(!selectedMatch.scorers || selectedMatch.scorers.length === 0) ? (
                                <p style={{ opacity: 0.5 }}>Nenhum gol registrado.</p>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Jogador</th>
                                            <th>Time</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedMatch.scorers.map((s, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{s.name}</strong></td>
                                                <td>{s.team === 1 ? 'Casa' : 'Fora'}</td>
                                                <td><button onClick={() => handleRemoveScorer(idx)} style={{ padding: '4px 8px', background: '#ff4444' }}>×</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <button className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowScorersModal(false)}>Concluir</button>
                    </div>
                </div>
            )}

            {showDeleteUserConfirm && (
                <div className="success-overlay" style={{ zIndex: 5000 }}>
                    <div className="success-modal" style={{ borderColor: '#ff4444' }}>
                        <div style={{ fontSize: '5rem' }}>⚠️</div>
                        <h2 style={{ color: '#ff4444' }}>Excluir Usuário?</h2>
                        <p>Deseja realmente apagar o perfil de <strong>{userToDelete?.username}</strong>?</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.8 }}>Esta ação é irreversível e removerá todos os dados do jogador e suas inscrições.</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px', flexWrap: 'wrap' }}>
                            <button className="btn-primary" style={{ background: '#ff4444' }} onClick={handleDeleteUser}>Sim, Excluir</button>
                            <button className="btn-primary" style={{ background: '#444' }} onClick={() => setShowDeleteUserConfirm(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedMobileUser && (
                <div className="success-overlay" style={{ zIndex: 5000 }} onClick={() => setSelectedMobileUser(null)}>
                    <div className="success-modal" style={{ width: '90%', maxWidth: '400px', padding: '30px 20px', background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: selectedMobileUser.is_banned ? 'rgba(108, 117, 125, 0.12)' : (selectedMobileUser.role === 'developer' ? 'rgba(40, 167, 69, 0.12)' : selectedMobileUser.role === 'admin' ? 'rgba(0, 123, 255, 0.12)' : selectedMobileUser.role === 'moderador' ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255,255,255,0.05)'),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
                                }}>
                                    <span className="role-emoji-anim">
                                        {selectedMobileUser.is_banned ? '🚫' : (selectedMobileUser.role === 'developer' ? '🔧' : selectedMobileUser.role === 'admin' ? '👑' : selectedMobileUser.role === 'moderador' ? '🛡️' : '⚽')}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{selectedMobileUser.username}</h3>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gerenciar Perfil</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Alterar Cargo</label>
                                <select 
                                    value={selectedMobileUser.role} 
                                    onChange={(e) => {
                                        handleUpdateUser(selectedMobileUser.id, { role: e.target.value });
                                        setSelectedMobileUser(prev => ({ ...prev, role: e.target.value }));
                                    }}
                                    disabled={selectedMobileUser.role === 'developer' && !isDev}
                                    className="admin-status-select"
                                    style={{ width: '100%', padding: '12px', color: 'var(--text-main)' }}
                                >
                                    <option value="player" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Jogador</option>
                                    <option value="moderador" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Moderador</option>
                                    <option value="admin" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Administrador</option>
                                    {isDev && <option value="developer" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Desenvolvedor</option>}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexDirection: 'column' }}>
                                <button className="admin-btn danger" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => {
                                    handleUpdateUser(selectedMobileUser.id, { is_banned: !selectedMobileUser.is_banned });
                                    setSelectedMobileUser(prev => ({ ...prev, is_banned: !prev.is_banned }));
                                }}>
                                    {selectedMobileUser.is_banned ? 'Desbanir Usuário' : 'Banir Usuário'}
                                </button>
                                {isDev && (
                                    <button className="admin-btn danger" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => {
                                        setUserToDelete(selectedMobileUser);
                                        setShowDeleteUserConfirm(true);
                                        setSelectedMobileUser(null);
                                    }}>
                                        Excluir Conta
                                    </button>
                                )}
                                <button className="admin-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '10px' }} onClick={() => setSelectedMobileUser(null)}>Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedMobileRegistration && (
                <div className="success-overlay" style={{ zIndex: 5000 }} onClick={() => setSelectedMobileRegistration(null)}>
                    <div className="success-modal" style={{ width: '90%', maxWidth: '400px', padding: '30px 20px', background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                                <img 
                                    src={getTeamLogo(selectedMobileRegistration.teamname)} 
                                    alt="" 
                                    style={{ width: '48px', height: '48px' }} 
                                    onError={(e) => { e.target.src = getFallbackLogo(selectedMobileRegistration.teamname); }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{selectedMobileRegistration.teamname}</h3>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ficha de Inscrição</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Jogador</label>
                                    <div style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{selectedMobileRegistration.playername}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Gamertag</label>
                                    <div style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>
                                        <GamertagBadge gamertag={selectedMobileRegistration.gamertag} platform={selectedMobileRegistration.platform || 'ps'} />
                                    </div>
                                </div>
                            </div>

                            <button className="admin-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '10px' }} onClick={() => setSelectedMobileRegistration(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedMobileMatch && (
                <div className="success-overlay" style={{ zIndex: 5000 }} onClick={() => setSelectedMobileMatch(null)}>
                    <div className="success-modal" style={{ width: '90%', maxWidth: '400px', padding: '30px 20px', background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <img src={getTeamLogo(selectedMobileMatch.p1)} alt="" style={{ width: '36px', height: '36px' }} onError={(e) => { e.target.src = getFallbackLogo(selectedMobileMatch.p1.split(' (')[0]); }} />
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedMobileMatch.p1.split(' (')[0]}</div>
                                </div>
                                <span style={{ fontSize: '1rem', opacity: 0.5, fontWeight: 'bold' }}>X</span>
                                <div style={{ textAlign: 'center' }}>
                                    <img src={getTeamLogo(selectedMobileMatch.p2)} alt="" style={{ width: '36px', height: '36px' }} onError={(e) => { e.target.src = getFallbackLogo(selectedMobileMatch.p2.split(' (')[0]); }} />
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedMobileMatch.p2.split(' (')[0]}</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                {isDev && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Data</label>
                                            <input type="date" className="admin-date-input" style={{ width: '100%', padding: '10px' }} value={selectedMobileMatch.date || ''} onChange={(e) => {
                                                updateResult(selectedMobileMatch.id, 'date', e.target.value);
                                                setSelectedMobileMatch(prev => ({...prev, date: e.target.value}));
                                            }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Hora</label>
                                            <input type="time" className="admin-time-input" style={{ width: '100%', padding: '10px' }} value={selectedMobileMatch.time || ''} onChange={(e) => {
                                                updateResult(selectedMobileMatch.id, 'time', e.target.value);
                                                setSelectedMobileMatch(prev => ({...prev, time: e.target.value}));
                                            }} />
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status</label>
                                    <select 
                                        value={selectedMobileMatch.status} 
                                        onChange={(e) => {
                                            updateResult(selectedMobileMatch.id, 'status', e.target.value);
                                            setSelectedMobileMatch(prev => ({...prev, status: e.target.value}));
                                        }}
                                        className="admin-status-select"
                                        style={{ width: '100%', padding: '12px' }}
                                    >
                                        <option value="Agendado">Agendado</option>
                                        <option value="Ao Vivo">Ao Vivo</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                    <button className="admin-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => {
                                        setSelectedMatch(selectedMobileMatch);
                                        setShowScorersModal(true);
                                        setSelectedMobileMatch(null);
                                    }}>⚽ Goleadores</button>

                                    {isAdmin && (
                                        <button className="admin-btn danger" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => {
                                            onDeleteMatch(selectedMobileMatch.id);
                                            setSelectedMobileMatch(null);
                                        }}>🗑️ Excluir Partida</button>
                                    )}
                                    <button className="admin-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '10px' }} onClick={() => setSelectedMobileMatch(null)}>Fechar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </DashboardShell>
    );
}

export default Admin;