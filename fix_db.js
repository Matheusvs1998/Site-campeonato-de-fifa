import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) process.exit(1);

const supabase = createClient(url, key);

async function fixDB() {
    console.log("Fixing DB sync...");
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: registrations } = await supabase.from('registrations').select('*');
    
    const profileUsernames = profiles.map(p => p.username.toLowerCase());
    const registeredPlayers = registrations.map(r => r.playername.toLowerCase());
    
    const orphans = registrations.filter(r => !profileUsernames.includes(r.playername.toLowerCase()));
    const missingRegs = profiles.filter(p => p.role === 'player' && !registeredPlayers.includes(p.username.toLowerCase()));
    
    // Deletar inscrições órfãs
    for (const orphan of orphans) {
        console.log(`Deletando inscrição órfã: ${orphan.playername}`);
        await supabase.from('registrations').delete().eq('id', orphan.id);
    }
    
    // Deletar perfis que não têm inscrição (provavelmente cadastros incompletos)
    for (const missing of missingRegs) {
        console.log(`Deletando perfil sem inscrição: ${missing.username}`);
        await supabase.rpc('delete_full_user_complete', { target_user_id: missing.id });
    }
    
    console.log("Sincronização concluída!");
}

fixDB();
