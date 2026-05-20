import React, { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo, getFallbackLogo } from '../teamLogos';
import { calculateStandings } from '../helpers';

function Admin({ results, registrations, updateResult, onDraw, onKnockoutDraw, onDeleteMatch, onDeleteAll, user }) {
    const [users, setUsers] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState(null);
    const [roleUpdateMessage, setRoleUpdateMessage] = useState(null);

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
            
            if (updates.role) {
                const roleNames = { player: 'Jogador', moderador: 'Moderador', admin: 'Administrador', developer: 'Desenvolvedor' };
                setRoleUpdateMessage(`O cargo de ${targetUser?.username} foi alterado para ${roleNames[updates.role] || updates.role}!`);
                setTimeout(() => setRoleUpdateMessage(null), 3000);
            }
        }
    };

    return (
        <section className="container section">
            {roleUpdateMessage && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>🛡️</div>
                        <h2>Cargo Atualizado!</h2>
                        <p>{roleUpdateMessage}</p>
                    </div>
                </div>
            )}

            <div className="admin-header">
                <div>
                    <h2>Painel Administrativo</h2>
                    <p>Logado como: <strong className={`text-${user?.role}`}>{user?.username}</strong></p>
                </div>
                <div className="admin-actions">
                    {isDev && <button className="btn-primary" style={{ background: '#ff4444' }} onClick={onDeleteAll}>Resetar Campeonato</button>}
                    {isAdmin && <button className="btn-primary" onClick={onDraw}>Sortear Grupos</button>}
                    {isAdmin && results.length > 0 && isLastStageFinished && (
                        <button className="btn-primary" style={{ background: '#28a745' }} onClick={onKnockoutDraw}>Próxima Fase</button>
                    )}
                </div>
            </div>

            {isDev && (
                <div className="card" style={{ marginBottom: '40px', padding: '20px' }}>
                    <h3>Gerenciar Usuários</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ width: '100%', marginTop: '15px' }}>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Cargo</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <strong 
                                                className={`text-${u.role}`}
                                                style={{ 
                                                    color: u.is_banned ? '#6c757d' : (u.role === 'developer' ? '#28a745' : u.role === 'admin' ? '#007bff' : u.role === 'moderador' ? '#ffc107' : '#ffffff'),
                                                    opacity: u.is_banned ? 0.6 : 1
                                                }}
                                            >
                                                {u.username}
                                            </strong>
                                        </td>
                                        <td>
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                                                disabled={u.role === 'developer' && !isDev}
                                                className={`text-${u.role}`}
                                                style={{ 
                                                    fontWeight: 'bold', 
                                                    background: 'rgba(0,0,0,0.3)', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    padding: '5px', 
                                                    borderRadius: '4px',
                                                    color: u.role === 'developer' ? '#28a745' : u.role === 'admin' ? '#007bff' : u.role === 'moderador' ? '#ffc107' : '#ffffff'
                                                }}
                                            >
                                                <option value="player" style={{ color: '#ffffff', background: '#222' }}>Jogador</option>
                                                <option value="moderador" style={{ color: '#ffc107', background: '#222' }}>Moderador</option>
                                                <option value="admin" style={{ color: '#007bff', background: '#222' }}>Administrador</option>
                                                {isDev && <option value="developer" style={{ color: '#28a745', background: '#222' }}>Desenvolvedor</option>}
                                            </select>
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => handleUpdateUser(u.id, { is_banned: !u.is_banned })}
                                                style={{ 
                                                    backgroundColor: 'transparent',
                                                    color: '#ff4444', 
                                                    border: '1px solid #ff4444',
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                {u.is_banned ? 'Desbanir' : 'Banir'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="card" style={{ marginBottom: '40px', padding: '20px' }}>
                <h3>Inscritos ({registrations.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table" style={{ width: '100%', marginTop: '15px' }}>
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
                                    <td>{reg.teamname}</td>
                                    <td>{reg.playername}</td>
                                    <td>{reg.gamertag}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
                <h3>Gerenciar Partidas</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table" style={{ width: '100%', marginTop: '15px' }}>
                        <thead>
                            <tr>
                                <th>Partida</th>
                                <th>Placar</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMatches.map(match => (
                                <tr key={match.id}>
                                    <td>{match.p1} vs {match.p2}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            value={match.score1} 
                                            style={{ width: '40px' }}
                                            onChange={(e) => updateResult(match.id, 'score1', e.target.value)} 
                                        />
                                        x
                                        <input 
                                            type="number" 
                                            value={match.score2} 
                                            style={{ width: '40px' }}
                                            onChange={(e) => updateResult(match.id, 'score2', e.target.value)} 
                                        />
                                    </td>
                                    <td>
                                        <select 
                                            value={match.status} 
                                            onChange={(e) => updateResult(match.id, 'status', e.target.value)}
                                            className={match.status === 'Ao Vivo' ? 'text-danger' : ''}
                                            style={match.status === 'Ao Vivo' ? { color: '#ff4444', fontWeight: 'bold' } : {}}
                                        >
                                            <option value="Agendado">Agendado</option>
                                            <option value="Ao Vivo">Ao Vivo</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button onClick={() => onDeleteMatch(match.id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

export default Admin;