import React, { useState, useRef, useEffect } from 'react';
import { supabaseClient } from '../supabase';
import { getTeamLogo } from '../teamLogos';
import { translateAuthError } from '../helpers';
import InviteEnvelope from './InviteEnvelope.jsx';
import CustomSelect from './CustomSelect';
import { teamOptions, platformOptions } from '../optionsData';
import GamertagBadge from './GamertagBadge';

function SignUp({ onStepVerify, onGoHome, onGoToLogin }) {
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
    const [sent, setSent] = useState(false);
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
                        message = 'Este nome de usuário já está em uso.';
                    }
                } else if (field === 'gamertag') {
                    const { data } = await supabaseClient
                        .from('registrations')
                        .select('gamertag')
                        .eq('gamertag', trimmed)
                        .maybeSingle();
                    if (data) {
                        taken = true;
                        message = 'Esta Gamertag/PSN ID já está em uso.';
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
            return <small className="env-field-status is-checking">Verificando disponibilidade...</small>;
        }
        if (status.taken) {
            return <small className="env-field-status is-taken">{status.message}</small>;
        }
        const fieldValue = field === 'email' ? email.trim() : (field === 'playername' ? formData.playername.trim() : formData.gamertag.trim());
        if (fieldValue && !status.checking && !status.taken && field !== 'email') {
            return <small className="env-field-status is-available">Disponível</small>;
        }
        return null;
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) return alert("Aceite os termos para continuar.");
        setLoading(true);
        setError('');
        try {
            if (!supabaseClient) {
                throw new Error("Serviço indisponível. Configure as credenciais do Supabase (.env).");
            }

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
                if (authError.message.includes("User already registered")) {
                    throw new Error("Este e-mail já está cadastrado em nossa base.");
                }
                throw authError;
            }

            // Técnica para detectar usuário já existente mesmo com proteção de enumeração ligada
            if (data?.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error("Este e-mail já está cadastrado em nossa base.");
            }

            if (data?.user && !data?.session) {
                // Confirmação visual transitória antes de trocar para a tela de verificação
                setSent(true);
                onStepVerify(emailTrimmed);
            }
        } catch (err) {
            setError(translateAuthError(err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <InviteEnvelope
            onGoHome={onGoHome}
            tall={true}
            eyebrow="Inscrição Oficial · 2026"
            title="Garanta sua vaga"
            subtitle="Preencha sua ficha de competidor para entrar na Gangster Cup."
        >
            <form onSubmit={handleSignUp} className="env-form">
                {/* E-mail */}
                <div className="env-field-group">
                    <label className="env-label">E-mail</label>
                    <input
                        type="email"
                        className="gc-field"
                        value={email}
                        onChange={e => handleEmailChange(e.target.value)}
                        required
                    />
                    <FieldIndicator field="email" />
                </div>

                {/* Senha */}
                <div className="env-field-group">
                    <div className="env-label-row">
                        <label className="env-label">Senha</label>
                        <button
                            type="button"
                            className="env-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className="gc-field"
                        value={pass}
                        onChange={e => setPass(e.target.value)}
                        required
                    />
                </div>

                {/* Time */}
                <div className="env-field-group">
                    <label className="env-label">Escolha seu Time</label>
                    <CustomSelect 
                        options={teamOptions}
                        value={formData.teamname}
                        onChange={(val) => setFormData({ ...formData, teamname: val })}
                        placeholder="Selecione um time..."
                        isTeam={true}
                    />
                    <div className="env-team-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={getTeamLogo(formData.teamname)} alt="Escudo" />
                        <GamertagBadge gamertag={formData.gamertag || 'Seu Nick'} platform={formData.platform} />
                    </div>
                </div>

                {/* Nome Completo */}
                <div className="env-field-group">
                    <label className="env-label">Nome Completo do Jogador</label>
                    <input
                        type="text"
                        className="gc-field"
                        value={formData.playername}
                        onChange={e => handlePlayernameChange(e.target.value)}
                        required
                        style={{ borderBottomColor: fieldStatus.playername.taken ? '#ff7782' : undefined }}
                    />
                    <FieldIndicator field="playername" />
                </div>

                {/* Plataforma */}
                <div className="env-field-group">
                    <label className="env-label">Plataforma</label>
                    <CustomSelect 
                        options={platformOptions}
                        value={formData.platform}
                        onChange={(val) => setFormData({ ...formData, platform: val })}
                        placeholder="Selecione..."
                        isPlatform={true}
                    />
                </div>

                {/* Gamertag */}
                <div className="env-field-group">
                    <label className="env-label">Gamertag / PSN ID</label>
                    <input
                        type="text"
                        className="gc-field"
                        value={formData.gamertag}
                        onChange={e => handleGamertagChange(e.target.value)}
                        placeholder="Ex: Player_123"
                        required
                        style={{ borderBottomColor: fieldStatus.gamertag.taken ? '#ff7782' : undefined }}
                    />
                    <FieldIndicator field="gamertag" />
                </div>

                {/* Regulamento */}
                <div className="env-field-group">
                    <label className="env-label">Regulamento da Gangster Cup</label>
                    <div
                        ref={termsRef}
                        onScroll={handleScroll}
                        className="env-terms-box"
                        style={{ borderColor: hasRead ? 'rgba(111,207,151,.5)' : undefined }}
                    >
                        <p style={{ marginBottom: '10px' }}><strong>1. Tratamento de Dados (LGPD):</strong> Ao se inscrever, você consente com a coleta de seu e-mail, nome e gamertag para fins exclusivos de gestão do torneio, conforme a Lei 13.709/2018.</p>
                        <p style={{ marginBottom: '10px' }}><strong>2. Dados Públicos:</strong> Você está ciente de que seu Time e Gamertag serão exibidos publicamente nas tabelas de classificação e resultados.</p>
                        <p style={{ marginBottom: '10px' }}><strong>3. Transmissões:</strong> Você autoriza o uso de sua imagem (gameplay) em transmissões oficiais nas plataformas Twitch/YouTube.</p>
                        <p style={{ marginBottom: '10px' }}><strong>4. Seus Direitos:</strong> Você pode, a qualquer momento, retificar seus dados no painel de perfil ou solicitar a exclusão de sua conta entrando em contato com a organização.</p>
                        <p style={{ marginBottom: '10px' }}><strong>5. Fair Play:</strong> Ofensas ou condutas tóxicas resultarão em banimento e exclusão dos dados da competição.</p>
                        <p><strong>6. Segurança:</strong> Utilizamos o Supabase para armazenamento seguro e criptografado de suas credenciais.</p>
                    </div>

                    <label
                        className="env-terms-accept"
                        style={{
                            opacity: hasRead ? 1 : 0.5,
                            cursor: hasRead ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={e => setAcceptedTerms(e.target.checked)}
                            disabled={!hasRead}
                            required
                        />
                        <span>Li e concordo com o regulamento</span>
                    </label>
                    {!hasRead && (
                        <small className="env-field-status is-checking" style={{ marginTop: '6px' }}>
                            Role o texto acima até o final para habilitar o aceite.
                        </small>
                    )}
                </div>

                {error && <p className="env-error">{error}</p>}

                <button
                    type="submit"
                    className="env-submit"
                    disabled={loading || fieldStatus.playername.taken || fieldStatus.gamertag.taken || fieldStatus.playername.checking || fieldStatus.gamertag.checking}
                >
                    {loading ? 'Processando...' : 'Finalizar Inscrição'}
                </button>

                {(fieldStatus.playername.taken || fieldStatus.gamertag.taken) && (
                    <p className="env-error">
                        Corrija os campos destacados em vermelho antes de continuar.
                    </p>
                )}

                {onGoToLogin && (
                    <button type="button" className="env-link" onClick={onGoToLogin}>
                        Já tem conta? Entrar
                    </button>
                )}
            </form>

            {sent && (
                <div className="env-success">
                    <div className="env-success-grain" aria-hidden="true"></div>
                    <div className="env-success-check">✓</div>
                    <div className="env-success-title">Inscrição enviada</div>
                    <div className="env-success-sub">Confirme seu e-mail para garantir sua vaga.</div>
                </div>
            )}
        </InviteEnvelope>
    );
}

export default SignUp;
