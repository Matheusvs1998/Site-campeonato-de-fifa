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

const MAINTENANCE_MODE = false; // Mude para true para ATIVAR; false para DESATIVAR

function App() {
    const [page, setPage] = useState('home'); // home, login, signup, verify, admin, register
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [userRegistration, setUserRegistration] = useState(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [hasBeenWelcomed, setHasBeenWelcomed] = useState(() => {
        return sessionStorage.getItem('gangster_cup_welcomed') === 'true';
    });
    const [tempEmail, setTempEmail] = useState(''); // Armazena email para verificação
    const [roleUpdateNotify, setRoleUpdateNotify] = useState(null); // Notificação de mudança de cargo para o próprio usuário
    const [banNotify, setBanNotify] = useState(false); // Notificação de banimento

    // Monitora o estado da sessão do Supabase
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
            if (currentSession?.user) {
                // REMOVIDO AWAIT: Deixa o perfil sincronizar em background para não travar a UI
                fetchUserProfile(currentSession.user);
                
                // Verifica no sessionStorage para persistir mesmo com refresh da página
                const alreadyWelcomed = sessionStorage.getItem('gangster_cup_welcomed') === 'true';
                if (event === 'SIGNED_IN' && !alreadyWelcomed) {
                    sessionStorage.setItem('gangster_cup_welcomed', 'true');
                    setShowWelcome(true);
                    setHasBeenWelcomed(true);
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
    }, []);

    // Effect para gerenciar a navegação automática baseada no estado da sessão
    useEffect(() => {
        // Removido 'home' da lista: permite que o usuário logado acesse a tela inicial sem logoff
        if (session && (page === 'signup' || page === 'verify' || page === 'login')) {
            setPage('admin');
        } else if (!session && page === 'admin') { 
            setPage('home');
        }
    }, [session, page]);

    const fetchUserProfile = async (authUser, retryCount = 0) => {
        if (!supabaseClient || !authUser) return;

        try {
            // 0. Tenta obter dados frescos, mas usa o authUser atual como base para não travar a UI
            const { data: userData } = await supabaseClient.auth.getUser();
            const activeUser = userData?.user || authUser;

            const metadata = activeUser.user_metadata;
            const userId = activeUser.id;
            const username = String(metadata?.playername || metadata?.playerName || activeUser.email?.split('@')[0] || 'Jogador').trim();

            // 1. Busca o perfil no banco PRIMEIRO para garantir o cargo correto (Dev/Admin) sem flickering visual
            const { data: dbProfile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (dbProfile) {
                setUser(dbProfile);
                // Verifica banimento imediatamente
                if (dbProfile.is_banned) {
                    setBanNotify(true);
                    setTimeout(() => {
                        setBanNotify(false);
                        handleLogout();
                    }, 4000);
                    return;
                }
            } else if (!profileError) {
                // Caso não exista no banco (primeiro login), cria o perfil com cargo padrão 'player'
                const currentLocalProfile = {
                    id: userId,
                    username: username,
                    role: 'player',
                    is_banned: false
                };
                const { data: created } = await supabaseClient
                    .from('profiles')
                    .upsert([currentLocalProfile], { onConflict: 'id' })
                    .select()
                    .maybeSingle();
                setUser(created || currentLocalProfile);
            }

            // 2. Se não temos metadados de time (comum logo após confirmação), tenta re-sincronizar uma vez
            if (!metadata?.teamname && !metadata?.teamName && retryCount < 2 && page !== 'login') {
                await new Promise(r => setTimeout(r, 1500));
                return fetchUserProfile(activeUser, retryCount + 1);
            }

            // 3. Sincroniza a inscrição do campeonato
            const { data: reg } = await supabaseClient
                .from('registrations')
                .select('*')
                .or(`playername.eq."${username}",playername.eq."${authUser.email}"`) // Busca flexível
                .maybeSingle();

            if (reg) {
                setUserRegistration(reg);
            } else if (metadata?.teamname || metadata?.teamName) {
                // Se não há registro no banco, mas temos os dados no Auth, forçamos a criação
                console.log("Criando registro do campeonato para:", username);
                
                const payload = {
                    playername: username,
                    teamname: metadata.teamname || metadata.teamName,
                    platform: metadata.platform || 'PS5',
                    gamertag: metadata.gamertag || 'N/A'
                };

                const { data: newReg, error: regError } = await supabaseClient
                    .from('registrations')
                    .upsert([payload], { onConflict: 'playername' })
                    .select()
                    .maybeSingle();

                if (newReg) {
                    setUserRegistration(newReg);
                }
                if (regError) {
                    console.error("Erro ao persistir inscrição:", regError.message);
                }
            }
        } catch (error) {
            console.error("Erro no fetchUserProfile:", error);
        }
    };

    const [isLogoAnimated, setIsLogoAnimated] = useState(false);
    const [registrations, setRegistrations] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLiveAlert, setShowLiveAlert] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [accessError, setAccessError] = useState(null);
    const [currentPublicIp, setCurrentPublicIp] = useState(null); // Novo estado para armazenar o IP público
    const [logoutMessage, setLogoutMessage] = useState(null); // Estado para mensagem de despedida
    const [resetMessage, setResetMessage] = useState(null); // Estado para mensagem de reset
    const [showResetConfirm, setShowResetConfirm] = useState(false); // Estado para o modal de confirmação
    const [drawMessage, setDrawMessage] = useState(null); // Estado para mensagem de sorteio realizado
    const [showDrawConfirm, setShowDrawConfirm] = useState(false); // Estado para o modal de confirmação do sorteio

    // Ref para rastrear o usuário atual dentro de callbacks de eventos (Realtime)
    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const handleLogout = useCallback(async () => {
        try {
            setLogoutMessage(`Até logo!`);
            setIsMenuOpen(false);
            sessionStorage.removeItem('gangster_cup_welcomed');
            setHasBeenWelcomed(false);
            setUserRegistration(null);
            if (supabaseClient) await supabaseClient.auth.signOut();
            setTimeout(() => {
                setPage('home');
                setLogoutMessage(null);
            }, 2000);
        } catch (err) {
            setPage('home');
        }
    }, [supabaseClient]);

    // Função de busca de dados movida para o escopo do componente para ser visível em todo o App
    const fetchData = useCallback(async (initial = false) => {
        if (!supabaseClient) return setLoading(false);
        if (initial) setLoading(true);

        // Segurança: Força o fim do carregamento após 5 segundos para não travar o site
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
        } finally {
            clearTimeout(safetyTimeout);
            if (initial) setLoading(false);
        }
    }, [supabaseClient]);

    // Efeito para buscar o IP público uma vez ao carregar o componente
    useEffect(() => {
        const fetchPublicIp = async () => {
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const { ip } = await ipResponse.json();
                setCurrentPublicIp(ip);
            } catch (e) { /* Ignorar erro, será tratado na verificação */ }
        };
        fetchPublicIp();
    }, []); // Array de dependências vazio para rodar apenas uma vez

    // 1. Carregamento inicial de dados - Executado apenas UMA vez ao montar o componente
    useEffect(() => {
        fetchData(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // 2. Inscrição em canais Realtime e monitoramento de mudanças de cargo
    useEffect(() => {
        if (!supabaseClient) return;

        const channel = supabaseClient
            .channel('tournament-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchData())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                if (userRef.current && payload.new.id === userRef.current.id) {
                    // Detecta mudança de cargo
                    if (payload.new.role !== userRef.current.role && !payload.new.is_banned) {
                        const roleNames = { player: 'Jogador', moderador: 'Moderador', admin: 'Administrador', developer: 'Desenvolvedor' };
                        setRoleUpdateNotify(roleNames[payload.new.role] || payload.new.role);
                        
                        setTimeout(() => {
                            setRoleUpdateNotify(null);
                            handleLogout();
                        }, 3500);
                    }
                    // Detecta banimento em tempo real
                    if (payload.new.is_banned && !userRef.current.is_banned) {
                        setBanNotify(true);
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
    }, [fetchData, handleLogout]);

    // 3. Atualiza os dados silenciosamente quando o usuário logar (sem mostrar tela de carregamento)
    useEffect(() => {
        if (user) fetchData(false);
    }, [user, fetchData]);

    const updateResult = async (id, field, value) => {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('matches')
            // Converte para número se for um campo de placar (score1 ou score2)
            .update({ [field]: (field.startsWith('score') ? parseInt(value) || 0 : value) })
            .eq('id', id)
            .select(); // Adicionado .select() para retornar o item atualizado

        if (error) {
            console.error('Erro ao atualizar resultado:', error);
        } else if (data && data.length > 0) {
            setResults(results.map(r => r.id === id ? data[0] : r));
        }
    };
    const addRegistration = async (data) => {
        if (!supabaseClient) return false;
        console.log('Tentando registrar:', data);
        
        // Limpa os dados para evitar conflitos de colunas inexistentes vindas do spread (...)
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
            console.error('Erro detalhado do Supabase:', error.message, error.details, error.hint);
            alert(`Erro ao realizar inscrição: ${error.message}`);
        } else if (newRegistration && newRegistration.length > 0) {
            setRegistrations([...registrations, newRegistration[0]]);
            return true; // Indica sucesso
        }
        return false; // Indica falha
    };
    const drawMatches = () => {
        if (registrations.length < 2) {
            alert("É necessário pelo menos 2 inscritos para realizar o sorteio!");
            return;
        }
        if (!supabaseClient) return;
        setShowDrawConfirm(true);
    };
    // Sorteio inicial apenas da Fase de Grupos
    const executeGroupDraw = async () => {
        setShowDrawConfirm(false);
        if (!supabaseClient) return;

        // Limpar partidas antigas antes de gerar o novo sorteio
        // Usando neq com um ID impossível para permitir o delete sem filtro específico
        const { error: deleteError } = await supabaseClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteError) {
            console.error('Erro ao limpar partidas:', deleteError);
            alert(`Erro ao limpar partidas: ${deleteError.message}`);
            return;
        }

        const shuffled = [...registrations].sort(() => 0.5 - Math.random());
        const newMatches = [];
        const defaultMatchDate = new Date().toISOString().split('T')[0];
        const defaultMatchTime = "19:00";
        const GROUP_SIZE = 4;

        // --- FASE DE GRUPOS ---
        const numGroups = Math.ceil(shuffled.length / GROUP_SIZE);
        const groups = Array.from({ length: numGroups }, () => []);

        // Distribui jogadores nos grupos
        shuffled.forEach((reg, i) => {
            groups[i % numGroups].push(reg);
        });

        groups.forEach((groupTeams, i) => {
            const groupName = `Grupo ${String.fromCharCode(65 + i)}`; // Grupo A, B, C...
            
            // Todos contra todos dentro do grupo (Ida e Volta)
            for (let j = 0; j < groupTeams.length; j++) {
                for (let k = j + 1; k < groupTeams.length; k++) {
                    const p1Data = `${groupTeams[j].teamname} (${groupTeams[j].gamertag} - ${groupTeams[j].platform.toLowerCase()})`;
                    const p2Data = `${groupTeams[k].teamname} (${groupTeams[k].gamertag} - ${groupTeams[k].platform.toLowerCase()})`;

                    // Jogo de Ida
                    newMatches.push({
                        p1: p1Data,
                        p2: p2Data,
                        score1: 0,
                        score2: 0,
                        status: 'Agendado',
                        group_name: groupName,
                        date: defaultMatchDate, // Adicionar data padrão
                        time: defaultMatchTime, // Adicionar hora padrão
                        stage: 'Fase de Grupos (Ida)'
                    });

                    // Jogo de Volta
                    newMatches.push({
                        p1: p2Data,
                        p2: p1Data,
                        score1: 0,
                        score2: 0,
                        status: 'Agendado',
                        group_name: groupName,
                        date: defaultMatchDate,
                        time: defaultMatchTime,
                        stage: 'Fase de Grupos (Volta)'
                    });
                }
            }
        });

        if (newMatches.length > 0) {
            const { data, error } = await supabaseClient
                .from('matches')
                .insert(newMatches)
                .select();

            if (error) {
                console.error('Erro ao sortear partidas:', error);
                alert('Erro ao realizar sorteio: ' + (error.message || 'Verifique se as colunas "date" e "time" foram criadas no Supabase.'));
            } else {
                setResults(data); // Atualiza com as partidas inseridas (com IDs do Supabase)
                setDrawMessage("Fase de Grupos gerada com sucesso!");
                setTimeout(() => setDrawMessage(null), 2500);
            }
        }
    };
    // Gera a próxima fase do mata-mata baseado nos resultados anteriores
    const executeKnockoutDraw = async () => {
        if (!supabaseClient) return;
        
        // 1. Identificar todas as fases existentes (normalizadas)
        const stagesPresent = [...new Set(results.map(m => m.stage.split(' (')[0]))];
        const order = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Final"];
        
        let nextStage = "";
        let participants = [];

        // 2. Lógica de transição: Fase de Grupos -> Primeiro Mata-Mata
        const hasKnockout = stagesPresent.some(s => order.includes(s));

        if (!hasKnockout) {
            const standings = calculateStandings(results);
            const groups = Object.keys(standings).sort();
            groups.forEach(groupName => {
                const sortedTeams = sortGroupTeams(Object.values(standings[groupName]), results);
                if (sortedTeams.length >= 1) participants.push(sortedTeams[0].fullName);
                if (sortedTeams.length >= 2) participants.push(sortedTeams[1].fullName);
            });

            if (participants.length >= 16) nextStage = "Oitavas de Final";
            else if (participants.length >= 8) nextStage = "Quartas de Final";
            else if (participants.length >= 4) nextStage = "Semifinal";
            else if (participants.length === 2) nextStage = "Final";
            else {
                alert("Número de participantes insuficiente para gerar mata-mata.");
                return;
            }
        } else {
            // 3. Lógica de transição entre fases de mata-mata
            const currentStage = order.reduce((last, s) => stagesPresent.includes(s) ? s : last, "");
            const nextIndex = order.indexOf(currentStage) + 1;

            if (nextIndex >= order.length || !order[nextIndex]) {
                alert("O campeonato já chegou ao fim!");
                return;
            }
            nextStage = order[nextIndex];

            // Evitar duplicar a próxima fase se ela já existir no banco
            if (stagesPresent.includes(nextStage)) {
                alert(`A fase ${nextStage} já foi gerada!`);
                return;
            }

            // Pegar os vencedores da fase atual por placar agregado
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

            Object.values(pairings).forEach(p => {
                participants.push(p.s1 >= p.s2 ? p.p1 : p.p2);
            });
        }

        // 4. Criação das partidas
        if (participants.length < 2) {
            alert("Não há times suficientes para a próxima fase!");
            return;
        }

        const newMatches = [];
        const defaultMatchDate = new Date().toISOString().split('T')[0];
        const defaultMatchTime = "21:00";
        const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());

        for (let i = 0; i < shuffledParticipants.length; i += 2) {
            const p1 = shuffledParticipants[i];
            const p2 = shuffledParticipants[i + 1];
            if (!p2) break; // Garante pares

            const baseMatch = { score1: 0, score2: 0, status: 'Agendado', group_name: '', date: defaultMatchDate, time: defaultMatchTime };

            if (nextStage === "Final") {
                // JOGO ÚNICO NA FINAL
                newMatches.push({ ...baseMatch, p1, p2, stage: nextStage });
            } else {
                // IDA E VOLTA NAS DEMAIS FASES
                newMatches.push({ ...baseMatch, p1, p2, stage: `${nextStage} (Ida)` });
                newMatches.push({ ...baseMatch, p1: p2, p2: p1, stage: `${nextStage} (Volta)` });
            }
        }

        if (newMatches.length > 0) {
            const { data, error } = await supabaseClient.from('matches').insert(newMatches).select();
            if (error) {
                alert('Erro ao gerar fase: ' + error.message);
            } else {
                setResults([...results, ...data]);
                setDrawMessage(`${nextStage} gerada com sucesso!`);
                setTimeout(() => {
                    setDrawMessage(null);
                }, 3000);
            }
        } else {
            alert("Não foi possível gerar partidas suficientes para o sorteio.");
        }
    };
    const deleteMatch = async (id) => {
        if (!supabaseClient || !window.confirm("Deseja realmente apagar esta partida?")) return;
        
        const { error } = await supabaseClient.from('matches').delete().eq('id', id);
        if (error) {
            console.error('Erro ao deletar partida:', error);
            alert(`Erro ao deletar partida: ${error.message}`);
        } else {
            setResults(results.filter(match => match.id !== id));
        }
    };
    const deleteAllMatches = () => {
        if (!supabaseClient) return;
        setShowResetConfirm(true);
    };
    const executeReset = async () => {
        setShowResetConfirm(false);
        const { error } = await supabaseClient.from('matches').delete().not('id', 'is', null);
        if (error) {
            console.error('Erro ao resetar campeonato:', error);
            alert(`Erro ao resetar campeonato: ${error.message}`);
        } else {
            setResults([]);
            // Ativa a animação visual no meio da tela
            setResetMessage("O campeonato foi limpo e está pronto para um novo sorteio.");
            setTimeout(() => {
                setResetMessage(null);
            }, 3000); // Fecha automaticamente após 3 segundos
        }
    };
    const navigate = (p) => {
        setPage(p);
        setIsMenuOpen(false);
    };
    const handleLogoClick = () => {
        setIsLogoAnimated(true);
        setTimeout(() => setIsLogoAnimated(false), 500); // Remove a classe após a animação terminar
        navigate('home');
    };

    return (
        <div className="app-wrapper">
            {accessError && (
                <div className="success-overlay" onClick={() => setAccessError(null)}>
                    <div className="success-modal" style={{borderColor: '#ff4444', boxShadow: '0 0 30px rgba(255, 68, 68, 0.3)'}} onClick={e => e.stopPropagation()}>
                        <div style={{fontSize: '5rem'}}>🚫</div>
                        <h2 style={{color: '#ff4444'}}>Acesso Bloqueado</h2>
                        <p>{accessError}</p>
                        <button className="btn-primary" style={{background: '#ff4444', color: 'white', marginTop: '20px'}} onClick={() => setAccessError(null)}>
                            Voltar
                        </button>
                    </div>
                </div>
            )}

            {MAINTENANCE_MODE && user?.role !== 'admin' && page !== 'login' ? (
                <div className="maintenance-wrapper" style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('https://img.odcdn.com.br/wp-content/uploads/2025/09/EA-Sports-FC-26-jogadores-entrando-em-campo-1024x576.webp')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '80vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div className="maintenance-card">
                        <div style={{fontSize: '5rem', marginBottom: '20px'}}>🛠️</div>
                        <h1 style={{color: 'var(--primary-color)', marginBottom: '15px'}}>Site em Manutenção</h1>
                        <p style={{color: 'var(--text-light)', marginBottom: '30px', fontSize: '1.1rem'}}>
                            Estamos trabalhando em melhorias para a <strong>Gangster Cup</strong>. 
                            Voltaremos em breve com o sorteio e as tabelas atualizadas!
                        </p>
                    </div>
                </div>
            ) : (
                <>
            {showLiveAlert && (
                <div className="live-alert-overlay">
                    <div className="live-alert-card">
                        <button className="close-alert" onClick={() => setShowLiveAlert(false)} title="Fechar">×</button>
                        <div className="live-badge">AO VIVO</div>
                        <h3>Transmissões da Gangster Cup</h3>
                        <p>Não perca nenhum lance! Acompanhe as partidas ao vivo agora mesmo no nosso canal oficial da Twitch.</p>
                        <div style={{ marginTop: '20px' }}>
                            <a
                                href="https://twitch.tv/eujohnzinrp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                                onClick={() => setShowLiveAlert(false)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0H3.857zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142v6.286z"/><path d="M11.857 3.143h-1.143V6.29h1.143V3.143zm-3.143 0H7.571V6.29h1.143V3.143z"/></svg>
                                Assistir Agora
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <header className="header-nav">
                <nav className="container nav-content" aria-label="Navegação Principal">
                    <div className={`logo ${isLogoAnimated ? 'logo-click-animation' : ''}`} onClick={handleLogoClick}>
                        <img src="/logo.png" alt="Logo" className="nav-logo" />
                        EA FC 26 <span>GANGSTER CUP</span>
                    </div>

                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Abrir Menu">
                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                    </button>

                    <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
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
                                <li><a href="#" onClick={() => navigate('signup')}>Inscreva-se </a></li>
                                <li><button className="btn-primary" onClick={() => navigate('login')}>Entrar</button></li>
                            </>
                        ) : (
                            <li><button className="btn-primary" onClick={handleLogout}>Sair</button></li>
                        )}
                    </ul>
                </nav>
            </header>

            {roleUpdateNotify && (
                <div className="success-overlay" style={{ zIndex: 3000 }}>
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>🛡️</div>
                        <h2>Seu Acesso Mudou!</h2>
                        <p>Seu novo cargo agora é: <strong>{roleUpdateNotify}</strong></p>
                        <p style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.8 }}>Sincronizando novas permissões...</p>
                    </div>
                </div>
            )}

            {banNotify && (
                <div className="success-overlay" style={{ zIndex: 4000 }}>
                    <div className="success-modal" style={{ borderColor: '#ff4444' }}>
                        <div style={{fontSize: '5rem'}}>🚫</div>
                        <h2 style={{color: '#ff4444'}}>CONTA BANIDA</h2>
                        <p>Sua conta foi suspensa por violar os termos da <strong>Gangster Cup</strong>.</p>
                        <p style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.7 }}>Encerrando sessão...</p>
                    </div>
                </div>
            )}

            {logoutMessage && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>👋</div>
                        <h2>{logoutMessage}</h2>
                        <p>Sua sessão foi encerrada. Redirecionando...</p>
                    </div>
                </div>
            )}

            {showResetConfirm && (
                <div className="success-overlay">
                    <div className="success-modal" style={{borderColor: 'var(--primary-color)'}}>
                        <div style={{fontSize: '5rem'}}>⚠️</div>
                        <h2>Resetar Campeonato?</h2>
                        <p>AVISO: Isso apagará TODOS os resultados das partidas atuais. Deseja continuar?</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px', flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={executeReset}>Sim, Resetar</button>
                            <button className="btn-primary" style={{ background: '#444', color: 'white' }} onClick={() => setShowResetConfirm(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {showDrawConfirm && (
                <div className="success-overlay">
                    <div className="success-modal" style={{borderColor: 'var(--primary-color)'}}>
                        <div style={{fontSize: '5rem'}}>⚽</div>
                        <h2>Realizar Novo Sorteio?</h2>
                        <p>Isso apagará todas as partidas atuais para gerar o novo torneio (Grupos + Mata-Mata). Deseja continuar?</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px', flexWrap: 'wrap' }}>
                            <button className="btn-primary" onClick={executeGroupDraw}>Sim, Gerar Grupos</button>
                            <button className="btn-primary" style={{ background: '#444', color: 'white' }} onClick={() => setShowDrawConfirm(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {drawMessage && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>🏆</div>
                        <h2>Torneio Gerado!</h2>
                        <p>{drawMessage}</p>
                    </div>
                </div>
            )}

            {resetMessage && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>✅</div>
                        <h2>Campeonato Resetado!</h2>
                        <p>{resetMessage}</p>
                    </div>
                </div>
            )}

            <section className="page-content">
                {loading ? (
                    <section className="container section text-center"><h2>Carregando dados...</h2></section>
                ) : (
                    <div className="fade-in">
                        {page === 'home' && <Home results={results} onRegisterClick={() => setPage('signup')} />}
                        {page === 'login' && <Login />}
                        {page === 'signup' && (
                            <SignUp 
                                onStepVerify={(email) => { setTempEmail(email); setPage('verify'); }} 
                            />
                        )}
                        {page === 'verify' && tempEmail && (
                            <VerifyEmail email={tempEmail} onVerified={() => setPage('admin')} />
                        )}
                        {page === 'profile' && (
                            <Profile 
                                user={session?.user} 
                                userRegistration={userRegistration} 
                                onUpdate={async () => { await fetchData(); if (session?.user) await fetchUserProfile(session.user); }} 
                            />
                        )}
                        {page === 'admin' && (
                            (!user || showWelcome) ? (
                                <section className="container section text-center">
                                    <div className="success-overlay">
                                        <div className="success-modal">
                                            <div style={{fontSize: '5rem'}}>👋</div>
                                            {user ? (
                                                <>
                                                    <h2>Bem-vindo, {user.role === 'player' ? 'Jogador' : 
                                                        <span className={`text-${user.role}`} style={{
                                                            fontWeight: 'bold',
                                                            color: user.role === 'developer' ? '#28a745' : user.role === 'admin' ? '#007bff' : user.role === 'moderador' ? '#ffc107' : '#ffffff'
                                                        }}>
                                                            {user.role === 'developer' ? 'Desenvolvedor' : user.role === 'admin' ? 'Administrador' : 'Moderador'}
                                                        </span>
                                                    }!</h2>
                                                    <h2 style={{fontSize: '1.8rem', marginTop: '15px'}}>{user.username}</h2>
                                                    <p style={{color: 'var(--text-muted)', marginTop: '15px'}}>Acessando o painel...</p>
                                                </>
                                            ) : accessError ? (
                                                <>
                                                    <div style={{fontSize: '5rem'}}>⚠️</div>
                                                    <h2 style={{color: 'var(--primary-color)'}}>Ops! Algo deu errado</h2>
                                                    <p style={{margin: '15px 0'}}>{accessError}</p>
                                                    <button className="btn-primary" style={{background: '#444'}} onClick={handleLogout}>Sair</button>
                                                </>
                                            ) : (
                                                <>
                                                    <h2>Quase lá...</h2>
                                                    <p style={{fontSize: '1.1rem', marginTop: '10px'}}>
                                                        Sincronizando perfil de <strong>{session?.user?.user_metadata?.playername || session?.user?.email?.split('@')[0]}</strong>
                                                    </p>
                                                    <div className="loading-spinner" style={{margin: '25px auto'}}></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                user.role === 'admin' || user.role === 'developer' || user.role === 'moderador' ? (
                                    <Admin
                                        results={results} 
                                        registrations={registrations} 
                                        updateResult={updateResult} 
                                        onDraw={drawMatches}
                                        onKnockoutDraw={executeKnockoutDraw}
                                        onDeleteMatch={deleteMatch}
                                        onDeleteAll={deleteAllMatches}
                                        user={user}
                                    />
                                ) : (
                                    <PlayerDashboard 
                                        user={user} 
                                        userRegistration={userRegistration} 
                                        results={results} 
                                    />
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.027-.07 8.736 8.736 0 0 1-1.29-.614.051.051 0 0 1-.006-.085c.085-.063.17-.13.252-.198a.053.053 0 0 1 .054-.007c2.611 1.195 5.432 1.195 8.002 0a.053.053 0 0 1 .054.007c.082.068.167.135.252.198a.051.051 0 0 1-.006.085 8.746 8.746 0 0 1-1.29.614.05.05 0 0 0-.027.07c.236.465.51.908.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"/>
                        </svg>
                        Discord Oficial
                    </a>
                    <a href="https://twitch.tv/eujohnzinrp" className="twitch" target="_blank" rel="noopener noreferrer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0H3.857zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142v6.286z"/>
                            <path d="M11.857 3.143h-1.143V6.29h1.143V3.143zm-3.143 0H7.571V6.29h1.143V3.143z"/>
                        </svg>
                        Assistir ao Vivo
                    </a>
                </div>
                <p style={{ marginTop: '20px' }}>&copy; 2026 Gangster Cup. </p>
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
