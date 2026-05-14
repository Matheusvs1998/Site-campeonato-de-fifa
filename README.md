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
- Supabase (Banco de dados e persistência)
- CSS3 com variáveis modernas

## Moderação
Moderação controlada pelo Supabase mediante ao IP do admin.

## Link do vercel
Vercel: site-campeonato-de-fifa-be4j.vercel.app

## Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com o seguinte formato, substituindo pelos seus valores reais:
```
VITE_SUPABASE_URL="SUA_URL_DO_SUPABASE"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_DO_SUPABASE"
```
## Prints
Site: ![Site aberto](/fotos/image.png)
Banco de dados: ![Supabase](/fotos/image-1.png)
Vercel: ![Vercel](/fotos/image-2.png)


Site desenvolvido para testar meus conhecimentos e praticar, mas futuramente será usado para 
