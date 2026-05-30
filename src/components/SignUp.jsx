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

    const handleScroll = () => {
        const div = termsRef.current;
        if (div) {
            // Verifica se chegou ao fim da rolagem com uma margem de erro de 5px
            const isBottom = div.scrollHeight - div.scrollTop <= div.clientHeight + 5;
            if (isBottom) setHasRead(true);
        }
    };

    useEffect(() => {
        if (termsRef.current && termsRef.current.scrollHeight <= termsRef.current.clientHeight) {
            setHasRead(true);
        }
    }, []);

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) return alert("Aceite os termos para continuar.");
        setLoading(true);
        setError('');
        try {
            const signUpMetadata = {
                playername: formData.playername.trim(),
                playerName: formData.playername.trim(),
                teamname: formData.teamname,
                teamName: formData.teamname,
                platform: formData.platform,
                gamertag: formData.gamertag.trim()
            };

            if (!signUpMetadata.playername || !signUpMetadata.gamertag) {
                throw new Error("Por favor, preencha todos os campos do jogador.");
            }

            const { data, error: authError } = await supabaseClient.auth.signUp({ 
                email, 
                password: pass,
                options: { 
                    data: signUpMetadata,
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (authError) {
                console.error("Erro completo do Supabase Auth:", authError);
                throw authError;
            }

            if (data?.user && !data?.session) {
                onStepVerify(email);
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
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
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
                                <img src="https://cdn-icons-png.flaticon.com/128/158/158746.png" alt="Olho" style={{ width: '20px', opacity: showPassword ? '1' : '0.3' }} />
                            </button>
                        </div>
                    </div>

                    <div className="form-group" style={{ textAlign: 'center', marginTop: '10px' }}>
                        <img src={getTeamLogo(formData.teamname)} alt="Escudo" style={{ width: '60px', marginBottom: '10px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '10px', marginTop: '-5px' }}>{formData.gamertag || 'Seu Nick'}</div>
                        <label>Escolha seu Time</label>
                        <select value={formData.teamname} onChange={e => setFormData({...formData, teamname: e.target.value})} required>
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
                        <input type="text" value={formData.playername} onChange={e => setFormData({...formData, playername: e.target.value})} required />
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
                            <input type="text" value={formData.gamertag} onChange={e => setFormData({...formData, gamertag: e.target.value})} placeholder="Ex: Player_123" required />
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
                                background: 'rgba(0,0,0,0.2)', 
                                borderRadius: '8px',
                                border: hasRead ? '1px solid #28a745' : '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease',
                                color: '#eee',
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
                                    userSelect: 'none'
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

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
                        {loading ? 'Processando...' : 'Finalizar Inscrição'}
                    </button>
                </form>
            </div>
        </section>
    );
}

export default SignUp;