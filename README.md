# Campeonato EA FC 26 - Gangster Cup

Aplicação React para gerenciar um campeonato de EA FC 26, incluindo inscrições, sorteio de partidas e moderação.

---

## Arquivos incluídos
- `index.html` — página principal do campeonato
- `styles.css` — estilos responsivos
- `src/main.jsx` — Lógica principal da aplicação React, componentes e comunicação com o Supabase.
- `.env` — Variáveis de ambiente para credenciais sensíveis (ex: chaves do Supabase).

---

## Como usar
1.  **Configuração:**
    *   Crie um arquivo `.env` na raiz do projeto com suas chaves do Supabase
    *   Instale as dependências: `npm install`
2.  **Desenvolvimento:** `npm run dev`
3.  **Build para Produção:** `npm run build` (os arquivos gerados estarão na pasta `dist/`)


## Tecnologias
- [React](https://react.dev/) (Interface do Usuário)
- [Vite](https://vitejs.dev/) (Ferramenta de Build e Desenvolvimento)
- [Supabase](https://supabase.com/) (Banco de dados e persistência com realtime ativado)
- CSS3 com variáveis modernas

## 🛡️ Moderação e Controle de Acesso
O gerenciamento do campeonato possui um sistema de níveis de acesso integrado ao Supabase, garantindo que cada colaborador tenha as permissões adequadas:

*   **Segurança:** Autenticação e controle administrativo (validado via IP/Auth).
*   **Hierarquia de Cargos:**
    *   **Developer:** Possui controle total sobre o sistema, banco de dados e configurações globais.
    *   **Admin:** Responsável pela organização do torneio. Pode realizar o sorteio das chaves e gerenciar placares.
    *   **Moderador:** Focado na operação das partidas, com permissão para atualizar placares em tempo real.

## Link do vercel
[Vercel](https://site-campeonato-de-fifa-be4j.vercel.app/) (Hospedagem do site)

## Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com o seguinte formato, substituindo pelos seus valores reais:
```
VITE_SUPABASE_URL="SUA_URL_DO_SUPABASE"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_DO_SUPABASE"
```
## Preview
Site: ![Tela principal](/public/tela-incial.png)
Tela de manutenção: ![Tela de manutenção](/public/tela-de-manutencao.png)   



Autoria e desebvolvimento: Matheus Vasconcelos 
