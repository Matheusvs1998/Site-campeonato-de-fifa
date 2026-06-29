export const calculateStandings = (matches) => {
    const standings = {};
    matches.forEach(m => {
        if (m.stage.startsWith('Fase de Grupos') && m.group_name) {
            if (!standings[m.group_name]) standings[m.group_name] = {};

            [m.p1, m.p2].forEach(t => {
                if (!standings[m.group_name][t]) {
                    standings[m.group_name][t] = { fullName: t, pts: 0, goalsFor: 0, goalsAgainst: 0 };
                }
            });

            if (m.status === 'Finalizado') {
                const s1 = Number(m.score1) || 0;
                const s2 = Number(m.score2) || 0;
                const p1 = standings[m.group_name][m.p1];
                const p2 = standings[m.group_name][m.p2];

                if (p1 && p2) {
                    p1.goalsFor += s1;
                    p1.goalsAgainst += s2;
                    p2.goalsFor += s2;
                    p2.goalsAgainst += s1;

                    if (s1 > s2) p1.pts += 3;
                    else if (s2 > s1) p2.pts += 3;
                    else {
                        p1.pts += 1;
                        p2.pts += 1;
                    }
                }
            }
        }
    });
    return standings;
};

export const sortGroupTeams = (teams, matches) => {
    return [...teams].sort((a, b) => {
        // 1. Pontos
        if (b.pts !== a.pts) return b.pts - a.pts;

        // 2. Confronto Direto (Pontos ganhos nos jogos entre os times empatados)
        const h2hMatches = matches.filter(m => 
            m.status === 'Finalizado' &&
            ((m.p1 === a.fullName && m.p2 === b.fullName) || (m.p1 === b.fullName && m.p2 === a.fullName))
        );

        let aH2HPts = 0;
        let bH2HPts = 0;
        h2hMatches.forEach(m => {
            const s1 = Number(m.score1) || 0;
            const s2 = Number(m.score2) || 0;
            if (m.p1 === a.fullName) {
                if (s1 > s2) aH2HPts += 3;
                else if (s2 > s1) bH2HPts += 3;
                else { aH2HPts += 1; bH2HPts += 1; }
            } else {
                if (s1 > s2) bH2HPts += 3;
                else if (s2 > s1) aH2HPts += 3;
                else { aH2HPts += 1; bH2HPts += 1; }
            }
        });
        if (aH2HPts !== bH2HPts) return bH2HPts - aH2HPts;

        // 3. Saldo de Gols Geral
        const aSG = a.goalsFor - a.goalsAgainst;
        const bSG = b.goalsFor - b.goalsAgainst;
        if (bSG !== aSG) return bSG - aSG;

        // 4. Gols Pró Geral
        return b.goalsFor - a.goalsFor;
    });
};

export const extractGamertag = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return '';
    const match = fullName.match(/\(([^)]+)\)/);
    return match ? match[1].split(' - ')[0] : '';
};

export const extractPlatform = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return '';
    const match = fullName.match(/\(([^)]+)\)/);
    if (match) {
        const parts = match[1].split(' - ');
        return parts.length > 1 ? parts[1].toLowerCase() : '';
    }
    return '';
};

export const translateAuthError = (msg) => {
    if (typeof msg !== 'string') return 'Erro inesperado.';
    if (msg.includes('Password should be at least')) {
        const digits = msg.match(/\d+/);
        return `A senha deve ter pelo menos ${digits ? digits[0] : '6'} caracteres.`;
    }
    if (msg.includes('Password should contain at least one character of each')) {
        return 'A senha deve conter pelo menos um caractere de cada: letras minúsculas, maiúsculas, números e símbolos.';
    }
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha inválidos.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado. Verifique sua caixa de entrada ou tente reenviar o código.';
    if (msg.includes('Email not confirmed')) return 'E-mail não confirmado. Verifique seu código.';
    if (msg.includes('Token has expired') || msg.includes('Invalid OTP')) return 'Código inválido ou expirado.';
    if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Limite de e-mails atingido (máx. 3 por hora no plano gratuito). Tente novamente mais tarde.';
    if (msg.includes('Database error saving new user')) return 'Erro interno ao salvar dados. Verifique os logs do banco de dados.';
    if (msg.includes('Signup disabled')) return 'O cadastro de novos usuários está desativado no painel do Supabase.';
    
    return msg;
};

export const calculatePlayerStats = (gamertag, matches) => {
    const playerMatches = matches.filter(m => 
        m.status === 'Finalizado' && 
        (extractGamertag(m.p1) === gamertag || extractGamertag(m.p2) === gamertag)
    );

    let stats = {
        total: playerMatches.length,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        form: [] // Last 5 results
    };

    playerMatches.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));

    playerMatches.forEach((m, index) => {
        const isP1 = extractGamertag(m.p1) === gamertag;
        const sFor = isP1 ? m.score1 : m.score2;
        const sAgainst = isP1 ? m.score2 : m.score1;

        stats.goalsFor += sFor;
        stats.goalsAgainst += sAgainst;

        let result = '';
        if (sFor > sAgainst) { stats.wins++; result = 'V'; }
        else if (sFor === sAgainst) { stats.draws++; result = 'E'; }
        else { stats.losses++; result = 'D'; }

        if (index < 5) stats.form.unshift(result);
    });

    stats.points = (stats.wins * 3) + stats.draws;
    stats.winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;
    stats.avgGoals = stats.total > 0 ? (stats.goalsFor / stats.total).toFixed(2) : 0;

    return stats;
};

export const getTopStats = (standings) => {
    let topAttack = { val: -1, teams: [] };
    let topDefense = { val: 999, teams: [] };

    Object.values(standings).forEach(group => {
        Object.values(group).forEach(team => {
            if (team.goalsFor > topAttack.val) {
                topAttack = { val: team.goalsFor, teams: [team.fullName] };
            } else if (team.goalsFor === topAttack.val && team.goalsFor > 0) {
                topAttack.teams.push(team.fullName);
            }

            if (team.goalsAgainst < topDefense.val) {
                topDefense = { val: team.goalsAgainst, teams: [team.fullName] };
            } else if (team.goalsAgainst === topDefense.val) {
                topDefense.teams.push(team.fullName);
            }
        });
    });

    return { topAttack, topDefense };
};

export const calculateTopScorers = (matches) => {
    const scorers = {};
    matches.forEach(m => {
        if (m.scorers && Array.isArray(m.scorers)) {
            m.scorers.forEach(s => {
                if (!scorers[s.name]) scorers[s.name] = { name: s.name, goals: 0 };
                scorers[s.name].goals += 1;
            });
        }
    });
    return Object.values(scorers).sort((a, b) => b.goals - a.goals);
};