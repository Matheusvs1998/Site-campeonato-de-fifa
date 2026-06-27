import React, { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo, getFallbackLogo } from '../teamLogos';
import { calculateStandings, extractGamertag } from '../helpers';

function Admin({ results, registrations, updateResult, onDraw, onKnockoutDraw, onDeleteMatch, onDeleteAll, user, fetchData, showFeaturedMatch, onToggleFeatured }) {
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

    const isDev = user?.role === 'developer';
    const isAdmin = user?.role === 'admin' || isDev;
    const isMod = user?.role === 'moderador';

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

    return (
        <section className="container section">
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

            {/* Admin Header */}
            <div className="admin-header">
                <div>
                    <h2>Painel Administrativo</h2>
                    <p>Logado como: <span className={`role-indicator ${user?.role}`}>
                        {user?.role === 'developer' ? '🔧 Desenvolvedor' : user?.role === 'admin' ? '👑 Administrador' : user?.role === 'moderador' ? '🛡️ Moderador' : '⚽ Jogador'}
                    </span> <strong style={{ marginLeft: '6px' }}>{user?.username}</strong></p>
                </div>
                <div className="admin-actions">
                    {isDev && <button className="btn-primary" style={{ background: '#ff4444' }} onClick={onDeleteAll}>🔄 Resetar</button>}
                    {isAdmin && <button className="btn-primary" onClick={onDraw}>🎲 Sortear Grupos</button>}
                    {isAdmin && results.length > 0 && isLastStageFinished && (
                        <button className="btn-primary" style={{ background: '#28a745' }} onClick={onKnockoutDraw}>⚡ Próxima Fase</button>
                    )}
                </div>
            </div>

            {isDev && (
                <div className="admin-section-card">
                    <div className="admin-section-header">
                        <div className="admin-section-icon users">👥</div>
                        <h3>Gerenciar Usuários</h3>
                        <span className="admin-section-count">{users.length} usuários</span>
                    </div>
                    <div className="admin-section-body" style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Cargo</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: u.is_banned ? 'rgba(108, 117, 125, 0.12)' : (u.role === 'developer' ? 'rgba(40, 167, 69, 0.12)' : u.role === 'admin' ? 'rgba(0, 123, 255, 0.12)' : u.role === 'moderador' ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255,255,255,0.05)'),
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0
                                                }}>
                                                    {u.is_banned ? '🚫' : (u.role === 'developer' ? '🔧' : u.role === 'admin' ? '👑' : u.role === 'moderador' ? '🛡️' : '⚽')}
                                                </div>
                                                <div>
                                                    <strong style={{ color: u.is_banned ? '#6c757d' : 'var(--text-main)', opacity: u.is_banned ? 0.6 : 1 }}>
                                                        {u.username}
                                                    </strong>
                                                    {u.is_banned && <span style={{ display: 'block', fontSize: '0.7rem', color: '#ff4444', fontWeight: 700 }}>BANIDO</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                                                disabled={u.role === 'developer' && !isDev}
                                                className="admin-status-select"
                                                style={{ color: u.role === 'developer' ? '#28a745' : u.role === 'admin' ? '#007bff' : u.role === 'moderador' ? '#ffc107' : 'var(--text-main)' }}
                                            >
                                                <option value="player" style={{ color: 'var(--text-main)', background: 'var(--bg-card)' }}>Jogador</option>
                                                <option value="moderador" style={{ color: '#ffc107', background: 'var(--bg-card)' }}>Moderador</option>
                                                <option value="admin" style={{ color: '#007bff', background: 'var(--bg-card)' }}>Administrador</option>
                                                {isDev && <option value="developer" style={{ color: '#28a745', background: 'var(--bg-card)' }}>Desenvolvedor</option>}
                                            </select>
                                        </td>
                                        <td>
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
                        <div className="admin-section-icon settings">⚙️</div>
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
                    <div className="admin-section-icon registrations">📋</div>
                    <h3>Inscritos</h3>
                    <span className="admin-section-count">{registrations.length} jogadores</span>
                </div>
                <div className="admin-section-body" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Jogador</th>
                                <th>Gamertag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map((reg, idx) => (
                                <tr key={idx}>
                                    <td><strong>{reg.teamname}</strong></td>
                                    <td>{reg.playername}</td>
                                    <td style={{ wordBreak: 'break-word', maxWidth: '120px' }}>{reg.gamertag}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gerenciar Partidas */}
            <div className="admin-section-card">
                <div className="admin-section-header">
                    <div className="admin-section-icon matches">⚽</div>
                    <h3>Gerenciar Partidas</h3>
                    <span className="admin-section-count">{sortedMatches.length} partidas</span>
                </div>
                <div className="admin-section-body" style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Partida</th>
                                {isDev && <th>Data</th>}
                                {isDev && <th>Horário</th>}
                                <th>Placar</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMatches.map(match => (
                                <tr key={match.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', minWidth: '220px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, textAlign: 'center', minWidth: 0 }}>
                                                <img 
                                                    src={getTeamLogo(match.p1)} 
                                                    alt="" 
                                                    style={{ width: '24px', height: '24px', marginBottom: '2px' }} 
                                                    onError={(e) => { e.target.src = getFallbackLogo(match.p1.split(' (')[0]); }}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', lineHeight: '1', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p1.split(' (')[0]}</span>
                                                <small style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 'bold', display: 'block', maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={extractGamertag(match.p1)}>{extractGamertag(match.p1)}</small>
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
                                                <small style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 'bold', display: 'block', maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={extractGamertag(match.p2)}>{extractGamertag(match.p2)}</small>
                                            </div>
                                        </div>
                                    </td>
                                    {isDev && (
                                        <td>
                                            <input type="date" className="admin-date-input" value={match.date || ''} onChange={(e) => updateResult(match.id, 'date', e.target.value)} />
                                        </td>
                                    )}
                                    {isDev && (
                                        <td>
                                            <input type="time" className="admin-time-input" value={match.time || ''} onChange={(e) => updateResult(match.id, 'time', e.target.value)} />
                                        </td>
                                    )}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                            <input type="number" className="admin-score-input" value={match.score1} onChange={(e) => updateResult(match.id, 'score1', e.target.value)} />
                                            <span className="score-separator">×</span>
                                            <input type="number" className="admin-score-input" value={match.score2} onChange={(e) => updateResult(match.id, 'score2', e.target.value)} />
                                        </div>
                                    </td>
                                    <td>
                                        <select 
                                            value={match.status} 
                                            onChange={(e) => updateResult(match.id, 'status', e.target.value)}
                                            className={`admin-status-select ${match.status === 'Ao Vivo' ? 'live' : ''}`}
                                        >
                                            <option value="Agendado">Agendado</option>
                                            <option value="Ao Vivo">🔴 Ao Vivo</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button className="admin-btn success icon-only" onClick={() => { setSelectedMatch(match); setShowScorersModal(true); }} title="Registrar Gols">⚽</button>
                                            <button className="admin-btn danger icon-only" onClick={() => onDeleteMatch(match.id)} title="Excluir Partida">🗑️</button>
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
        </section>
    );
}

export default Admin;