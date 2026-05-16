import React, { useState } from 'react';
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
                        <label>Escolha seu Time</label>
                        <select value={formData.teamname} onChange={e => setFormData({...formData, teamname: e.target.value})} required>
                            <optgroup label="Espanha">
                                <option value="Real Madrid">Real Madrid</option>
                                <option value="Barcelona">Barcelona</option>
                                <option value="Atlético de Madrid">Atlético de Madrid</option>
                            </optgroup>
                            <optgroup label="Inglaterra">
                                <option value="Manchester City">Manchester City</option>
                                <option value="Arsenal">Arsenal</option>
                                <option value="Liverpool">Liverpool</option>
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

                    <div className="form-group" style={{ marginTop: '15px' }}>
                        <div className="terms-box" style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '0.75rem', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                            Ao criar esta conta, você concorda com o regulamento do campeonato Gangster Cup, autoriza o uso de sua imagem/gameplay em transmissões e compromete-se com o fair play.
                        </div>
                        <label className="checkbox-label" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required />
                            <span style={{ fontSize: '0.85rem' }}>Li e concordo com os termos</span>
                        </label>
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