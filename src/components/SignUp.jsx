import React, { useState, useRef, useEffect } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo } from '../teamLogos';
import { translateAuthError } from '../helpers';

function SignUp({ onStepVerify }) {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [formData, setFormData] = useState({
        playername: '',
        teamname: 'Real Madrid',
        platform: 'PS5',
        gamertag: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [hasRead, setHasRead] = useState(false);
    const termsRef = useRef(null);

    // Estados de validação em tempo real
    const [fieldStatus, setFieldStatus] = useState({
        email: { checking: false, taken: false, message: '' },
        playername: { checking: false, taken: false, message: '' },
        gamertag: { checking: false, taken: false, message: '' }
    });
    const debounceTimers = useRef({});

    const handleScroll = () => {
        const div = termsRef.current;
        if (div) {
            const isBottom = div.scrollHeight - div.scrollTop <= div.clientHeight + 5;
            if (isBottom) setHasRead(true);
        }
    };

    useEffect(() => {
        if (termsRef.current && termsRef.current.scrollHeight <= termsRef.current.clientHeight) {
            setHasRead(true);
        }
    }, []);

    // Verificação de disponibilidade com debounce
    const checkAvailability = (field, value) => {
        const trimmed = value.trim();

        // Limpa timer anterior
        if (debounceTimers.current[field]) {
            clearTimeout(debounceTimers.current[field]);
        }

        // Se campo vazio, reseta o status
        if (!trimmed) {
            setFieldStatus(prev => ({ ...prev, [field]: { checking: false, taken: false, message: '' } }));
            return;
        }

        // Marca como verificando
        setFieldStatus(prev => ({ ...prev, [field]: { checking: true, taken: false, message: '' } }));

        debounceTimers.current[field] = setTimeout(async () => {
            try {
                let taken = false;
                let message = '';

                if (field === 'email') {
                    // Verifica na tabela profiles (podemos usar auth, mas profiles é acessível)
                    // O Supabase Auth não expõe busca por email diretamente ao anon,
                    // mas podemos verificar via registrations + profiles de forma indireta
                    // A validação principal do email ocorre no signUp (Auth cuida disso)
                    setFieldStatus(prev => ({ ...prev, email: { checking: false, taken: false, message: '' } }));
                    return;
                } else if (field === 'playername') {
                    const { data } = await supabaseClient
                        .from('profiles')
                        .select('username')
                        .eq('username', trimmed)
                        .maybeSingle();
                    if (data) {
                        taken = true;
                        message = '⚠️ Este nome de usuário já está em uso.';
                    }
                } else if (field === 'gamertag') {
                    const { data } = await supabaseClient
                        .from('registrations')
                        .select('gamertag')
                        .eq('gamertag', trimmed)
                        .maybeSingle();
                    if (data) {
                        taken = true;
                        message = '⚠️ Esta Gamertag/PSN ID já está em uso.';
                    }
                }

                setFieldStatus(prev => ({ ...prev, [field]: { checking: false, taken, message } }));
            } catch (err) {
                console.error(`Erro ao verificar ${field}:`, err);
                setFieldStatus(prev => ({ ...prev, [field]: { checking: false, taken: false, message: '' } }));
            }
        }, 500);
    };

    // Handlers com verificação automática
    const handleEmailChange = (value) => {
        setEmail(value);
        checkAvailability('email', value);
    };

    const handlePlayernameChange = (value) => {
        setFormData(prev => ({ ...prev, playername: value }));
        checkAvailability('playername', value);
    };

    const handleGamertagChange = (value) => {
        setFormData(prev => ({ ...prev, gamertag: value }));
        checkAvailability('gamertag', value);
    };

    // Componente inline para indicador de status do campo
    const FieldIndicator = ({ field }) => {
        const status = fieldStatus[field];
        if (status.checking) {
            return <small style={{ color: 'var(--primary-color)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>🔍 Verificando disponibilidade...</small>;
        }
        if (status.taken) {
            return <small style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '4px', display: 'block', fontWeight: 'bold' }}>{status.message}</small>;
        }
        const fieldValue = field === 'email' ? email.trim() : (field === 'playername' ? formData.playername.trim() : formData.gamertag.trim());
        if (fieldValue && !status.checking && !status.taken && field !== 'email') {
            return <small style={{ color: '#28a745', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>✅ Disponível</small>;
        }
        return null;
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) return alert("Aceite os termos para continuar.");
        setLoading(true);
        setError('');
        try {
            const playername = formData.playername.trim();
            const gamertagTrimmed = formData.gamertag.trim();
            const emailTrimmed = email.trim();

            // 1. Verificar se o Playername já existe
            const { data: existingUser, error: checkError } = await supabaseClient
                .from('profiles')
                .select('username')
                .eq('username', playername)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existingUser) {
                throw new Error("Este nome de usuário já está em uso. Escolha outro.");
            }

            // 2. Verificar se a Gamertag já existe
            const { data: existingGamertag, error: gamertagError } = await supabaseClient
                .from('registrations')
                .select('gamertag')
                .eq('gamertag', gamertagTrimmed)
                .maybeSingle();

            if (gamertagError) throw gamertagError;
            if (existingGamertag) {
                throw new Error("Esta Gamertag/PSN ID já está em uso. Escolha outra.");
            }

            // 3. Tentar o cadastro (O Supabase Auth já valida e-mail duplicado)
            const signUpMetadata = {
                playername: playername,
                playerName: playername,
                teamname: formData.teamname,
                teamName: formData.teamname,
                platform: formData.platform,
                gamertag: gamertagTrimmed
            };

            if (!signUpMetadata.playername || !signUpMetadata.gamertag) {
                throw new Error("Por favor, preencha todos os campos do jogador.");
            }

            const { data, error: authError } = await supabaseClient.auth.signUp({ 
                email: emailTrimmed, 
                password: pass,
                options: { 
                    data: signUpMetadata,
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (authError) {
                if (authError.message.includes("User already registered") || authError.status === 422) {
                    throw new Error("Este e-mail já está cadastrado em nossa base.");
                }
                throw authError;
            }

            // Técnica para detectar usuário já existente mesmo com proteção de enumeração ligada
            if (data?.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error("Este e-mail já está cadastrado em nossa base.");
            }

            if (data?.user && !data?.session) {
                onStepVerify(emailTrimmed);
            }
        } catch (err) {
            setError(translateAuthError(err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="container section">
            <div className="form-container">
                <form onSubmit={handleSignUp} className="card" style={{ maxWidth: '450px', margin: '0 auto', padding: '25px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '25px', color: 'var(--primary-color)' }}>Inscrição e Conta</h2>
                    {error && <p style={{ color: '#ff4444', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{error}</p>}
                    
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label>E-mail</label>
                        <input type="email" value={email} onChange={e => handleEmailChange(e.target.value)} required style={{ width: '100%' }} />
                        <FieldIndicator field="email" />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label>Senha</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={pass} 
                                onChange={(e) => setPass(e.target.value)} 
                                required 
                                style={{ width: '100%', paddingRight: '40px' }}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex' }}
                            >
                                <img 
                                    src="https://cdn-icons-png.flaticon.com/128/158/158746.png" 
                                    alt="Olho" 
                                    className="eye-icon"
                                    style={{ width: '20px', opacity: showPassword ? '1' : '0.5' }} 
                                />
                            </button>
                        </div>
                    </div>

                    <div className="form-group" style={{ textAlign: 'center', marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img src={getTeamLogo(formData.teamname)} alt="Escudo" style={{ width: '60px', marginBottom: '10px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '15px', marginTop: '-5px' }}>{formData.gamertag || 'Seu Nick'}</div>
                        <label style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>Escolha seu Time</label>
                        <select value={formData.teamname} onChange={e => setFormData({...formData, teamname: e.target.value})} required style={{ width: '100%' }}>
                            <optgroup label="Espanha">
                                <option value="Real Madrid">Real Madrid</option>
                                <option value="Barcelona">Barcelona</option>
                                <option value="Atlético de Madrid">Atlético de Madrid</option>
                                <option value="Sevilla">Sevilla</option>
                                <option value="Real Sociedad">Real Sociedad</option>
                                <option value="Villarreal">Villarreal</option>
                                <option value="Girona">Girona</option>
                            </optgroup>
                            <optgroup label="Inglaterra">
                                <option value="Manchester City">Manchester City</option>
                                <option value="Arsenal">Arsenal</option>
                                <option value="Liverpool">Liverpool</option>
                                <option value="Manchester United">Manchester United</option>
                                <option value="Chelsea">Chelsea</option>
                                <option value="Tottenham">Tottenham</option>
                                <option value="Aston Villa">Aston Villa</option>
                                <option value="Newcastle United">Newcastle United</option>
                            </optgroup>
                            <optgroup label="Itália">
                                <option value="Inter de Milão">Inter de Milão</option>
                                <option value="AC Milan">AC Milan</option>
                                <option value="Juventus">Juventus</option>
                                <option value="Napoli">Napoli</option>
                                <option value="AS Roma">AS Roma</option>
                                <option value="Atalanta">Atalanta</option>
                            </optgroup>
                            <optgroup label="Alemanha">
                                <option value="Bayern de Munique">Bayern de Munique</option>
                                <option value="Borussia Dortmund">Borussia Dortmund</option>
                                <option value="Bayer Leverkusen">Bayer Leverkusen</option>
                                <option value="RB Leipzig">RB Leipzig</option>
                            </optgroup>
                            <optgroup label="França">
                                <option value="PSG">PSG</option>
                                <option value="Marseille">Marseille</option>
                                <option value="Monaco">Monaco</option>
                                <option value="Lille">Lille</option>
                            </optgroup>
                            <optgroup label="Outras Ligas">
                                <option value="Benfica">Benfica (Portugal)</option>
                                <option value="FC Porto">FC Porto (Portugal)</option>
                                <option value="Sporting CP">Sporting CP (Portugal)</option>
                                <option value="Ajax">Ajax (Holanda)</option>
                                <option value="PSV Eindhoven">PSV Eindhoven (Holanda)</option>
                                <option value="Boca Juniors">Boca Juniors (Argentina)</option>
                                <option value="River Plate">River Plate (Argentina)</option>
                                <option value="Inter Miami">Inter Miami (EUA)</option>
                                <option value="Al-Nassr">Al-Nassr (Arábia)</option>
                                <option value="Al-Hilal">Al-Hilal (Arábia)</option>
                            </optgroup>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label>Nome Completo do Jogador</label>
                        <input 
                            type="text" 
                            value={formData.playername} 
                            onChange={e => handlePlayernameChange(e.target.value)} 
                            required 
                            style={{ 
                                width: '100%',
                                borderColor: fieldStatus.playername.taken ? '#ff4444' : undefined 
                            }}
                        />
                        <FieldIndicator field="playername" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                            <input 
                                type="text" 
                                value={formData.gamertag} 
                                onChange={e => handleGamertagChange(e.target.value)} 
                                placeholder="Ex: Player_123" 
                                required 
                                style={{ 
                                    borderColor: fieldStatus.gamertag.taken ? '#ff4444' : undefined 
                                }}
                            />
                            <FieldIndicator field="gamertag" />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '20px', textAlign: 'left' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px', display: 'block', fontWeight: '600' }}>Regulamento da Gangster Cup</label>
                        <div 
                            ref={termsRef}
                            onScroll={handleScroll}
                            className="terms-box" 
                            style={{ 
                                maxHeight: '120px', 
                                overflowY: 'auto', 
                                fontSize: '0.75rem', 
                                padding: '12px', 
                                background: 'var(--bg-input)', 
                                borderRadius: '8px',
                                border: hasRead ? '1px solid #28a745' : '1px solid var(--border-color)',
                                transition: 'all 0.3s ease',
                                color: 'var(--text-muted)',
                                lineHeight: '1.5'
                            }}
                        >
                            <p style={{ marginBottom: '10px' }}><strong>1. Tratamento de Dados (LGPD):</strong> Ao se inscrever, você consente com a coleta de seu e-mail, nome e gamertag para fins exclusivos de gestão do torneio, conforme a Lei 13.709/2018.</p>
                            <p style={{ marginBottom: '10px' }}><strong>2. Dados Públicos:</strong> Você está ciente de que seu Time e Gamertag serão exibidos publicamente nas tabelas de classificação e resultados.</p>
                            <p style={{ marginBottom: '10px' }}><strong>3. Transmissões:</strong> Você autoriza o uso de sua imagem (gameplay) em transmissões oficiais nas plataformas Twitch/YouTube.</p>
                            <p style={{ marginBottom: '10px' }}><strong>4. Seus Direitos:</strong> Você pode, a qualquer momento, retificar seus dados no painel de perfil ou solicitar a exclusão de sua conta entrando em contato com a organização.</p>
                            <p style={{ marginBottom: '10px' }}><strong>5. Fair Play:</strong> Ofensas ou condutas tóxicas resultarão em banimento e exclusão dos dados da competição.</p>
                            <p><strong>6. Segurança:</strong> Utilizamos o Supabase para armazenamento seguro e criptografado de suas credenciais.</p>
                        </div>
                        
                        <div style={{ marginTop: '12px' }}>
                            <label 
                                className="checkbox-label" 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    opacity: hasRead ? 1 : 0.5, 
                                    cursor: hasRead ? 'pointer' : 'not-allowed',
                                    userSelect: 'none',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={acceptedTerms} 
                                    onChange={e => setAcceptedTerms(e.target.checked)} 
                                    disabled={!hasRead}
                                    required 
                                    style={{ width: '18px', height: '18px', cursor: hasRead ? 'pointer' : 'not-allowed', margin: 0 }}
                                />
                                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                    Li e concordo com o regulamento
                                </span>
                            </label>
                            {!hasRead && (
                                <small style={{ color: 'var(--primary-color)', fontSize: '0.75rem', display: 'block', marginTop: '8px', fontWeight: 'bold' }}>
                                    ⚠️ Role o texto acima até o final para habilitar o aceite.
                                </small>
                            )}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ width: '100%', marginTop: '20px' }} 
                        disabled={loading || fieldStatus.playername.taken || fieldStatus.gamertag.taken || fieldStatus.playername.checking || fieldStatus.gamertag.checking}
                    >
                        {loading ? 'Processando...' : 'Finalizar Inscrição'}
                    </button>
                    {(fieldStatus.playername.taken || fieldStatus.gamertag.taken) && (
                        <p style={{ color: '#ff4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>
                            ⚠️ Corrija os campos destacados em vermelho antes de continuar.
                        </p>
                    )}
                </form>
            </div>
        </section>
    );
}

export default SignUp;