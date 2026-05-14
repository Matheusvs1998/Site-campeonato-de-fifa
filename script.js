const { useState, useEffect } = React;

// --- CONTROLE DE MANUTENÇÃO ---
const MAINTENANCE_MODE = false; // Mude para true para ATIVAR; false para DESATIVAR
const IP_VERIFICATION_ENABLED = true; // Mude para false para DESATIVAR a verificação de IP para moderação

// --- Configuração Supabase ---
// Substitua com suas credenciais do Supabase
const SUPABASE_URL = 'https://dwavwnehkkywicqfgbss.supabase.co'; // Corrigido: Remover "/rest/v1/"
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3YXZ3bmVoa2t5d2ljcWZnYnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NjU0MjEsImV4cCI6MjA5NDE0MTQyMX0.tpluduLQZNuQJuuxL-Xhe3tvDqzX0sB9TudY6awBwDQ'; // Certifique-se de que esta é a chave anon (public) completa

let supabaseClient = null;
try {
    // O objeto global da CDN é 'supabase' (minúsculo)
    if (SUPABASE_URL.startsWith('https')) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Supabase não configurado corretamente:", e.message);
}
// --- Fim Configuração Supabase ---

// Função para gerar fallback caso a logo oficial falhe
const getFallbackLogo = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f30909&color=fff&bold=true&format=svg`;

// Função auxiliar para buscar o escudo do time
const getTeamLogo = (teamName) => {
    // Extrai apenas o nome do time caso venha com o ID do jogador (ex: "Real Madrid (Player123)")
    const nameOnly = teamName.split(' (')[0];
    // Voltando para a versão Wikipedia com Proxy (weserv.nl) para garantir estabilidade
    const proxy = 'https://images.weserv.nl/?url=';
    const logos = {
        // Espanha
        'Real Madrid': 'upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
        'Barcelona': 'upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona.svg',
        'Atlético de Madrid': 'upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
        'Sevilla': 'upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
        'Real Sociedad': 'upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg',
        'Villarreal': 'upload.wikimedia.org/wikipedia/en/7/70/Villarreal_CF_logo.svg',
        'Athletic Bilbao': 'upload.wikimedia.org/wikipedia/en/9/98/Athletic_Club_logo.svg',
        'Real Betis': 'upload.wikimedia.org/wikipedia/en/1/13/Real_Betis_logo.svg',
        'Valencia': 'upload.wikimedia.org/wikipedia/en/c/ce/Valencia_Cf_logo.svg',
        // Inglaterra
        'Manchester City': 'upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
        'Arsenal': 'upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
        'Liverpool': 'upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
        'Manchester United': 'upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
        'Chelsea': 'upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
        'Tottenham': 'upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
        'Newcastle United': 'upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
        'Aston Villa': 'upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg',
        'West Ham': 'upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
        'Everton': 'upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
        // França
        'PSG': 'upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
        'Marseille': 'upload.wikimedia.org/wikipedia/en/d/d8/Olympic_Marseille_logo.svg',
        'Lyon': 'upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais_crest.svg',
        'Monaco': 'upload.wikimedia.org/wikipedia/en/f/f3/AS_Monaco_FC.svg',
        'Lille': 'upload.wikimedia.org/wikipedia/en/3/3f/Lille_OSC_logo.svg',
        'Nice': 'upload.wikimedia.org/wikipedia/en/2/2e/OGC_Nice_logo.svg',
        'Rennes': 'upload.wikimedia.org/wikipedia/en/9/9e/Stade_Rennais_FC.svg',
        // Alemanha
        'Bayern de Munique': 'upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
        'Borussia Dortmund': 'upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
        'Bayer Leverkusen': 'upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
        'RB Leipzig': 'upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg',
        'Eintracht Frankfurt': 'upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg',
        'Wolfsburg': 'upload.wikimedia.org/wikipedia/commons/f/f3/Logo_VfL_Wolfsburg.svg',
        'Borussia Mönchengladbach': 'upload.wikimedia.org/wikipedia/commons/8/81/Borussia_M%C3%B6nchengladbach_logo.svg',
        // Itália
        'Inter de Milão': 'upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
        'AC Milan': 'upload.wikimedia.org/wikipedia/commons/d/d1/ACM-logo.svg',
        'Juventus': 'upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg',
        'Napoli': 'upload.wikimedia.org/wikipedia/commons/0/0d/S.S.C._Napoli_logo.svg',
        'AS Roma': 'upload.wikimedia.org/wikipedia/en/f/f3/AS_Roma_logo_%282017%29.svg',
        'Lazio': 'upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg',
        'Atalanta': 'upload.wikimedia.org/wikipedia/en/6/66/Atalanta_BC.svg',
        'Fiorentina': 'upload.wikimedia.org/wikipedia/commons/7/79/ACF_Fiorentina_2022_logo.svg',
        // Brasil
        'Flamengo': 'upload.wikimedia.org/wikipedia/pt/2/2e/Flamengo_brazilian_poly_new.svg',
        'Palmeiras': 'upload.wikimedia.org/wikipedia/pt/1/10/Palmeiras_logo.svg',
        'São Paulo': 'upload.wikimedia.org/wikipedia/pt/6/6f/Logo_S%C3%A3o_Paulo_FC.svg',
        'Corinthians': 'upload.wikimedia.org/wikipedia/pt/b/b4/Corinthians_simbolo.png',
        'Grêmio': 'upload.wikimedia.org/wikipedia/pt/d/d8/Gr%C3%AAmio_FBPA.svg',
        'Internacional': 'upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg',
        'Atlético-MG': 'upload.wikimedia.org/wikipedia/en/5/5f/Clube_Atl%C3%A9tico_Mineiro_logo.svg',
        'Fluminense': 'upload.wikimedia.org/wikipedia/en/9/9e/Fluminense_FC_escudo.svg',
        'Botafogo': 'upload.wikimedia.org/wikipedia/en/c/cb/Botafogo_de_Futebol_e_Regatas_logo.svg',
        'Cruzeiro': 'upload.wikimedia.org/wikipedia/en/3/3c/Cruzeiro_Esporte_Clube_%28logo%29.svg',
        'Vasco da Gama': 'upload.wikimedia.org/wikipedia/en/a/ac/CRVascoDaGama.svg',
        'Bahia': 'upload.wikimedia.org/wikipedia/pt/3/39/Esporte_Clube_Bahia_logo.svg',
        'Fortaleza': 'upload.wikimedia.org/wikipedia/pt/4/41/Fortaleza_Esporte_Clube_logo.svg',
        'Athletico-PR': 'upload.wikimedia.org/wikipedia/pt/c/c7/Club_Athletico_Paranaense_2019.svg',
        // Portugal
        'Benfica': 'upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg',
        'FC Porto': 'upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto_logo.svg',
        'Sporting CP': 'upload.wikimedia.org/wikipedia/en/3/3e/Sporting_Clube_de_Portugal.svg',
        // Outros
        'Al-Nassr': 'upload.wikimedia.org/wikipedia/en/2/2b/Al_Nassr_Logo.svg',
        'Al-Hilal': 'upload.wikimedia.org/wikipedia/en/f/fa/Al-Hilal_Logo.svg',
        'Al-Ittihad': 'upload.wikimedia.org/wikipedia/en/5/5b/Al-Ittihad_FC_logo.svg',
        'Al-Ahli': 'upload.wikimedia.org/wikipedia/en/b/b0/Al-Ahli_Saudi_FC_logo.svg',
        'Inter Miami': 'upload.wikimedia.org/wikipedia/en/5/5c/Inter_Miami_CF_logo.svg',
        'LA Galaxy': 'upload.wikimedia.org/wikipedia/en/1/1b/LA_Galaxy_logo.svg',
        'Ajax': 'upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg',
        'PSV Eindhoven': 'upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg',
        'Feyenoord': 'upload.wikimedia.org/wikipedia/en/e/e9/Feyenoord_logo.svg',
        'Celtic': 'upload.wikimedia.org/wikipedia/en/3/35/Celtic_FC_crest.svg',
        'Rangers': 'upload.wikimedia.org/wikipedia/en/4/43/Rangers_FC.svg',
        'Boca Juniors': 'upload.wikimedia.org/wikipedia/en/d/d1/Boca_Juniors_logo.svg',
        'River Plate': 'upload.wikimedia.org/wikipedia/en/a/ac/River_Plate_crest.svg'
    };

    if (logos[nameOnly]) return `${proxy}${logos[nameOnly]}`;
    return getFallbackLogo(nameOnly);
};

function App() {
    const [page, setPage] = useState('home'); // home, login, admin, register
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null); // { role: 'admin' | 'user' }
    const [registrations, setRegistrations] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLiveAlert, setShowLiveAlert] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [accessError, setAccessError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!supabaseClient) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const { data: fetchedRegistrations, error: regError } = await supabaseClient.from('registrations').select('*');
            const { data: fetchedMatches, error: matchError } = await supabaseClient.from('matches').select('*');
            if (regError) console.error('Erro ao buscar inscrições:', regError);
            if (matchError) console.error('Erro ao buscar partidas:', matchError);
            setRegistrations(fetchedRegistrations || []);
            setResults(fetchedMatches || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleLogin = (role) => {
        setUser({ role });
        setPage(role === 'admin' ? 'admin' : 'home');
    };

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
        const { data: newRegistration, error } = await supabaseClient
            .from('registrations')
            .insert([data])
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

    const drawMatches = async () => { // Modificado para incluir fase de grupos e mata-mata
        if (registrations.length < 2) {
            alert("É necessário pelo menos 2 inscritos para realizar o sorteio!");
            return;
        }

        if (!supabaseClient) return;
        if (!window.confirm("Isso apagará todas as partidas atuais para gerar o novo torneio (Grupos + Mata-Mata). Continuar?")) return;

        // Limpar partidas antigas antes de gerar o novo sorteio
        const { error: deleteError } = await supabaseClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteError) {
            console.error('Erro ao limpar partidas:', deleteError);
            return;
        }

        const shuffled = [...registrations].sort(() => 0.5 - Math.random());
        const newMatches = [];
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
            
            // Todos contra todos dentro do grupo (Apenas Ida)
            for (let j = 0; j < groupTeams.length; j++) {
                for (let k = j + 1; k < groupTeams.length; k++) {
                    newMatches.push({
                        p1: `${groupTeams[j].teamName} (${groupTeams[j].gamertag} - ${groupTeams[j].platform.toLowerCase()})`,
                        p2: `${groupTeams[k].teamName} (${groupTeams[k].gamertag} - ${groupTeams[k].platform.toLowerCase()})`,
                        score1: 0,
                        score2: 0,
                        status: 'Agendado',
                        group_name: groupName,
                        stage: 'Fase de Grupos'
                    });
                }
            }
        });

        // --- MATA-MATA DINÂMICO (Ida e Volta) ---
        const numQualified = numGroups * 2; // 2 melhores de cada grupo
        const knockoutStages = [];

        // Define qual fase o mata-mata deve começar
        if (numQualified > 8) knockoutStages.push({ name: 'Oitavas de Final', games: 8 });
        if (numQualified > 4) knockoutStages.push({ name: 'Quartas de Final', games: 4 });
        if (numQualified > 2) knockoutStages.push({ name: 'Semifinal', games: 2 });
        knockoutStages.push({ name: 'Final', games: 1 });

        knockoutStages.forEach(s => {
            for (let i = 1; i <= s.games; i++) {
                let p1Placeholder = `TBD (Vencedor)`;
                let p2Placeholder = `TBD (Vencedor)`;

                // Se for a primeira fase do mata-mata, indica de qual grupo vem
                if (s === knockoutStages[0]) {
                    const groupIdx = Math.floor((i - 1) / 1); 
                    p1Placeholder = `1º Grupo ${String.fromCharCode(65 + (i-1))}`;
                    p2Placeholder = `2º Grupo ${String.fromCharCode(65 + (i % numGroups))}`;
                }
                
                // Jogo de Ida
                newMatches.push({
                    p1: p1Placeholder,
                    p2: p2Placeholder,
                    score1: 0,
                    score2: 0,
                    status: 'Agendado',
                    stage: `${s.name} (Ida)`
                });

                // Jogo de Volta
                newMatches.push({
                    p1: p2Placeholder,
                    p2: p1Placeholder,
                    score1: 0,
                    score2: 0,
                    status: 'Agendado',
                    stage: `${s.name} (Volta)`
                });
            }
        });
        
        if (newMatches.length > 0) {
            const { data, error } = await supabaseClient
                .from('matches')
                .insert(newMatches)
                .select();

            if (error) {
                console.error('Erro ao sortear partidas:', error);
                alert('Erro ao realizar sorteio. Tente novamente.');
            } else {
                setResults(data); // Atualiza com as partidas inseridas (com IDs do Supabase)
                alert("Sorteio realizado com sucesso! Fase de Grupos e Mata-Mata gerados.");
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
        } else {
            setResults(results.filter(match => match.id !== id));
        }
    };

    const deleteAllMatches = async () => {
        if (!supabaseClient || !window.confirm("AVISO: Isso apagará TODOS os resultados. Deseja continuar?")) return;

        const { error } = await supabaseClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Erro ao resetar campeonato:', error);
        else setResults([]);
    };

    const navigate = (p) => {
        setPage(p);
        setIsMenuOpen(false);
    };

    const handleLogoClick = () => {
        navigate('home');
    };

    const handleModerationClick = async () => {
        if (isVerifying) return;
        setIsVerifying(true);
        setAccessError(null);

        if (!IP_VERIFICATION_ENABLED) {
            setIsVerifying(false);
            navigate('login');
            return;
        }

        try {
            // Captura o IP antes de abrir a tela de login
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const { ip: currentIp } = await ipResponse.json();

            // Verifica se o IP está em QUALQUER conta de admin autorizada no banco
            const { data, error } = await supabaseClient
                .from('admins')
                .select('allowed_ip')
                .eq('allowed_ip', currentIp);

            if (error || !data || data.length === 0) {
                setAccessError(`Acesso Negado: O seu local (${currentIp}) não está autorizado.`);
            } else {
                navigate('login');
            }
        } catch (err) {
            setAccessError("Erro de conexão ao verificar segurança. Tente novamente.");
        } finally {
            setIsVerifying(false);
        }
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
                <div className="maintenance-wrapper">
                    <div className="maintenance-card">
                        <div style={{fontSize: '5rem', marginBottom: '20px'}}>🛠️</div>
                        <h1 style={{color: 'var(--primary-color)', marginBottom: '15px'}}>Site em Manutenção</h1>
                        <p style={{color: 'var(--text-light)', marginBottom: '30px', fontSize: '1.1rem'}}>
                            Estamos trabalhando em melhorias para a <strong>Gangster Cup</strong>. 
                            Voltaremos em breve com o sorteio e as tabelas atualizadas!
                        </p>
                        <button className="btn-primary" onClick={handleModerationClick} disabled={isVerifying}>
                            {isVerifying ? 'Verificando...' : 'Acesso Admin'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
            {showLiveAlert && (
                <div className="live-alert-overlay">
                    <div className="live-alert-card card">
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

            <nav className="header-nav">
                <div className="container nav-content">
                    <div className="logo" onClick={handleLogoClick}>Campeonato de EA FC 26  <span>Gangster Cup</span></div>
                    
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                        <div className={`bar ${isMenuOpen ? 'open' : ''}`}></div>
                    </button>

                    <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <li><a href="#" onClick={() => navigate('home')}>Início</a></li>
                        <li><a href="#" onClick={() => navigate('register')}>Inscreva-se</a></li>
                        {user?.role === 'admin' && <li><a href="#" onClick={() => navigate('admin')}>Admin</a></li>}
                        {!user ? (
                            <li><button className="btn-primary" onClick={handleModerationClick} disabled={isVerifying}>
                                {isVerifying ? 'Verificando...' : 'Moderação'}
                            </button></li>
                        ) : (
                            <li><button className="btn-primary" onClick={() => { setUser(null); setIsMenuOpen(false); }}>Sair</button></li>
                        )}
                    </ul>
                </div>
            </nav>

            <main>
                {loading ? (
                    <section className="container section text-center"><h2>Carregando dados...</h2></section>
                ) : (
                    <React.Fragment>
                        {page === 'home' && <Home results={results} onRegisterClick={() => setPage('register')} />}
                        {page === 'login' && <Login onLogin={handleLogin} />}
                        {page === 'admin' && (
                            <Admin 
                                results={results} 
                                registrations={registrations} 
                                updateResult={updateResult} 
                                onDraw={drawMatches}
                                onDeleteMatch={deleteMatch}
                                onDeleteAll={deleteAllMatches}
                            />
                        )}
                        {page === 'register' && <Register onBack={() => setPage('home')} onRegister={addRegistration} />}
                    </React.Fragment>
                )}
            </main>
                </>
            )}
            <footer className="container">
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
                <p>&copy; 2026 Campeonato EA FC 26 Gangster Cup. Desenvolvido por: Matheus Vasconcelos.</p>
            </footer>
        </div>
    );
}

function Home({ results, onRegisterClick }) {
    // Cálculo dinâmico da classificação dos grupos baseado nos resultados
    const groupStandings = {};
    results.forEach(m => {
        if (m.stage === 'Fase de Grupos' && m.group_name) {
            if (!groupStandings[m.group_name]) groupStandings[m.group_name] = {};
            
            [m.p1, m.p2].forEach(t => {
                if (!groupStandings[m.group_name][t]) {
                    groupStandings[m.group_name][t] = { fullName: t, pts: 0 };
                }
            });

            if (m.status === 'Finalizado') {
                if (m.score1 > m.score2) {
                    groupStandings[m.group_name][m.p1].pts += 3;
                } else if (m.score2 > m.score1) {
                    groupStandings[m.group_name][m.p2].pts += 3;
                } else {
                    groupStandings[m.group_name][m.p1].pts += 1;
                    groupStandings[m.group_name][m.p2].pts += 1;
                }
            }
        }
    });

    // Filtragem das partidas por status
    const upcoming = results.filter(m => m.status === 'Agendado');
    const finished = results.filter(m => m.status !== 'Agendado');

    // Componente interno para evitar repetição de código
    const MatchCard = ({ match, showScore }) => (
        <div key={match.id} className="card match-card">
            <div className="match-info">
                <div className="team-display">
                    <img 
                        src={getTeamLogo(match.p1)} 
                        alt={match.p1} 
                        className="team-logo" 
                        onError={(e) => { e.target.src = getFallbackLogo(match.p1.split(' (')[0]); }}
                    />
                    <span>{match.p1.split(' (')[0]}</span>
                    {match.p1.includes(' (') && (
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.2' }}>
                            ({match.p1.split(' (')[1]}
                        </small>
                    )}
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
                        onError={(e) => { e.target.src = getFallbackLogo(match.p2.split(' (')[0]); }}
                    />
                    <span>{match.p2.split(' (')[0]}</span>
                    {match.p2.includes(' (') && (
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.2' }}>
                            ({match.p2.split(' (')[1]}
                        </small>
                    )}
                </div>
            </div>
            <div className={`status ${match.status.toLowerCase()}`}>
                {match.stage && <span style={{display: 'block', fontSize: '0.85em', color: 'var(--primary-color)'}}>{match.stage} {match.group_name ? `(${match.group_name})` : ''}</span>}
                {match.status}
            </div>
        </div>
    );

    return (
        <React.Fragment>
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
                                            {Object.values(groupStandings[groupName])
                                                .sort((a, b) => b.pts - a.pts)
                                                .map((team, idx) => {
                                                    const teamName = team.fullName.split(' (')[0];
                                                    const gamertag = team.fullName.includes(' (') ? team.fullName.split(' (')[1] : '';
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <img 
                                                                    src={getTeamLogo(teamName)} 
                                                                    className="team-logo-small" 
                                                                    alt="" 
                                                                    onError={(e) => { e.target.src = getFallbackLogo(teamName); }}
                                                                />
                                                                <div>
                                                                    <div style={{ fontWeight: 'bold' }}>{teamName}</div>
                                                                    {gamertag && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({gamertag}</div>}
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                                                {team.pts}
                                                            </td>
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

                {finished.length > 0 && (
                    <div style={{marginBottom: '60px'}}>
                        <h2 style={{borderLeft: '5px solid var(--primary-color)', paddingLeft: '15px', marginBottom: '30px'}}>Resultados e Ao Vivo</h2>
                        <div className="results-grid">
                            {finished.map(match => <MatchCard key={match.id} match={match} showScore={true} />)}
                        </div>
                    </div>
                )}

                {upcoming.length > 0 && (
                    <div>
                        <h2 style={{borderLeft: '5px solid #444', paddingLeft: '15px', marginBottom: '30px'}}>Próximos Jogos</h2>
                        <div className="results-grid">
                            {upcoming.map(match => <MatchCard key={match.id} match={match} showScore={false} />)}
                        </div>
                    </div>
                )}

                {results.length === 0 && (
                    <div className="text-center">
                        <p style={{color: 'var(--text-muted)', fontSize: '1.2rem'}}>Nenhuma partida gerada. Aguarde o sorteio oficial!</p>
                    </div>
                )}
            </section>
        </React.Fragment>
    );
}

function Login({ onLogin }) {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');
    const [showAnimation, setShowAnimation] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsChecking(true);

        try {
            let query = supabaseClient
                .from('admins')
                .select('*')
                .eq('username', user)
                .eq('password', pass);

            if (IP_VERIFICATION_ENABLED) {
                // Obtém o IP público atual do usuário
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const { ip: currentIp } = await ipResponse.json();
                query = query.eq('allowed_ip', currentIp);
            }

            const { data, error: dbError } = await query.single();

            if (dbError || !data) {
                throw new Error('Acesso negado: Credenciais inválidas ou local não autorizado.');
            }

            setShowAnimation(true);
            setTimeout(() => onLogin('admin'), 2000); // Aguarda 2s para mostrar a animação
        } catch (err) {
            setError(err.message || 'Erro ao validar acesso.');
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <section className="container section">
            {showAnimation && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div style={{fontSize: '5rem'}}>✅</div>
                        <h2>Acesso Autorizado!</h2>
                        <p>Você logou na moderação.</p>
                    </div>
                </div>
            )}
            <div className="login-container">
                <h2>Login</h2>
                <form onSubmit={handleSubmit} className="card">
                    {error && (
                        <p style={{ color: '#ff4444', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                            {error}
                        </p>
                    )}
                    <div className="form-group">
                        <label>Usuario</label>
                        <input type="text" value={user} onChange={(e) => setUser(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Senha</label>
                        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isChecking}>
                        {isChecking ? 'Verificando...' : 'Entrar'}
                    </button>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '15px', textAlign: 'center'}}>
                        Apenas administradores autorizados.
                    </p>
                </form>
            </div>
        </section>
    );
}

function Register({ onBack, onRegister }) { // onRegister agora é assíncrono
    const [formData, setFormData] = useState({
        teamName: 'Real Madrid',
        playerName: '',
        platform: 'PS5',
        gamertag: ''
    });
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) {
            alert("Você precisa aceitar os termos de responsabilidade para continuar.");
            return;
        }
        const success = await onRegister(formData);
        if (success) {
            setSubmitted(true);
        }
    };

    if (submitted) {
        return (
            <section className="container section text-center">
                <div className="card">
                    <h2 style={{color: 'var(--primary-color)'}}>Inscrição Realizada!</h2>
                    <p>Boa sorte, {formData.playerName}! Seu time <strong>{formData.teamName}</strong> já está no nosso radar.</p>
                    <button className="btn-primary" style={{marginTop: '20px'}} onClick={onBack}>Voltar ao Início</button>
                </div>
            </section>
        );
    }

    return (
        <section className="container section">
            <div className="form-container">
                <h2>Inscrição de Atleta</h2>
                <form onSubmit={handleSubmit} className="card">
                    <div className="form-group">
                        <div style={{textAlign: 'center', marginBottom: '15px'}}>
                            <img 
                                src={getTeamLogo(formData.teamName)} 
                                alt="Preview" 
                                className="team-logo" 
                                onError={(e) => { e.target.src = getFallbackLogo(formData.teamName); }}
                                style={{width: '80px', height: '80px'}} 
                            />
                        </div>
                        <label>Escolha seu Time</label>
                        <select value={formData.teamName} onChange={e => setFormData({...formData, teamName: e.target.value})} required>
                            <optgroup label="Espanha">
                                <option value="Real Madrid">Real Madrid</option>
                                <option value="Barcelona">Barcelona</option>
                                <option value="Atlético de Madrid">Atlético de Madrid</option>
                                <option value="Sevilla">Sevilla</option>
                                <option value="Real Sociedad">Real Sociedad</option>
                                <option value="Villarreal">Villarreal</option>
                                <option value="Athletic Bilbao">Athletic Bilbao</option>
                                <option value="Real Betis">Real Betis</option>
                                <option value="Valencia">Valencia</option>
                            </optgroup>
                            <optgroup label="Inglaterra">
                                <option value="Manchester City">Manchester City</option>
                                <option value="Arsenal">Arsenal</option>
                                <option value="Liverpool">Liverpool</option>
                                <option value="Manchester United">Manchester United</option>
                                <option value="Chelsea">Chelsea</option>
                                <option value="Tottenham">Tottenham</option>
                                <option value="Newcastle United">Newcastle United</option>
                                <option value="Aston Villa">Aston Villa</option>
                                <option value="West Ham">West Ham</option>
                                <option value="Everton">Everton</option>
                            </optgroup>
                            <optgroup label="França">
                                <option value="PSG">PSG</option>
                                <option value="Marseille">Marseille</option>
                                <option value="Lyon">Lyon</option>
                                <option value="Monaco">Monaco</option>
                                <option value="Lille">Lille</option>
                                <option value="Nice">Nice</option>
                                <option value="Rennes">Rennes</option>
                            </optgroup>
                            <optgroup label="Alemanha">
                                <option value="Bayern de Munique">Bayern de Munique</option>
                                <option value="Borussia Dortmund">Borussia Dortmund</option>
                                <option value="Bayer Leverkusen">Bayer Leverkusen</option>
                                <option value="RB Leipzig">RB Leipzig</option>
                                <option value="Eintracht Frankfurt">Eintracht Frankfurt</option>
                                <option value="Wolfsburg">Wolfsburg</option>
                                <option value="Borussia Mönchengladbach">Borussia Mönchengladbach</option>
                            </optgroup>
                            <optgroup label="Itália">
                                <option value="Inter de Milão">Inter de Milão</option>
                                <option value="AC Milan">AC Milan</option>
                                <option value="Juventus">Juventus</option>
                                <option value="Napoli">Napoli</option>
                                <option value="AS Roma">AS Roma</option>
                                <option value="Lazio">Lazio</option>
                                <option value="Atalanta">Atalanta</option>
                                <option value="Fiorentina">Fiorentina</option>
                            </optgroup>
                            <optgroup label="Portugal">
                                <option value="Benfica">Benfica</option>
                                <option value="FC Porto">FC Porto</option>
                                <option value="Sporting CP">Sporting CP</option>
                            </optgroup>
                            <optgroup label="Arábia Saudita">
                                <option value="Al-Nassr">Al-Nassr</option>
                                <option value="Al-Hilal">Al-Hilal</option>
                                <option value="Al-Ittihad">Al-Ittihad</option>
                                <option value="Al-Ahli">Al-Ahli</option>
                            </optgroup>
                            <optgroup label="EUA (MLS)">
                                <option value="Inter Miami">Inter Miami</option>
                                <option value="LA Galaxy">LA Galaxy</option>
                            </optgroup>
                            <optgroup label="Outros">
                                <option value="Ajax">Ajax</option>
                                <option value="PSV Eindhoven">PSV Eindhoven</option>
                                <option value="Feyenoord">Feyenoord</option>
                                <option value="Celtic">Celtic</option>
                                <option value="Rangers">Rangers</option>
                                <option value="Boca Juniors">Boca Juniors</option>
                                <option value="River Plate">River Plate</option>
                            </optgroup>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Nome do Jogador</label>
                        <input type="text" value={formData.playerName} onChange={e => setFormData({...formData, playerName: e.target.value})} placeholder="Seu nome completo" required />
                    </div>
                    <div className="form-group">
                        <label>Plataforma</label>
                        <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                            <option value="PS5">PlayStation 5</option>
                            <option value="Xbox">Xbox Series X/S</option>
                            <option value="PC">PC</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Gamertag / PSN ID</label>
                        <input type="text" value={formData.gamertag} onChange={e => setFormData({...formData, gamertag: e.target.value})} placeholder="Ex: Player_123" required />
                    </div>
                    
                    <div className="form-group">
                        <label>Termo de Responsabilidade</label>
                        <div className="terms-box">
                            <p><strong>1. Conduta:</strong> O jogador se compromete a manter o fair play e respeitar adversários e organizadores. Ofensas ou comportamentos tóxicos resultarão em desclassificação.</p>
                            <p><strong>2. Imagem e Transmissão:</strong> Ao participar, você autoriza a exibição do seu nome de usuário e gameplay nas transmissões oficiais da Gangster Cup na Twitch.</p>
                            <p><strong>3. Conexão:</strong> A estabilidade da internet é de responsabilidade do atleta. Quedas persistentes podem resultar em WO conforme a regra da rodada.</p>
                            <p><strong>4. Dados:</strong> Seus dados (nome e gamertag) serão armazenados exclusivamente para a organização deste campeonato.</p>
                        </div>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required />
                            <span>Li e concordo com os termos acima</span>
                        </label>
                    </div>

                    <button type="submit" className="btn-primary">Finalizar Inscrição</button>
                </form>
            </div>
        </section>
    );
}

function Admin({ results, registrations, updateResult, onDraw, onDeleteMatch, onDeleteAll }) {
    const [admins, setAdmins] = useState([]);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '', allowed_ip: '' });
    const [myIp, setMyIp] = useState('Carregando...');

    useEffect(() => {
        const fetchAdminsData = async () => {
            const { data } = await supabaseClient.from('admins').select('*');
            if (data) setAdmins(data);
            
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const { ip } = await ipRes.json();
                setMyIp(ip);
            } catch (e) { setMyIp('Erro ao obter IP'); }
        };
        fetchAdminsData();
    }, []);

    const handleAddAdmin = async () => {
        if (!newAdmin.username || !newAdmin.password || !newAdmin.allowed_ip) {
            alert("Preencha todos os campos do novo admin!");
            return;
        }
        const { data, error } = await supabaseClient.from('admins').insert([newAdmin]).select();
        if (error) alert("Erro: " + error.message);
        else {
            setAdmins([...admins, data[0]]);
            setNewAdmin({ username: '', password: '', allowed_ip: '' });
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!confirm("Remover este acesso?")) return;
        const { error } = await supabaseClient.from('admins').delete().eq('id', id);
        if (error) alert("Erro ao remover: " + error.message);
        else setAdmins(admins.filter(a => a.id !== id));
    };

    return (
        <section className="container section">
            <div className="admin-header">
                <h2>Painel do Administrador</h2>
                <div className="admin-actions">
                    <button className="btn-danger" onClick={onDeleteAll}>Resetar Campeonato</button>
                    <button className="btn-primary" onClick={onDraw}>Realizar Sorteio</button>
                </div>
            </div>

            <div className="card" style={{marginBottom: '40px'}}>
                <h3>Gerenciar Acessos (Admins Autorizados)</h3>
                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: '10px 0 20px'}}>
                    IP da sua máquina atual: <strong style={{color: 'var(--primary-color)'}}>{myIp}</strong>
                </p>
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Senha</th>
                                <th>IP Autorizado</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map(adm => (
                                <tr key={adm.id}>
                                    <td>{adm.username}</td>
                                    <td>••••••</td>
                                    <td>{adm.allowed_ip}</td>
                                    <td><button className="btn-icon" onClick={() => handleDeleteAdmin(adm.id)}>🗑️</button></td>
                                </tr>
                            ))}
                            <tr>
                                <td><input type="text" placeholder="User" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} /></td>
                                <td><input type="password" placeholder="Senha" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} /></td>
                                <td><input type="text" placeholder="IP (ex: 189.x.x.x)" value={newAdmin.allowed_ip} onChange={e => setNewAdmin({...newAdmin, allowed_ip: e.target.value})} /></td>
                                <td><button className="btn-primary" style={{padding: '5px 15px'}} onClick={handleAddAdmin}>Add</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{marginBottom: '40px'}}>
                <h3>Jogadores Inscritos ({registrations.length})</h3>
                {registrations.length === 0 ? (
                    <p style={{marginTop: '15px', color: 'var(--text-muted)'}}>Nenhum inscrito até o momento.</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Jogador</th>
                                <th>Plataforma</th>
                                <th>Gamertag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map((reg, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <img 
                                            src={getTeamLogo(reg.teamName)} 
                                            className="team-logo-small" 
                                            alt="" 
                                            onError={(e) => { e.target.src = getFallbackLogo(reg.teamName); }}
                                        />
                                        {reg.teamName}
                                    </td>
                                    <td>{reg.playerName}</td>
                                    <td>{reg.platform}</td>
                                    <td>{reg.gamertag}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <h3>Gerenciar Partidas</h3>
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>
                                Partida
                                <span style={{fontSize: '0.7em', display: 'block', fontWeight: 'normal', color: 'var(--text-muted)'}}>
                                    (Fase / Grupo)
                                </span>
                            </th>
                            <th>Placar 1</th>
                            <th>Placar 2</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(match => (
                            <tr key={match.id}>
                                <td>
                                    {match.stage === 'Fase de Grupos' ? (
                                        <span>{match.group_name}: {match.p1} vs {match.p2}</span>
                                    ) : (
                                        <span>{match.stage}: {match.p1} vs {match.p2}</span>
                                    )}
                                </td>
                                <td>
                                    <input 
                                        type="number" 
                                        value={match.score1} 
                                        onChange={(e) => updateResult(match.id, 'score1', e.target.value)} 
                                    />
                                </td>
                                <td>
                                    <input 
                                        type="number" 
                                        value={match.score2} 
                                        onChange={(e) => updateResult(match.id, 'score2', e.target.value)} 
                                    />
                                </td>
                                <td>
                                    <select 
                                        value={match.status} 
                                        onChange={(e) => updateResult(match.id, 'status', e.target.value)}
                                    >
                                        <option value="Agendado">Agendado</option>
                                        <option value="Ao Vivo">Ao Vivo</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </td>
                                <td>
                                    <button className="btn-icon" onClick={() => onDeleteMatch(match.id)} title="Apagar Partida">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
