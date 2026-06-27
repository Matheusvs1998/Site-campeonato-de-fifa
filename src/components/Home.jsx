import React, { useState, useEffect, useMemo } from 'react';
import { calculateStandings, extractGamertag, sortGroupTeams, getTopStats, calculateTopScorers } from '../helpers.js';
import { getTeamLogo, getFallbackLogo } from '../teamLogos.js';

function Home({ results, loading, onRegisterClick, showFeaturedMatch = true }) {
    const [champion, setChampion] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('jogos');

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

    const topStats = useMemo(() => getTopStats(groupStandings), [groupStandings]);
    
    const topScorers = useMemo(() => calculateTopScorers(results), [results]);

    const filteredResults = useMemo(() => {
        return results.filter(m => {
            const matchString = `${m.p1} ${m.p2} ${m.group_name} ${m.stage}`.toLowerCase();
            const matchesSearch = matchString.includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || m.status.toLowerCase() === filterStatus.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [results, searchTerm, filterStatus]);

    const featuredMatch = useMemo(() => {
        const live = results.find(m => m.status === 'Ao Vivo');
        if (live) return live;
        return results.find(m => m.status === 'Agendado');
    }, [results]);

    const liveMatches = filteredResults.filter(m => m.status === 'Ao Vivo');
    
    const finishedMatches = useMemo(() => filteredResults
        .filter(m => m.status === 'Finalizado')
        .sort((a, b) => {
            const dateA = new Date(`${a.date || '1970-01-01'}T${(a.time || '00:00').padStart(5, '0')}`);
            const dateB = new Date(`${b.date || '1970-01-01'}T${(b.time || '00:00').padStart(5, '0')}`);
            return dateB - dateA;
        }), [filteredResults]);

    const upcomingMatches = useMemo(() => filteredResults
        .filter(m => m.status === 'Agendado')
        .sort((a, b) => {
            const dateA = new Date(`${a.date || '9999-12-31'}T${(a.time || '23:59').padStart(5, '0')}`);
            const dateB = new Date(`${b.date || '9999-12-31'}T${(b.time || '23:59').padStart(5, '0')}`);
            return dateA - dateB;
        }), [filteredResults]);

    const MatchCard = ({ match, showScore, isFeatured = false }) => (
        <div key={match.id} className={`card match-card ${isFeatured ? 'featured-card' : ''}`}>
            {isFeatured && <div className="featured-badge">DESTAQUE</div>}
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

            {match.scorers && match.scorers.length > 0 && (
                <div className="scorers-list">
                    {match.scorers.map((s, idx) => (
                        <div key={idx} className="scorer-item">
                            <span className="scorer-icon">⚽</span>
                            <span><strong>{s.name}</strong></span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const HomeSkeleton = () => (
        <div className="fade-in">
            <div className="skeleton skeleton-card" style={{ height: '300px', marginBottom: '60px' }}></div>
            <div className="grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="card" style={{ padding: '20px' }}>
                        <div className="skeleton skeleton-circle" style={{ margin: '0 auto 15px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '80%', margin: '0 auto 10px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '50%', margin: '0 auto' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading && results.length === 0) {
        return (
            <React.Fragment>
                <section className="hero skeleton">
                    <div className="container">
                        <div className="skeleton skeleton-title" style={{ height: '50px', margin: '0 auto 20px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '40%', margin: '0 auto' }}></div>
                    </div>
                </section>
                <section className="container section">
                    <HomeSkeleton />
                </section>
            </React.Fragment>
        );
    }

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
                <div className="tabs-container">
                    <button className={`tab-btn ${activeTab === 'jogos' ? 'active' : ''}`} onClick={() => setActiveTab('jogos')}>Partidas</button>
                    <button className={`tab-btn ${activeTab === 'classificacao' ? 'active' : ''}`} onClick={() => setActiveTab('classificacao')}>Classificação</button>
                    <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Artilharia</button>
                </div>

                {activeTab === 'jogos' && (
                    <>
                        {featuredMatch && !champion && showFeaturedMatch && (
                            <div className="featured-section fade-in-up">
                                <div className="section-header-pro">
                                    <div className="section-header-icon" style={{ background: 'rgba(255, 193, 7, 0.15)' }}>⭐</div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Partida em Destaque</h2>
                                        <p className="section-subtitle">O confronto mais aguardado</p>
                                    </div>
                                    {featuredMatch.status === 'Ao Vivo' && (
                                        <div className="live-pulse-badge">
                                            <span className="live-dot"></span> AO VIVO
                                        </div>
                                    )}
                                </div>
                                <div className="featured-match-hero">
                                    <div className="featured-glow"></div>
                                    <div className="featured-match-content">
                                        <div className="featured-team">
                                            <img 
                                                src={getTeamLogo(featuredMatch.p1)} 
                                                alt={featuredMatch.p1} 
                                                className="featured-team-logo"
                                                loading="lazy"
                                                onError={(e) => { e.target.src = getFallbackLogo(featuredMatch.p1.split(' (')[0]); }}
                                            />
                                            <span className="featured-team-name">{featuredMatch.p1.split(' (')[0]}</span>
                                            <small className="featured-gamertag">{extractGamertag(featuredMatch.p1)}</small>
                                        </div>
                                        
                                        <div className="featured-score-area">
                                            {featuredMatch.status !== 'Agendado' ? (
                                                <div className="featured-score">
                                                    <span>{featuredMatch.score1}</span>
                                                    <span className="featured-score-divider">:</span>
                                                    <span>{featuredMatch.score2}</span>
                                                </div>
                                            ) : (
                                                <div className="featured-vs">VS</div>
                                            )}
                                            <div className="featured-meta">
                                                <span className="featured-stage">{featuredMatch.stage} {featuredMatch.group_name ? `• ${featuredMatch.group_name}` : ''}</span>
                                                {featuredMatch.date && featuredMatch.time && (
                                                    <span className="featured-datetime">
                                                        📅 {new Date(featuredMatch.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month: 'short'})} às {featuredMatch.time}
                                                    </span>
                                                )}
                                                <span className={`featured-status ${featuredMatch.status === 'Ao Vivo' ? 'live' : featuredMatch.status === 'Agendado' ? 'scheduled' : 'finished'}`}>
                                                    {featuredMatch.status === 'Ao Vivo' && <span className="live-dot"></span>}
                                                    {featuredMatch.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="featured-team">
                                            <img 
                                                src={getTeamLogo(featuredMatch.p2)} 
                                                alt={featuredMatch.p2} 
                                                className="featured-team-logo"
                                                loading="lazy"
                                                onError={(e) => { e.target.src = getFallbackLogo(featuredMatch.p2.split(' (')[0]); }}
                                            />
                                            <span className="featured-team-name">{featuredMatch.p2.split(' (')[0]}</span>
                                            <small className="featured-gamertag">{extractGamertag(featuredMatch.p2)}</small>
                                        </div>
                                    </div>
                                    {featuredMatch.scorers && featuredMatch.scorers.length > 0 && (
                                        <div className="featured-scorers">
                                            {featuredMatch.scorers.map((s, idx) => (
                                                <span key={idx} className="featured-scorer-tag">⚽ {s.name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="search-filter-bar">
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar time, jogador ou grupo..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                                <option value="all">Todos os Status</option>
                                <option value="ao vivo">🔴 Ao Vivo</option>
                                <option value="agendado">📅 Próximos</option>
                                <option value="finalizado">✅ Encerrados</option>
                            </select>
                        </div>

                        {liveMatches.length > 0 && (
                            <div className="live-section fade-in-up" style={{marginBottom: '60px'}}>
                                <div className="section-header-pro">
                                    <div className="section-header-icon live-icon">
                                        <span className="live-dot"></span>
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Ao Vivo Agora</h2>
                                        <p className="section-subtitle">{liveMatches.length} {liveMatches.length === 1 ? 'partida em andamento' : 'partidas em andamento'}</p>
                                    </div>
                                    <div className="live-pulse-badge">
                                        <span className="live-dot"></span> LIVE
                                    </div>
                                </div>
                                <div className="results-grid">
                                    {liveMatches.map(match => <MatchCard key={match.id} match={match} showScore={true} />)}
                                </div>
                            </div>
                        )}

                        {upcomingMatches.length > 0 && (
                            <div className="upcoming-section fade-in-up" style={{marginBottom: '60px'}}>
                                <div className="section-header-pro">
                                    <div className="section-header-icon" style={{ background: 'rgba(0, 123, 255, 0.15)' }}>📅</div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Próximos Jogos</h2>
                                        <p className="section-subtitle">{upcomingMatches.length} {upcomingMatches.length === 1 ? 'confronto agendado' : 'confrontos agendados'}</p>
                                    </div>
                                </div>
                                <div className="results-grid">
                                    {upcomingMatches.map(match => <MatchCard key={match.id} match={match} showScore={false} />)}
                                </div>
                            </div>
                        )}

                        {finishedMatches.length > 0 && (
                            <div className="finished-section fade-in-up" style={{marginBottom: '60px'}}>
                                <div className="section-header-pro">
                                    <div className="section-header-icon" style={{ background: 'rgba(40, 167, 69, 0.15)' }}>✅</div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Resultados Finais</h2>
                                        <p className="section-subtitle">{finishedMatches.length} {finishedMatches.length === 1 ? 'partida encerrada' : 'partidas encerradas'}</p>
                                    </div>
                                </div>
                                <div className="results-grid">
                                    {finishedMatches.map(match => <MatchCard key={match.id} match={match} showScore={true} />)}
                                </div>
                            </div>
                        )}

                        {filteredResults.length === 0 && (
                            <div className="empty-state fade-in">
                                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🏟️</div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Nenhuma partida encontrada para os filtros selecionados.</p>
                                <button 
                                    className="btn-text" 
                                    style={{ marginTop: '15px', justifyContent: 'center' }}
                                    onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'classificacao' && (
                    <div className="fade-in">
                        {Object.keys(groupStandings).length > 0 ? (
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
                                                        const isTopAttack = topStats.topAttack.teams.includes(team.fullName);
                                                        const isTopDefense = topStats.topDefense.teams.includes(team.fullName);
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
                                                                        <div style={{ fontWeight: 'bold' }}>
                                                                            {teamName}
                                                                            {isTopAttack && <span className="stat-badge badge-attack" title="Melhor Ataque">🚀</span>}
                                                                            {isTopDefense && <span className="stat-badge badge-defense" title="Melhor Defesa">🛡️</span>}
                                                                        </div>
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
                        ) : (
                            <div className="text-center" style={{ padding: '40px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>Classificação ainda não disponível.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '40px', color: 'var(--primary-color)' }}>🏆 Ranking de Artilharia</h2>
                        {topScorers.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {topScorers.map((scorer, idx) => (
                                    <div key={idx} className="stats-card">
                                        <div className="rank-number">#{idx + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{scorer.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Competidor</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary-color)' }}>{scorer.goals}</div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Gols</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center" style={{ padding: '40px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>Nenhum gol registrado até o momento.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </React.Fragment>
    );
}

export default Home;