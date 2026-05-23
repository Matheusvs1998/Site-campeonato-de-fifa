import React, { useState, useEffect, useMemo } from 'react';
import { calculateStandings, extractGamertag, sortGroupTeams } from '../helpers.js';
import { getTeamLogo, getFallbackLogo } from '../teamLogos.js';

function Home({ results, onRegisterClick }) {
    const [champion, setChampion] = useState(null);

    useEffect(() => {
        const finalMatches = results.filter(m => m.stage.startsWith('Final'));
        if (finalMatches.length > 0 && finalMatches.every(m => m.status === 'Finalizado')) {
            const scores = {};
            finalMatches.forEach(m => {
                scores[m.p1] = (scores[m.p1] || 0) + (parseInt(m.score1) || 0);
                scores[m.p2] = (scores[m.p2] || 0) + (parseInt(m.score2) || 0);
            });
            const teams = Object.keys(scores);
            if (teams.length === 2) {
                const [t1, t2] = teams;
                if (scores[t1] > scores[t2]) setChampion(t1);
                else if (scores[t2] > scores[t1]) setChampion(t2);
                else setChampion("Empate! (Decisão por pênaltis)");
            }
        } else {
            setChampion(null);
        }
    }, [results]);

    const currentStage = useMemo(() => {
        if (results.length === 0) return 'Fase de Grupos';
        const stages = [...new Set(results.map(m => m.stage.split(' (')[0]))];
        const order = ["Fase de Grupos", "Oitavas de Final", "Quartas de Final", "Semifinal", "Final"];
        let maxIndex = 0;
        stages.forEach(s => {
            const idx = order.indexOf(s);
            if (idx > maxIndex) maxIndex = idx;
        });
        return order[maxIndex];
    }, [results]);

    const groupStandings = useMemo(() => {
        return currentStage === 'Fase de Grupos' ? calculateStandings(results) : {};
    }, [results, currentStage]);

    const activeResults = useMemo(() => {
        return results.filter(m => m.stage.startsWith(currentStage));
    }, [results, currentStage]);

    const liveMatches = activeResults.filter(m => m.status === 'Ao Vivo');
    
    const finishedMatches = useMemo(() => activeResults
        .filter(m => m.status === 'Finalizado')
        .sort((a, b) => {
            const dateA = new Date(`${a.date || '1970-01-01'}T${(a.time || '00:00').padStart(5, '0')}`);
            const dateB = new Date(`${b.date || '1970-01-01'}T${(b.time || '00:00').padStart(5, '0')}`);
            return dateB - dateA;
        }), [activeResults]);

    const upcomingMatches = useMemo(() => activeResults
        .filter(m => m.status === 'Agendado')
        .sort((a, b) => {
            const dateA = new Date(`${a.date || '9999-12-31'}T${(a.time || '23:59').padStart(5, '0')}`);
            const dateB = new Date(`${b.date || '9999-12-31'}T${(b.time || '23:59').padStart(5, '0')}`);
            return dateA - dateB;
        }), [activeResults]);

    const MatchCard = ({ match, showScore }) => (
        <div key={match.id} className="card match-card">
            <div className="match-info">
                <div className="team-display">
                    <img 
                        src={getTeamLogo(match.p1)} 
                        alt={match.p1} 
                        className="team-logo" 
                        loading="lazy"
                        onError={(e) => { e.target.src = getFallbackLogo(match.p1.split(' (')[0]); }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold' }}>{match.p1.split(' (')[0]}</span>
                        <small style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '-2px' }}>{extractGamertag(match.p1)}</small>
                    </div>
                </div>
                
                {showScore ? (
                    <span className="score">{match.score1} x {match.score2}</span>
                ) : (
                    <span className="score" style={{color: 'var(--text-muted)', fontSize: '1.2rem'}}>VS</span>
                )}

                <div className="team-display">
                    <img 
                        src={getTeamLogo(match.p2)} 
                        alt={match.p2} 
                        className="team-logo" 
                        loading="lazy"
                        onError={(e) => { e.target.src = getFallbackLogo(match.p2.split(' (')[0]); }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold' }}>{match.p2.split(' (')[0]}</span>
                        <small style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '-2px' }}>{extractGamertag(match.p2)}</small>
                    </div>
                </div>
            </div>
            <div className={`status ${match.status.toLowerCase()}`} style={{ textAlign: 'center' }}>
                {match.stage && <span style={{display: 'block', fontSize: '0.85em', color: 'var(--primary-color)'}}>{match.stage} {match.group_name ? `(${match.group_name})` : ''}</span>}
                {match.date && match.time && (
                    <span style={{display: 'block', fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 'bold', margin: '5px 0'}}>
                        {new Date(match.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                        {match.time ? ` às ${match.time}` : ''}
                    </span>
                )}
                <span style={{ display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>{match.status}</span>
            </div>
        </div>
    );

    return (
        <React.Fragment>
            {champion && (
                <section className="champion-section fade-in">
                    {[...Array(6)].map((_, i) => <div key={i} className="firework"></div>)}
                    <div className="champion-modal winner-modal">
                        <div className="winner-badge">CAMPEÃO</div>
                        <div className="winner-trophy">🏆</div>
                        <img 
                            src={getTeamLogo(champion)} 
                            alt="Escudo do Campeão" 
                            className="winner-team-logo"
                            onError={(e) => { e.target.src = getFallbackLogo(champion.split(' (')[0]); }}
                        />
                        <h2 className="winner-name">{champion.split(' (')[0]}</h2>
                        <p style={{ fontWeight: 'bold', color: 'var(--primary-color)', marginTop: '-10px', marginBottom: '15px', fontSize: '1.2rem' }}>{extractGamertag(champion)}</p>
                        <p className="winner-congrats">Parabéns por conquistar a Gangster cup!</p>
                    </div>
                </section>
            )}

            <section className="hero">
                <div className="container">
                    <h1>Bem vindos a Gangster Cup</h1>
                    <p>Acompanhe os próximos confrontos e os resultados em tempo real.</p>
                    <button className="btn-large" style={{marginTop: '20px'}} onClick={onRegisterClick}>Garantir minha vaga</button>
                </div>
            </section>

            <section className="container section">
                {Object.keys(groupStandings).length > 0 && (
                    <div style={{ marginBottom: '60px' }}>
                        <h2 style={{ borderLeft: '5px solid var(--primary-color)', paddingLeft: '15px', marginBottom: '30px' }}>Classificação dos Grupos</h2>
                        <div className="groups-grid">
                            {Object.keys(groupStandings).sort().map(groupName => (
                                <div key={groupName} className="card group-card">
                                    <h3>{groupName}</h3>
                                    <table className="group-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th style={{ textAlign: 'right' }}>Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortGroupTeams(Object.values(groupStandings[groupName]), results)
                                                .map((team, idx) => {
                                                    const teamName = team.fullName.split(' (')[0];
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <img 
                                                                    src={getTeamLogo(teamName)} 
                                                                    className="team-logo-small" 
                                                                    alt="" 
                                                                    loading="lazy"
                                                                    onError={(e) => { e.target.src = getFallbackLogo(teamName); }}
                                                                />
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <div style={{ fontWeight: 'bold' }}>{teamName}</div>
                                                                    <small style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>{extractGamertag(team.fullName)}</small>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>{team.pts}</td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {liveMatches.length > 0 && (
                    <div style={{marginBottom: '60px'}}>
                        <h2 style={{borderLeft: '5px solid var(--primary-color)', paddingLeft: '15px', marginBottom: '30px'}}>Ao Vivo Agora!</h2>
                        <div className="results-grid">
                            {liveMatches.map(match => <MatchCard key={match.id} match={match} showScore={true} />)}
                        </div>
                    </div>
                )}

                {finishedMatches.length > 0 && (
                    <div style={{marginBottom: '60px'}}>
                        <h2 style={{borderLeft: '5px solid var(--primary-color)', paddingLeft: '15px', marginBottom: '30px'}}>Resultados Finais</h2>
                        <div className="results-grid">
                            {finishedMatches.map(match => <MatchCard key={match.id} match={match} showScore={true} />)}
                        </div>
                    </div>
                )}

                {upcomingMatches.length > 0 && (
                    <div>
                        <h2 style={{borderLeft: '5px solid var(--text-muted)', paddingLeft: '15px', marginBottom: '30px'}}>Próximos Jogos</h2>
                        <div className="results-grid">
                            {upcomingMatches.map(match => <MatchCard key={match.id} match={match} showScore={false} />)}
                        </div>
                    </div>
                )}
            </section>
        </React.Fragment>
    );
}

export default Home;