import React, { useState, useEffect, useMemo } from 'react';
import { calculateStandings, extractGamertag, extractPlatform, sortGroupTeams, getTopStats, calculateTopScorers } from '../helpers.js';
import GamertagBadge from './GamertagBadge.jsx';
import { getTeamLogo, getFallbackLogo } from '../teamLogos.js';

function Home({ results, loading, onRegisterClick, showFeaturedMatch = true }) {
    const [champion, setChampion] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('jogos');
    const [showLiveAlert, setShowLiveAlert] = useState(true);

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

    const formatDateTime = (match, withIcon = false) => {
        if (!match.date) return null;
        const datePart = new Date(match.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const timePart = match.time ? ` às ${match.time}` : '';
        return `${withIcon ? '📅 ' : ''}${datePart}${timePart}`;
    };

    const MatchCard = ({ match, showScore }) => {
        const statusClass = match.status.toLowerCase();
        const isLive = match.status === 'Ao Vivo';
        const isFinished = match.status === 'Finalizado';
        const metaParts = [match.group_name, match.stage].filter(Boolean).join(' · ');
        const dateLabel = formatDateTime(match);

        return (
            <div className={`match-card${isLive ? ' is-live' : ''}${isFinished ? ' is-finished' : ''}`}>
                <div className="gc-radials" aria-hidden="true"></div>
                <div className="match-card-inner">
                    <div className="match-card-head">
                        <span className="match-card-meta">{metaParts || 'Partida'}</span>
                        <span className={`status ${statusClass}`}>
                            {isLive && <span className="live-dot" aria-hidden="true"></span>}
                            {match.status}
                        </span>
                    </div>

                    <div className="team-display">
                        <div className="team-side">
                            <span className="team-logo">
                                <img
                                    src={getTeamLogo(match.p1)}
                                    alt={match.p1.split(' (')[0]}
                                    loading="lazy"
                                    onError={(e) => { e.target.src = getFallbackLogo(match.p1.split(' (')[0]); }}
                                />
                            </span>
                            <span className="team-name">{match.p1.split(' (')[0]}</span>
                            <GamertagBadge fullName={match.p1} style={{ transform: 'scale(0.75)', transformOrigin: 'center', marginTop: '2px' }} />
                        </div>
                        {showScore
                            ? <span className="score">{match.score1}<span style={{ color: 'var(--gc-live-dot)' }}>:</span>{match.score2}</span>
                            : <span className="match-vs">VS</span>}
                    </div>

                    <div className="match-divider"></div>

                    <div className="team-display">
                        <div className="team-side">
                            <span className="team-logo">
                                <img
                                    src={getTeamLogo(match.p2)}
                                    alt={match.p2.split(' (')[0]}
                                    loading="lazy"
                                    onError={(e) => { e.target.src = getFallbackLogo(match.p2.split(' (')[0]); }}
                                />
                            </span>
                            <span className="team-name">{match.p2.split(' (')[0]}</span>
                            <GamertagBadge fullName={match.p2} style={{ transform: 'scale(0.75)', transformOrigin: 'center', marginTop: '2px' }} />
                        </div>
                    </div>

                    {dateLabel && !showScore && (
                        <div className="match-card-meta" style={{ marginTop: '14px', textAlign: 'center' }}>{dateLabel}</div>
                    )}

                    {match.scorers && match.scorers.length > 0 && (
                        <div className="scorers-list">
                            {match.scorers.map((s, idx) => (
                                <div key={idx} className="scorer">
                                    <span aria-hidden="true">⚽</span>
                                    <strong>{s.name}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const HomeSkeleton = () => (
        <div className="fade-in">
            <div className="skeleton skeleton-card" style={{ height: '300px', marginBottom: '60px' }}></div>
            <div className="results-grid">
                {[1, 2, 3].map(i => (
                    <div key={i} className="match-card" style={{ padding: '20px' }}>
                        <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '18px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: '10px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading && results.length === 0) {
        return (
            <React.Fragment>
                <section className="hero">
                    <div className="hero-noise" aria-hidden="true"></div>
                    <div className="hero-content">
                        <div className="skeleton skeleton-title" style={{ height: '60px', width: '320px', margin: '0 auto 20px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '260px', margin: '0 auto' }}></div>
                    </div>
                </section>
                <div className="gc-content">
                    <HomeSkeleton />
                </div>
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
                        <div style={{ marginTop: '-10px', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                             <GamertagBadge fullName={champion} style={{ transform: 'scale(1.1)', transformOrigin: 'center' }} />
                        </div>
                        <p className="winner-congrats">Parabéns por conquistar a Gangster cup!</p>
                    </div>
                </section>
            )}

            <section className="hero">
                <div className="hero-noise" aria-hidden="true"></div>
                <div className="hero-content">

                    <div className="hero-kicker">Bem-vindos à</div>
                    <div className="hero-title-wrap" style={{ marginTop: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                        <img src="/logo-gangster-cup-white.png" alt="Gangster Cup" style={{ width: '100%', maxWidth: '550px', filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.6))' }} />
                    </div>
                    <p className="hero-subtitle">Acompanhe os próximos confrontos e os resultados em tempo real.</p>
                    <div className="hero-cta-wrap">
                        <button className="btn-large hero-cta" onClick={onRegisterClick}>Garantir minha vaga</button>
                    </div>
                </div>
            </section>

            <div className="gc-content">
                <div className="tabs-container">
                    <div className="tabs-pill">
                        <button className={`tab-btn ${activeTab === 'jogos' ? 'active' : ''}`} onClick={() => setActiveTab('jogos')}>Partidas</button>
                        <button className={`tab-btn ${activeTab === 'classificacao' ? 'active' : ''}`} onClick={() => setActiveTab('classificacao')}>Classificação</button>
                    </div>
                </div>

                {activeTab === 'jogos' && (
                    <>
                        {featuredMatch && !champion && showFeaturedMatch && (
                            <div className="featured-section fade-in-up">
                                <div className="featured-match-hero">
                                    <div className="gc-radials" aria-hidden="true"></div>
                                    <div className="gc-noise" aria-hidden="true"></div>
                                    <div className="featured-content">
                                        <div className="featured-header">
                                            <span className="featured-label">★ Partida em Destaque</span>
                                            {featuredMatch.status === 'Ao Vivo' && (
                                                <span className="gc-badge-live">
                                                    <span className="live-dot" aria-hidden="true"></span> Ao Vivo
                                                </span>
                                            )}
                                        </div>
                                        <div className="featured-body">
                                            <div className="featured-team">
                                                <span className="featured-team-logo">
                                                    <img
                                                        src={getTeamLogo(featuredMatch.p1)}
                                                        alt={featuredMatch.p1.split(' (')[0]}
                                                        loading="lazy"
                                                        onError={(e) => { e.target.src = getFallbackLogo(featuredMatch.p1.split(' (')[0]); }}
                                                    />
                                                </span>
                                                <span className="featured-team-name">{featuredMatch.p1.split(' (')[0]}</span>
                                                <GamertagBadge fullName={featuredMatch.p1} />
                                            </div>

                                            <div className="featured-center">
                                                {featuredMatch.status !== 'Agendado' ? (
                                                    <div className="featured-score">
                                                        <span>{featuredMatch.score1}</span>
                                                        <span className="sep"> : </span>
                                                        <span>{featuredMatch.score2}</span>
                                                    </div>
                                                ) : (
                                                    <div className="featured-vs">VS</div>
                                                )}
                                                <div className="featured-meta">
                                                    <span>{featuredMatch.stage}{featuredMatch.group_name ? ` · ${featuredMatch.group_name}` : ''}</span>
                                                    {formatDateTime(featuredMatch, true) && (
                                                        <span style={{ display: 'block', marginTop: '4px' }}>{formatDateTime(featuredMatch, true)}</span>
                                                    )}
                                                    <span className={`featured-status ${featuredMatch.status === 'Ao Vivo' ? 'live' : featuredMatch.status === 'Agendado' ? 'scheduled' : 'finished'}`} style={{ marginTop: '8px' }}>
                                                        {featuredMatch.status === 'Ao Vivo' && <span className="live-dot" aria-hidden="true"></span>}
                                                        {featuredMatch.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="featured-team">
                                                <span className="featured-team-logo">
                                                    <img
                                                        src={getTeamLogo(featuredMatch.p2)}
                                                        alt={featuredMatch.p2.split(' (')[0]}
                                                        loading="lazy"
                                                        onError={(e) => { e.target.src = getFallbackLogo(featuredMatch.p2.split(' (')[0]); }}
                                                    />
                                                </span>
                                                <span className="featured-team-name">{featuredMatch.p2.split(' (')[0]}</span>
                                                <GamertagBadge fullName={featuredMatch.p2} />
                                            </div>
                                        </div>
                                        {featuredMatch.scorers && featuredMatch.scorers.length > 0 && (
                                            <div className="featured-scorers">
                                                {featuredMatch.scorers.map((s, idx) => (
                                                    <span key={idx} className="scorer-tag">⚽ {s.name}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="search-filter-bar">
                            <div className="search-input-wrap">
                                <span className="search-icon" aria-hidden="true">⌕</span>
                                <input
                                    type="text"
                                    placeholder="Buscar time, jogador ou grupo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                    aria-label="Buscar partidas"
                                />
                            </div>
                            <div className="filter-select-wrap">
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select" aria-label="Filtrar por status">
                                    <option value="all">Todos os Status</option>
                                    <option value="ao vivo">Ao Vivo</option>
                                    <option value="agendado">Próximos</option>
                                    <option value="finalizado">Encerrados</option>
                                </select>
                            </div>
                        </div>

                        {liveMatches.length > 0 && (
                            <div className="fade-in-up">
                                <div className="section-header-pro">
                                    <div>
                                        <h2 className="section-title">Ao Vivo Agora</h2>
                                        <p className="section-subtitle">{liveMatches.length} {liveMatches.length === 1 ? 'partida em andamento' : 'partidas em andamento'}</p>
                                    </div>
                                    <div className="live-pulse-badge">
                                        <span className="live-dot" aria-hidden="true"></span> Live
                                    </div>
                                </div>
                                <div className="results-grid">
                                    {liveMatches.map(match => <MatchCard key={match.id} match={match} showScore={true} />)}
                                </div>
                            </div>
                        )}

                        {upcomingMatches.length > 0 && (
                            <div className="fade-in-up">
                                <div className="section-header-pro">
                                    <div>
                                        <h2 className="section-title">Próximos Jogos</h2>
                                        <p className="section-subtitle">{upcomingMatches.length} {upcomingMatches.length === 1 ? 'confronto agendado' : 'confrontos agendados'}</p>
                                    </div>
                                </div>
                                <div className="results-grid">
                                    {upcomingMatches.map(match => <MatchCard key={match.id} match={match} showScore={false} />)}
                                </div>
                            </div>
                        )}

                        {finishedMatches.length > 0 && (
                            <div className="fade-in-up">
                                <div className="section-header-pro">
                                    <div>
                                        <h2 className="section-title">Resultados Finais</h2>
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
                                <div className="empty-icon" aria-hidden="true">
                                    <svg className="anim-stadium" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 14v7"></path><path d="M20 14v7"></path><path d="M22 14v-4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4"></path><path d="M12 21v-7"></path><path d="M12 8V3"></path><path d="M10 5h4"></path><path d="M3 14h18"></path><path d="M2 21h20"></path>
                                    </svg>
                                </div>
                                <p>Nenhuma partida encontrada para os filtros selecionados.</p>
                                <button
                                    className="btn-text"
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
                                    <div className="group-card" key={groupName}>
                                        <div className="gc-radials" aria-hidden="true"></div>
                                        <div className="group-card-head">{groupName}</div>
                                        <table className="group-table">
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Pts</th>
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
                                                                <td>
                                                                    <div className="team-cell">
                                                                        <img
                                                                            src={getTeamLogo(teamName)}
                                                                            className="team-logo-small"
                                                                            alt=""
                                                                            loading="lazy"
                                                                            onError={(e) => { e.target.src = getFallbackLogo(teamName); }}
                                                                        />
                                                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                <span>{teamName}</span>
                                                                                {isTopAttack && <span className="stat-badge" title="Melhor Ataque">🚀</span>}
                                                                                {isTopDefense && <span className="stat-badge" title="Melhor Defesa">🛡️</span>}
                                                                            </div>
                                                                            <GamertagBadge fullName={team.fullName} style={{ transform: 'scale(0.8)', transformOrigin: 'left', marginTop: '2px' }} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td><span className="pts">{team.pts}</span></td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon" aria-hidden="true">
                                    <svg className="anim-chart" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="18" y="3" width="4" height="18" className="bar-3"></rect>
                                        <rect x="10" y="8" width="4" height="13" className="bar-2"></rect>
                                        <rect x="2" y="13" width="4" height="8" className="bar-1"></rect>
                                    </svg>
                                </div>
                                <p>Classificação ainda não disponível.</p>
                            </div>
                        )}
                    </div>
                )}

                </div>

            {showLiveAlert && (
                <div className="live-pro-toast">
                    <span className="pulse-dot" aria-hidden="true"></span>
                    <a href="https://twitch.tv/eujohnzinrp" target="_blank" rel="noopener noreferrer" className="live-pro-link">
                        Transmissão ao Vivo
                    </a>
                    <button className="live-pro-close" onClick={() => setShowLiveAlert(false)} aria-label="Fechar aviso de transmissão">×</button>
                </div>
            )}
        </React.Fragment>
    );
}

export default Home;
