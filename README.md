# Campeonato EA FC 26 - Gangster Cup

Aplicação React para gerenciar um campeonato de EA FC 26, incluindo inscrições, sorteio de partidas e moderação.

## Arquivos incluídos
- `index.html` — página principal do campeonato
- `styles.css` — estilos responsivos
- `src/main.jsx` — Lógica principal da aplicação React, componentes e comunicação com o Supabase.
- `.env` — Variáveis de ambiente para credenciais sensíveis (ex: chaves do Supabase).

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

## Moderação
Moderação controlada pelo Supabase mediante ao IP do admin
Cargos adicionados(Developer, Admin, Moderador)
Developer: controla tudo
Admin: pode realizar sorteios e cuidar dos placares
Moderator: cuida apenas dos placares

## Link do vercel
[Vercel](https://site-campeonato-de-fifa-be4j.vercel.app/) (Hospedagem do site)

## Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com o seguinte formato, substituindo pelos seus valores reais:
```
VITE_SUPABASE_URL="SUA_URL_DO_SUPABASE"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_DO_SUPABASE"
```
## Preview
Site: ![Tela principal](/fotos/image.png)
Tela de manutenção: ![Tela de manutenção](/fotos/Desktop%20Screenshot%202026.05.14%20-%2015.10.18.17.png)   



Site desenvolvido para testar meus conhecimentos e praticar, mas futuramente será usado para um campeonato entre amigos!
