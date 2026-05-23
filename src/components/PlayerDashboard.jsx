import React, { useMemo } from 'react';
import { getTeamLogo, getFallbackLogo } from '../teamLogos';
import { extractGamertag } from '../helpers';

function PlayerDashboard({ user, userRegistration, results }) {
    const upcomingMatches = useMemo(() => {
        if (!userRegistration) return [];
        return results.filter(m => 
            (m.status === 'Agendado' || m.status === 'Ao Vivo') && 
            (extractGamertag(m.p1) === userRegistration.gamertag || extractGamertag(m.p2) === userRegistration.gamertag)
        ).sort((a, b) => {
             const dateA = new Date(`${a.date || '9999-12-31'}T${(a.time || '23:59').padStart(5, '0')}`);
             const dateB = new Date(`${b.date || '9999-12-31'}T${(b.time || '23:59').padStart(5, '0')}`);
             return dateA - dateB;
        });
    }, [userRegistration, results]);

    return (
        <section className="container section">
            <div className="admin-header">
                <div>
                    <h2>Olá, {user.username}! 👋</h2>
                    <p style={{marginTop: '5px'}}>Bem-vindo ao seu painel do competidor.</p>
                </div>
            </div>

            <div className="card" style={{marginBottom: '40px', padding: '20px'}}>
                <h3>Sua Inscrição</h3>
                {userRegistration ? (
                    <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px', flexWrap: 'wrap'}}>
                        <div style={{ textAlign: 'center' }}>
                            <img src={getTeamLogo(userRegistration.teamname)} alt="Escudo" style={{width: '80px'}} />
                            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.1rem', marginTop: '5px' }}>{userRegistration.gamertag}</div>
                        </div>
                        <div style={{flex: 1}}>
                            <p style={{fontSize: '1.1rem'}}><strong>Time:</strong> {userRegistration.teamname}</p>
                            <p><strong>Gamertag:</strong> {userRegistration.gamertag}</p>
                            <p><strong>Plataforma:</strong> {userRegistration.platform}</p>
                        </div>
                    </div>
                ) : (
                    <p style={{marginTop: '15px', color: 'var(--text-muted)'}}>Dados de inscrição não encontrados.</p>
                )}
            </div>

            <h2 style={{borderLeft: '5px solid var(--primary-color)', paddingLeft: '15px', marginBottom: '30px'}}>Minhas Próximas Partidas</h2>
            {upcomingMatches.length > 0 ? (
                <div className="results-grid">
                    {upcomingMatches.map(match => (
                        <div key={match.id} className="card match-card">
                            <div className="match-info">
                                <div className="team-display">
                                    <img 
                                        src={getTeamLogo(match.p1)} 
                                        alt="T1" 
                                        className="team-logo" 
                                        onError={(e) => { e.target.src = getFallbackLogo(match.p1.split(' (')[0]); }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold' }}>{match.p1.split(' (')[0]}</span>
                                        <small style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '-2px' }}>{extractGamertag(match.p1)}</small>
                                    </div>
                                </div>
                                <span className="score">VS</span>
                                <div className="team-display">
                                    <img 
                                        src={getTeamLogo(match.p2)} 
                                        alt="T2" 
                                        className="team-logo" 
                                        onError={(e) => { e.target.src = getFallbackLogo(match.p2.split(' (')[0]); }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold' }}>{match.p2.split(' (')[0]}</span>
                                        <small style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '-2px' }}>{extractGamertag(match.p2)}</small>
                                    </div>
                                </div>
                            </div>
                            <div className={`status ${match.status.toLowerCase()}`} style={{textAlign: 'center'}}>
                                <span style={{display: 'block', fontSize: '1rem', color: 'var(--primary-color)', fontWeight: 'bold'}}>
                                    {match.date ? new Date(match.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data a definir'}
                                    {match.time ? ` às ${match.time}` : ''}
                                </span>
                                <span style={{fontSize: '0.85em'}}>{match.stage} {match.group_name ? `(${match.group_name})` : ''}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center" style={{padding: '40px'}}>
                    <p style={{color: 'var(--text-muted)', fontSize: '1.1rem'}}>Você não possui partidas agendadas no momento.</p>
                </div>
            )}
        </section>
    );
}

export default PlayerDashboard;