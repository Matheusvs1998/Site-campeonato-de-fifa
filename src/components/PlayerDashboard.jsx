import React, { useMemo } from 'react';
import { getTeamLogo, getFallbackLogo } from '../teamLogos';
import { extractGamertag, calculatePlayerStats } from '../helpers';
import DashboardShell from './DashboardShell';
import GamertagBadge from './GamertagBadge';

function PlayerDashboard({ user, userRegistration, results, onGoHome }) {
    const stats = useMemo(() => {
        if (!userRegistration) return null;
        return calculatePlayerStats(userRegistration.gamertag, results);
    }, [userRegistration, results]);

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
        <DashboardShell
            onGoHome={onGoHome}
            eyebrow="Acesso de competidor"
            title="Painel do Jogador"
            subtitle={`Bem-vindo, ${user.username}`}
        >
            <div>



            {stats && (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '40px' }}>
                    <div className="admin-section-card text-center" style={{ padding: '20px', margin: 0 }}>
                        <small style={{ color: '#9a9aa3', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em' }}>Aproveitamento</small>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ff3142', fontFamily: 'Anton, sans-serif', letterSpacing: '0.05em' }}>{stats.winRate}%</div>
                    </div>
                    <div className="admin-section-card text-center" style={{ padding: '20px', margin: 0 }}>
                        <small style={{ color: '#9a9aa3', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em' }}>Média de Gols</small>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', fontFamily: 'Anton, sans-serif', letterSpacing: '0.05em' }}>
                            {stats.matchesPlayed > 0 ? (stats.goalsFor / stats.matchesPlayed).toFixed(1) : '0.0'}
                        </div>
                    </div>
                    <div className="admin-section-card text-center" style={{ padding: '20px', margin: 0 }}>
                        <small style={{ color: '#9a9aa3', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em' }}>Saldo</small>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: (stats.goalsFor - stats.goalsAgainst) > 0 ? '#28a745' : ((stats.goalsFor - stats.goalsAgainst) < 0 ? '#ff3142' : '#fff'), fontFamily: 'Anton, sans-serif', letterSpacing: '0.05em' }}>
                            {(stats.goalsFor - stats.goalsAgainst) > 0 ? '+' : ''}
                            {stats.goalsFor - stats.goalsAgainst}
                        </div>
                    </div>
                    <div className="admin-section-card text-center" style={{ padding: '20px', margin: 0 }}>
                        <small style={{ color: '#9a9aa3', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '10px', letterSpacing: '0.1em' }}>Forma Atual</small>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', minHeight: '24px', alignItems: 'center' }}>
                            {stats.form && stats.form.length > 0 ? stats.form.map((r, i) => (
                                <span key={i} className="stat-badge" style={{ 
                                    background: r === 'V' ? '#28a745' : r === 'E' ? '#ffc107' : '#ff4444',
                                    color: r === 'E' ? '#000' : '#fff',
                                    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '0.8rem'
                                }}>{r}</span>
                            )) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Sem histórico</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-section-card" style={{marginBottom: '40px', padding: '30px'}}>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '0.1em', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>Sua Inscrição</h3>
                {userRegistration ? (
                    <div style={{display: 'flex', alignItems: 'center', gap: '30px', marginTop: '20px', flexWrap: 'wrap'}}>
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img src={getTeamLogo(userRegistration.teamname)} alt="Escudo" style={{width: '90px', marginBottom: '15px'}} />
                            <GamertagBadge gamertag={userRegistration.gamertag} platform={userRegistration.platform} />
                        </div>
                        <div style={{flex: 1, color: '#f2e9e2', fontSize: '1.05rem', lineHeight: '1.6'}}>
                            <p><strong>Time:</strong> <span style={{ color: '#fff' }}>{userRegistration.teamname}</span></p>
                            <p><strong>Gamertag:</strong> <span style={{ color: '#fff' }}>{userRegistration.gamertag}</span></p>
                            <p><strong>Plataforma:</strong> <span style={{ color: '#fff' }}>{userRegistration.platform}</span></p>
                        </div>
                    </div>
                ) : (
                    <p style={{marginTop: '15px', color: 'var(--text-muted)'}}>Dados de inscrição não encontrados.</p>
                )}
            </div>

            <h2 style={{borderLeft: '5px solid #ff3142', paddingLeft: '15px', marginBottom: '30px', fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '1.8rem'}}>Minhas Próximas Partidas</h2>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                        <span className="team-name-text" style={{ fontWeight: 'bold' }}>{match.p1.split(' (')[0]}</span>
                                        <GamertagBadge fullName={match.p1} style={{ transform: 'scale(0.85)', marginTop: '5px' }} />
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
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                        <span className="team-name-text" style={{ fontWeight: 'bold' }}>{match.p2.split(' (')[0]}</span>
                                        <GamertagBadge fullName={match.p2} style={{ transform: 'scale(0.85)', marginTop: '5px' }} />
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
                <div className="admin-section-card text-center" style={{padding: '40px'}}>
                    <p style={{color: '#9a9aa3', fontSize: '1.1rem'}}>Você não possui partidas agendadas no momento.</p>
                </div>
            )}
            </div>
        </DashboardShell>
    );
}

export default PlayerDashboard;