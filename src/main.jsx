import React, { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import ReactDOM from 'react-dom/client';
import { supabaseClient } from './supabase.js';
import { calculateStandings, sortGroupTeams } from './helpers.js';
import Home from './components/Home';
import Login from './components/Login';
import SignUp from './components/SignUp';
import VerifyEmail from './components/VerifyEmail';
import Admin from './components/Admin';
import Profile from './components/Profile';
import PlayerDashboard from './components/PlayerDashboard';
import '../styles.css';

const MAINTENANCE_MODE = false;

function App() {
    const [page, setPage] = useState('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [userRegistration, setUserRegistration] = useState(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [hasBeenWelcomed, setHasBeenWelcomed] = useState(() => {
        return sessionStorage.getItem('gangster_cup_welcomed') === 'true';
    });
    const [tempEmail, setTempEmail] = useState('');
    const [roleUpdateNotify, setRoleUpdateNotify] = useState(null);
    const [banNotify, setBanNotify] = useState(false);
    const [isLogoAnimated, setIsLogoAnimated] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('gangster_cup_theme') || 'dark');
    const [registrations, setRegistrations] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFeaturedMatch, setShowFeaturedMatch] = useState(() => {
        return localStorage.getItem('gangster_cup_featured') !== 'false';
    });
    const [showLiveAlert, setShowLiveAlert] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [accessError, setAccessError] = useState(null);
    const [currentPublicIp, setCurrentPublicIp] = useState(null);
    const [logoutMessage, setLogoutMessage] = useState(null);
    const [resetMessage, setResetMessage] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [drawMessage, setDrawMessage] = useState(null);
    const [showDrawConfirm, setShowDrawConfirm] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Listener de Recuperação de Senha
        const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveringPassword(true);
                setPage('login');
            }
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (authListener) authListener.subscription.unsubscribe();
        };
    }, []);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (error) throw error;
            addToast('Senha atualizada com sucesso!', 'success');
            setIsRecoveringPassword(false);
            setPage('login');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gangster_cup_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        addToast(`Tema ${theme === 'dark' ? 'Claro' : 'Escuro'} ativado!`, 'info');
    };

    const toggleFeaturedMatch = () => {
        setShowFeaturedMatch(prev => {
            const newVal = !prev;
            localStorage.setItem('gangster_cup_featured', String(newVal));
            addToast(newVal ? 'Partida em Destaque ativada!' : 'Partida em Destaque desativada!', 'info');
            return newVal;
        });
    };

    const handleLogout = useCallback(async () => {
        try {
            const currentUser = userRef.current;
            setLogoutMessage({
                username: currentUser?.username || 'Competidor',
                role: currentUser?.role || 'player'
            });
            setIsMenuOpen(false);
            sessionStorage.removeItem('gangster_cup_welcomed');
            setHasBeenWelcomed(false);
            setUserRegistration(null);
            if (supabaseClient) await supabaseClient.auth.signOut();
            addToast('Sessão encerrada com sucesso.', 'success');
            setTimeout(() => {
                setPage('home');
                setLogoutMessage(null);
            }, 2500);
        } catch (err) {
            setPage('home');
        }
    }, [addToast]);

    const fetchData = useCallback(async (initial = false) => {
        if (!supabaseClient) return setLoading(false);
        if (initial) setLoading(true);

        const safetyTimeout = setTimeout(() => {
            if (initial) setLoading(false);
        }, 5000);

        try {
            const [regRes, matchRes] = await Promise.all([
                supabaseClient.from('registrations').select('*'),
                supabaseClient.from('matches').select('*')
            ]);

            setRegistrations(regRes.data || []);
            setResults(matchRes.data || []);
        } catch (err) {
            console.error('Falha crítica ao buscar dados:', err);
            addToast('Erro ao sincronizar dados com o servidor.', 'error');
        } finally {
            clearTimeout(safetyTimeout);
            if (initial) setLoading(false);
        }
    }, [addToast]);

    const fetchUserProfile = async (authUser, retryCount = 0) => {
        if (!supabaseClient || !authUser) return;

        try {
            const { data: userData } = await supabaseClient.auth.getUser();
            const activeUser = userData?.user || authUser;

            const metadata = activeUser.user_metadata;
            const userId = activeUser.id;
            const username = String(metadata?.playername || metadata?.playerName || activeUser.email?.split('@')[0] || 'Jogador').trim();

            const { data: dbProfile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            let activeProfile = dbProfile;

            if (!dbProfile && !profileError) {
                const { data: created, error: createError } = await supabaseClient
                    .from('profiles')
                    .upsert([{
                        id: userId,
                        username: username,
                        role: 'player',
                        is_banned: false
                    }], { onConflict: 'id' })
                    .select()
                    .maybeSingle();

                if (createError) throw createError;
                activeProfile = created;
                addToast('Perfil criado com sucesso!', 'success');
            }

            if (activeProfile) {
                setUser(activeProfile);
                if (activeProfile.is_banned) {
                    setBanNotify(true);
                    setTimeout(() => {
                        setBanNotify(false);
                        handleLogout();
                    }, 4000);
                    return;
                }
            } else {
                return;
            }

            if (!metadata?.teamname && !metadata?.teamName && retryCount < 2 && page !== 'login') {
                await new Promise(r => setTimeout(r, 1500));
                return fetchUserProfile(activeUser, retryCount + 1);
            }

            const validatedUsername = activeProfile.username;

            const { data: reg } = await supabaseClient
                .from('registrations')
                .select('*')
                .or(`playername.eq."${validatedUsername}",playername.eq."${activeUser.email}"`)
                .maybeSingle();

            if (reg) {
                setUserRegistration(reg);
            } else if (metadata?.teamname || metadata?.teamName) {
                const payload = {
                    playername: validatedUsername,
                    teamname: metadata.teamname || metadata.teamName,
                    platform: metadata.platform || 'PS5',
                    gamertag: metadata.gamertag || 'N/A'
                };

                const { data: newReg, error: regError } = await supabaseClient
                    .from('registrations')
                    .upsert([payload], { onConflict: 'playername' })
                    .select()
                    .maybeSingle();

                if (newReg) setUserRegistration(newReg);
                if (regError) console.error("Erro ao persistir inscrição:", regError.message);
            }
        } catch (error) {
            console.error("Erro no fetchUserProfile:", error);
        }
    };

    useEffect(() => {
        if (!supabaseClient) return;

        const checkSession = async () => {
            const { data: { session: initialSession } } = await supabaseClient.auth.getSession();
            setSession(initialSession);
            if (initialSession?.user) await fetchUserProfile(initialSession.user);
        };
        checkSession();

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, currentSession) => {
            setSession(currentSession);

            // Trata Recuperação de Senha
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveringPassword(true);
                setPage('login');
                addToast('Link de recuperação validado! Defina sua nova senha.', 'info');
            }

            if (currentSession?.user) {
                fetchUserProfile(currentSession.user);
                const alreadyWelcomed = sessionStorage.getItem('gangster_cup_welcomed') === 'true';
                if (event === 'SIGNED_IN' && !alreadyWelcomed) {
                    sessionStorage.setItem('gangster_cup_welcomed', 'true');
                    setShowWelcome(true);
                    setHasBeenWelcomed(true);
                    addToast(`Bem-vindo, ${currentSession.user.user_metadata?.playername || 'Competidor'}!`, 'success');
                    setTimeout(() => setShowWelcome(false), 2500);
                }
            } else {
                setUser(null);
                setUserRegistration(null);
                sessionStorage.removeItem('gangster_cup_welcomed');
                setHasBeenWelcomed(false);
            }
        });

        return () => subscription?.unsubscribe();
    }, [addToast]);

    useEffect(() => {
        if (session && (page === 'signup' || page === 'verify' || page === 'login')) {
            setPage('admin');
        } else if (!session && page === 'admin') {
            setPage('home');
        }
    }, [session, page]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        if (!supabaseClient) return;

        const channel = supabaseClient
            .channel('tournament-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
                fetchData();
                if (payload.eventType === 'UPDATE') {
                    addToast('Um placar foi atualizado em tempo real!', 'info');
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchData())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                if (userRef.current && payload.new.id === userRef.current.id) {
                    if (payload.new.role !== userRef.current.role && !payload.new.is_banned) {
                        const roleNames = { player: 'Jogador', moderador: 'Moderador', admin: 'Administrador', developer: 'Desenvolvedor' };
                        const newRole = roleNames[payload.new.role] || payload.new.role;
                        setRoleUpdateNotify(newRole);
                        addToast(`Seu cargo mudou para: ${newRole}`, 'info');

                        setTimeout(() => {
                            setRoleUpdateNotify(null);
                            handleLogout();
                        }, 3500);
                    }
                    if (payload.new.is_banned && !userRef.current.is_banned) {
                        setBanNotify(true);
                        addToast('Sua conta foi banida.', 'error');
                        setTimeout(() => {
                            setBanNotify(false);
                            handleLogout();
                        }, 4500);
                    }
                }
                fetchData();
            })
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [fetchData, handleLogout, addToast]);

    useEffect(() => {
        if (user) fetchData(false);
    }, [user, fetchData]);

    const updateResult = async (id, field, value) => {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('matches')
            .update({ [field]: (field.startsWith('score') ? parseInt(value) || 0 : value) })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Erro ao atualizar resultado:', error);
            addToast('Erro ao salvar placar.', 'error');
        } else if (data && data.length > 0) {
            setResults(results.map(r => r.id === id ? data[0] : r));
            addToast('Placar atualizado com sucesso!', 'success');
        }
    };

    const addRegistration = async (data) => {
        if (!supabaseClient) return false;
        const payload = {
            playername: (data.playername || data.playerName || '').trim(),
            teamname: data.teamname || data.teamName,
            platform: data.platform,
            gamertag: (data.gamertag || '').trim()
        };

        const { data: newRegistration, error } = await supabaseClient
            .from('registrations')
            .insert([payload])
            .select();

        if (error) {
            addToast(`Erro na inscrição: ${error.message}`, 'error');
        } else if (newRegistration && newRegistration.length > 0) {
            setRegistrations([...registrations, newRegistration[0]]);
            addToast('Inscrição realizada com sucesso!', 'success');
            return true;
        }
        return false;
    };

    const executeGroupDraw = async () => {
        setShowDrawConfirm(false);
        if (!supabaseClient) return;
        setLoading(true);

        await supabaseClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        const shuffled = [...registrations].sort(() => 0.5 - Math.random());
        const newMatches = [];
        const defaultMatchDate = new Date().toISOString().split('T')[0];
        const defaultMatchTime = "19:00";
        const GROUP_SIZE = 4;

        const numGroups = Math.ceil(shuffled.length / GROUP_SIZE);
        const groups = Array.from({ length: numGroups }, () => []);

        shuffled.forEach((reg, i) => {
            groups[i % numGroups].push(reg);
        });

        groups.forEach((groupTeams, i) => {
            const groupName = `Grupo ${String.fromCharCode(65 + i)}`;
            for (let j = 0; j < groupTeams.length; j++) {
                for (let k = j + 1; k < groupTeams.length; k++) {
                    const p1Data = `${groupTeams[j].teamname} (${groupTeams[j].gamertag} - ${groupTeams[j].platform.toLowerCase()})`;
                    const p2Data = `${groupTeams[k].teamname} (${groupTeams[k].gamertag} - ${groupTeams[k].platform.toLowerCase()})`;

                    newMatches.push({
                        p1: p1Data, p2: p2Data, score1: 0, score2: 0,
                        status: 'Agendado', group_name: groupName,
                        date: defaultMatchDate, time: defaultMatchTime,
                        stage: 'Fase de Grupos (Ida)'
                    });

                    newMatches.push({
                        p1: p2Data, p2: p1Data, score1: 0, score2: 0,
                        status: 'Agendado', group_name: groupName,
                        date: defaultMatchDate, time: defaultMatchTime,
                        stage: 'Fase de Grupos (Volta)'
                    });
                }
            }
        });

        if (newMatches.length > 0) {
            const { data, error } = await supabaseClient.from('matches').insert(newMatches).select();
            if (error) {
                addToast('Erro ao realizar sorteio.', 'error');
            } else {
                setResults(data);
                addToast('Fase de Grupos gerada com sucesso!', 'success');
            }
        }
        setLoading(false);
    };

    const executeKnockoutDraw = async () => {
        if (!supabaseClient) return;
        setLoading(true);
        const stagesPresent = [...new Set(results.map(m => m.stage.split(' (')[0]))];
        const order = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Final"];
        let nextStage = "";
        let participants = [];

        const hasKnockout = stagesPresent.some(s => order.includes(s));

        if (!hasKnockout) {
            const standings = calculateStandings(results);
            const sortedGroups = Object.keys(standings).sort();
            sortedGroups.forEach(groupName => {
                const sortedTeams = sortGroupTeams(Object.values(standings[groupName]), results);
                if (sortedTeams.length >= 1) participants.push(sortedTeams[0].fullName);
                if (sortedTeams.length >= 2) participants.push(sortedTeams[1].fullName);
            });

            if (participants.length >= 16) nextStage = "Oitavas de Final";
            else if (participants.length >= 8) nextStage = "Quartas de Final";
            else if (participants.length >= 4) nextStage = "Semifinal";
            else if (participants.length === 2) nextStage = "Final";
            else {
                addToast("Número de participantes insuficiente para o mata-mata.", 'error');
                setLoading(false);
                return;
            }
        } else {
            const currentStage = order.reduce((last, s) => stagesPresent.includes(s) ? s : last, "");
            const nextIndex = order.indexOf(currentStage) + 1;

            if (nextIndex >= order.length) {
                addToast("O campeonato já terminou!", 'info');
                setLoading(false);
                return;
            }
            nextStage = order[nextIndex];

            const currentStageMatches = results.filter(m => m.stage.startsWith(currentStage));
            const pairings = {};
            currentStageMatches.forEach(m => {
                const teams = [m.p1, m.p2].sort().join(' vs ');
                if (!pairings[teams]) pairings[teams] = { p1: m.p1, p2: m.p2, s1: 0, s2: 0 };
                if (m.p1 === pairings[teams].p1) {
                    pairings[teams].s1 += Number(m.score1) || 0;
                    pairings[teams].s2 += Number(m.score2) || 0;
                } else {
                    pairings[teams].s1 += Number(m.score2) || 0;
                    pairings[teams].s2 += Number(m.score1) || 0;
                }
            });
            Object.values(pairings).forEach(p => participants.push(p.s1 >= p.s2 ? p.p1 : p.p2));
        }

        const newMatches = [];
        const defaultMatchDate = new Date().toISOString().split('T')[0];
        const defaultMatchTime = "21:00";
        const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());

        for (let i = 0; i < shuffledParticipants.length; i += 2) {
            const p1 = shuffledParticipants[i];
            const p2 = shuffledParticipants[i + 1];
            if (!p2) break;
            const baseMatch = { score1: 0, score2: 0, status: 'Agendado', group_name: '', date: defaultMatchDate, time: defaultMatchTime };
            if (nextStage === "Final") {
                newMatches.push({ ...baseMatch, p1, p2, stage: nextStage });
            } else {
                newMatches.push({ ...baseMatch, p1, p2, stage: `${nextStage} (Ida)` });
                newMatches.push({ ...baseMatch, p1: p2, p2: p1, stage: `${nextStage} (Volta)` });
            }
        }

        if (newMatches.length > 0) {
            const { data, error } = await supabaseClient.from('matches').insert(newMatches).select();
            if (error) addToast(error.message, 'error');
            else {
                setResults([...results, ...data]);
                addToast(`${nextStage} gerada com sucesso!`, 'success');
            }
        }
        setLoading(false);
    };

    const deleteMatch = async (id) => {
        if (!supabaseClient || !window.confirm("Apagar partida?")) return;
        const { error } = await supabaseClient.from('matches').delete().eq('id', id);
        if (!error) {
            setResults(results.filter(m => m.id !== id));
            addToast('Partida removida.', 'info');
        }
    };

    const executeReset = async () => {
        setShowResetConfirm(false);
        const { error } = await supabaseClient.from('matches').delete().not('id', 'is', null);
        if (!error) {
            setResults([]);
            addToast('Campeonato resetado com sucesso.', 'info');
        }
    };

    const navigate = (p) => {
        setPage(p);
        setIsMenuOpen(false);
    };

    const handleLogoClick = () => {
        setIsLogoAnimated(true);
        setTimeout(() => setIsLogoAnimated(false), 500);
        navigate('home');
    };

    const SkeletonLoader = () => (
        <div className="container section">
            <div className="skeleton skeleton-card" style={{ height: '300px', marginBottom: '60px' }}></div>
            <div className="grid">
                {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card"></div>)}
            </div>
        </div>
    );

    return (
        <div className="app-wrapper">
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <div className="toast-icon">
                            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
                        </div>
                        <div className="toast-content">{t.message}</div>
                    </div>
                ))}
            </div>

            {accessError && (
                <div className="success-overlay" onClick={() => setAccessError(null)}>
                    <div className="success-modal" style={{ borderColor: '#ff4444' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '5rem' }}>🚫</div>
                        <h2 style={{ color: '#ff4444' }}>Acesso Bloqueado</h2>
                        <p>{accessError}</p>
                        <button className="btn-primary" style={{ background: '#ff4444', color: '#ffffff' }} onClick={() => setAccessError(null)}>Voltar</button>
                    </div>
                </div>
            )}

            {MAINTENANCE_MODE && user?.role !== 'admin' && page !== 'login' ? (
                <div className="maintenance-wrapper">
                    <div className="maintenance-card">
                        <div className="maintenance-icon-wrapper">
                            <span>🛠️</span>
                        </div>
                        <div className="maintenance-status-bar">
                            <div className="maintenance-status-dot"></div>
                            Manutenção em Andamento
                        </div>
                        <h1>Site em <span>Manutenção</span></h1>
                        <p className="maintenance-subtitle">
                            Estamos realizando melhorias para garantir a melhor experiência no campeonato. Voltaremos em breve!
                        </p>
                        <div className="maintenance-divider"></div>
                        <div className="maintenance-footer">
                            <img src="/logo.png" alt="Logo" />
                            <span>Gangster Cup © 2026</span>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {showLiveAlert && (
                        <div className="live-alert-overlay" onClick={() => setShowLiveAlert(false)}>
                            <div className="live-alert-card" onClick={e => e.stopPropagation()}>
                                <button className="close-alert" onClick={() => setShowLiveAlert(false)}>×</button>
                                <div className="live-badge">AO VIVO</div>
                                <h3>Transmissões da Gangster Cup</h3>
                                <p>Acompanhe na Twitch!</p>
                                <div style={{ marginTop: '20px' }}>
                                    <a href="https://twitch.tv/eujohnzinrp" target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={() => setShowLiveAlert(false)}>Assistir Agora</a>
                                </div>
                            </div>
                        </div>
                    )}

                    {isRecoveringPassword && (
                        <div className="success-overlay" style={{ zIndex: 9000 }}>
                            <div className="success-modal" style={{ maxWidth: '400px' }}>
                                <div style={{ fontSize: '4rem' }}>🔐</div>
                                <h2>Definir Nova Senha</h2>
                                <p>Digite sua nova senha de acesso abaixo:</p>
                                <form onSubmit={handleUpdatePassword} style={{ marginTop: '20px', padding: 0, background: 'none', boxShadow: 'none' }}>
                                    <div className="form-group">
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Nova Senha (mín. 6 caracteres)"
                                            required
                                            minLength="6"
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>Atualizar Senha</button>
                                </form>
                            </div>
                        </div>
                    )}

                    <header className="header-nav">
                        <nav className="container nav-content">
                            <div className={`logo ${isLogoAnimated ? 'logo-click-animation' : ''}`} onClick={handleLogoClick}>
                                <img src="/logo.png" alt="Logo" className="nav-logo" />
                                <span className="logo-prefix">EA FC 26</span> <span className="logo-main">GANGSTER CUP</span>
                            </div>

                            <div className="nav-right-group">
                                <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                                    {/* Botão de Tema visível apenas no Mobile dentro do menu */}
                                    <li className="mobile-only" style={{ marginBottom: '20px' }}>
                                        <button className="theme-toggle-btn" onClick={toggleTheme} style={{ width: '100%', justifyContent: 'center', gap: '10px' }}>
                                            {theme === 'dark' ? (
                                                <Fragment>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                    <span>Modo Claro</span>
                                                </Fragment>
                                            ) : (
                                                <Fragment>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px' }}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                    </svg>
                                                    <span>Modo Escuro</span>
                                                </Fragment>
                                            )}
                                        </button>
                                    </li>
                                    <li><a href="#" onClick={() => navigate('home')}>Início</a></li>
                                    {user && !user.is_banned && (
                                        <Fragment>
                                            <li><a href="#" onClick={() => navigate('admin')}>
                                                {user.role === 'developer' ? 'Dev' : user.role === 'admin' ? 'Painel Admin' : user.role === 'moderador' ? 'Painel Mod' : 'Painel do Usuário'}
                                            </a></li>
                                            <li><a href="#" onClick={() => navigate('profile')}>Perfil</a></li>
                                        </Fragment>
                                    )}
                                    {!user ? (
                                        <>
                                            <li><a href="#" onClick={() => navigate('signup')}>Inscreva-se</a></li>
                                            <li><button className="btn-primary" onClick={() => navigate('login')}>Entrar</button></li>
                                        </>
                                    ) : (
                                        <li><button className="btn-primary" onClick={handleLogout}>Sair</button></li>
                                    )}
                                </ul>

                                <div className="nav-controls">
                                    {/* Botão de Tema visível apenas no Desktop no cabeçalho */}
                                    <button className="theme-toggle-btn desktop-only" onClick={toggleTheme} aria-label="Alternar Tema">
                                        {theme === 'dark' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                            </svg>
                                        )}
                                    </button>

                                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                                    </button>
                                </div>
                            </div>
                        </nav>
                    </header>

                    {roleUpdateNotify && (
                        <div className="success-overlay" style={{ zIndex: 3000 }}>
                            <div className="success-modal">
                                <h2>Acesso Mudou!</h2>
                                <p>Cargo: <strong>{roleUpdateNotify}</strong></p>
                            </div>
                        </div>
                    )}

                    {banNotify && (
                        <div className="success-overlay" style={{ zIndex: 4000 }}>
                            <div className="success-modal" style={{ borderColor: '#ff4444' }}>
                                <h2 style={{ color: '#ff4444' }}>CONTA BANIDA</h2>
                            </div>
                        </div>
                    )}

                    {logoutMessage && (
                        <div className="success-overlay">
                            <div className={`success-modal welcome-modal role-${logoutMessage.role || 'player'}`}>
                                <div className="welcome-icon">
                                    {logoutMessage.role === 'admin' || logoutMessage.role === 'developer' ? '👑' : logoutMessage.role === 'moderador' ? '🛡️' : '⚽'}
                                </div>
                                <h2>Até logo, {logoutMessage.username}!</h2>
                                <p className="welcome-role">Sessão encerrada com segurança.</p>
                            </div>
                        </div>
                    )}

                    {showResetConfirm && (
                        <div className="success-overlay">
                            <div className="success-modal">
                                <h2>Resetar Campeonato?</h2>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                                    <button className="btn-primary" onClick={executeReset}>Sim</button>
                                    <button className="btn-primary" style={{ background: '#444' }} onClick={() => setShowResetConfirm(false)}>Não</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showDrawConfirm && (
                        <div className="success-overlay">
                            <div className="success-modal">
                                <h2>Novo Sorteio?</h2>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                                    <button className="btn-primary" onClick={executeGroupDraw}>Sim</button>
                                    <button className="btn-primary" style={{ background: '#444' }} onClick={() => setShowDrawConfirm(false)}>Não</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <section className="page-content">
                        {loading ? (
                            <SkeletonLoader />
                        ) : (
                            <div className="fade-in">
                                {page === 'home' && <Home results={results} loading={loading} onRegisterClick={() => setPage('signup')} showFeaturedMatch={showFeaturedMatch} />}
                                {page === 'login' && <Login />}
                                {page === 'signup' && <SignUp onStepVerify={(email) => { setTempEmail(email); setPage('verify'); }} />}
                                {page === 'verify' && tempEmail && <VerifyEmail email={tempEmail} onVerified={() => setPage('admin')} />}
                                {page === 'profile' && <Profile user={session?.user} userRegistration={userRegistration} onUpdate={async () => { await fetchData(); if (session?.user) await fetchUserProfile(session.user); }} />}
                                {page === 'admin' && (
                                    (!user || showWelcome) ? (
                                        <div className="success-overlay">
                                            <div className={`success-modal welcome-modal role-${user?.role || 'player'}`}>
                                                {user ? (
                                                    <Fragment>
                                                        <div className="welcome-icon">
                                                            {user.role === 'admin' || user.role === 'developer' ? '👑' : user.role === 'moderador' ? '🛡️' : '⚽'}
                                                        </div>
                                                        <h2>Bem-vindo, {user.username}!</h2>
                                                        <p className="welcome-role">Acesso: <strong>{
                                                            user.role === 'developer' ? 'Desenvolvedor' :
                                                                user.role === 'admin' ? 'Administrador' :
                                                                    user.role === 'moderador' ? 'Moderador' : 'Competidor'
                                                        }</strong></p>
                                                    </Fragment>
                                                ) : <h2>Carregando perfil...</h2>}
                                            </div>
                                        </div>
                                    ) : (
                                        user.role === 'admin' || user.role === 'developer' || user.role === 'moderador' ? (
                                            <Admin results={results} registrations={registrations} updateResult={updateResult} onDraw={() => setShowDrawConfirm(true)} onKnockoutDraw={executeKnockoutDraw} onDeleteMatch={deleteMatch} onDeleteAll={() => setShowResetConfirm(true)} user={user} fetchData={fetchData} showFeaturedMatch={showFeaturedMatch} onToggleFeatured={toggleFeaturedMatch} />
                                        ) : (
                                            <PlayerDashboard user={user} userRegistration={userRegistration} results={results} />
                                        )
                                    )
                                )}
                            </div>
                        )}
                    </section>
                </>
            )}
            <footer className="footer-nav">
                <div className="container">
                    <div className="social-links">
                        <a href="https://discord.gg/neQt9DdJVT" className="discord" target="_blank" rel="noopener noreferrer">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2758-3.68-.2758-5.4876 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                            </svg>
                            Discord
                        </a>
                        <a href="https://twitch.tv/eujohnzinrp" className="twitch" target="_blank" rel="noopener noreferrer">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                            </svg>
                            Twitch
                        </a>
                    </div>
                    <p style={{ marginTop: '20px' }}>&copy; 2026 Gangster Cup.</p>
                </div>
            </footer>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
