export const calculateStandings = (matches) => {
    const standings = {};
    matches.forEach(m => {
        if (m.stage === 'Fase de Grupos' && m.group_name) {
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