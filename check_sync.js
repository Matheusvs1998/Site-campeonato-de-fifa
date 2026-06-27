import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkSync() {
    console.log("Checking DB sync...");
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: registrations } = await supabase.from('registrations').select('*');
    
    console.log(`Total Profiles: ${profiles?.length || 0}`);
    console.log(`Total Registrations: ${registrations?.length || 0}`);
    
    if (profiles && registrations) {
        const profileUsernames = profiles.map(p => p.username.toLowerCase());
        const registeredPlayers = registrations.map(r => r.playername.toLowerCase());
        
        const orphans = registrations.filter(r => !profileUsernames.includes(r.playername.toLowerCase()));
        const missingRegs = profiles.filter(p => p.role === 'player' && !registeredPlayers.includes(p.username.toLowerCase()));
        
        console.log("--- ORPHAN REGISTRATIONS (Inscritos sem Perfil) ---");
        console.log(orphans.length > 0 ? orphans.map(o => o.playername) : "None");
        
        console.log("--- PROFILES WITHOUT REGISTRATION (Jogadores sem Inscrição) ---");
        console.log(missingRegs.length > 0 ? missingRegs.map(m => m.username) : "None");
    }
}

checkSync();
