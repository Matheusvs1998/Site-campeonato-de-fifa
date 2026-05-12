const { useState, useEffect } = React;

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

function App() {
    const [page, setPage] = useState('home'); // home, login, admin, register
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null); // { role: 'admin' | 'user' }
    const [registrations, setRegistrations] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLiveAlert, setShowLiveAlert] = useState(true);

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

    const drawMatches = async () => {
        if (registrations.length < 2) {
            alert("É necessário pelo menos 2 inscritos para realizar o sorteio!");
            return;
        }

        const shuffled = [...registrations].sort(() => 0.5 - Math.random());
        const newMatches = [];
        
        for (let i = 0; i < shuffled.length; i += 2) {
            if (shuffled[i + 1]) {
                newMatches.push({
                    p1: shuffled[i].teamName,
                    p2: shuffled[i + 1].teamName,
                    score1: 0,
                    score2: 0,
                    status: 'Agendado'
                });
            }
        }

        if (newMatches.length > 0 && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('matches')
                .insert(newMatches)
                .select();

            if (error) {
                console.error('Erro ao sortear partidas:', error);
                alert('Erro ao realizar sorteio. Tente novamente.');
            } else {
                setResults(data); // Atualiza com as partidas inseridas (com IDs do Supabase)
                alert("Sorteio realizado com sucesso!");
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

    return (
        <div className="app-wrapper">
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
                <div className="container nav-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
                    <div className="logo" onClick={() => navigate('home')}>Campeonato de EA FC 26  <span>Gangster Cup</span></div>
                    
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
                            <li><button className="btn-primary" onClick={() => navigate('login')}>Entrar(admin)</button></li>
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
    return (
        <React.Fragment>
            <section className="hero">
                <div className="container">
                    <h1>Campeonato EA FC 26 da Gangster Cup</h1>
                    <p>Veja os resultados dos jogos logo abaixo.</p>
                    <button className="btn-large" style={{marginTop: '20px'}} onClick={onRegisterClick}>Garantir minha vaga</button>
                </div>
            </section>

            <section className="container section">
                <h2>Resultados dos jogos</h2>
                <div className="results-grid">
                    {results.map(match => (
                        <div key={match.id} className="card match-card">
                            <div className="match-info">
                                <span>{match.p1}</span>
                                <span className="score">{match.score1} x {match.score2}</span>
                                <span>{match.p2}</span>
                            </div>
                            <div className={`status ${match.status.toLowerCase()}`}>{match.status}</div>
                        </div>
                    ))}
                </div>
            </section>
        </React.Fragment>
    );
}

function Login({ onLogin }) {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Mock de autenticação simples
        if (user === 'admin' && pass === '32695940') {
            onLogin('admin');
        } else {
            onLogin('user');
        }
    };

    return (
        <section className="container section">
            <div className="login-container">
                <h2>Login</h2>
                <form onSubmit={handleSubmit} className="card">
                    <div className="form-group">
                        <label>Usuário(admin)</label>
                        <input type="text" value={user} onChange={(e) => setUser(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Senha</label>
                        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary">Entrar</button>
                </form>
            </div>
        </section>
    );
}

function Register({ onBack, onRegister }) { // onRegister agora é assíncrono
    const [formData, setFormData] = useState({
        teamName: '',
        playerName: '',
        platform: 'PS5',
        gamertag: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
                        <label>Nome do Time</label>
                        <input type="text" value={formData.teamName} onChange={e => setFormData({...formData, teamName: e.target.value})} placeholder="Ex: Real Madrid Brasil" required />
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
                    <button type="submit" className="btn-primary">Finalizar Inscrição</button>
                </form>
            </div>
        </section>
    );
}

function Admin({ results, registrations, updateResult, onDraw, onDeleteMatch, onDeleteAll }) {
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
                                    <td>{reg.teamName}</td>
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
                            <th>Partida</th>
                            <th>Placar 1</th>
                            <th>Placar 2</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(match => (
                            <tr key={match.id}>
                                <td>{match.p1} vs {match.p2}</td>
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