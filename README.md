# 🎛️ TENNO Ops — Painel de Fila Única, SLA & Timer Mono-Tarefa

Sistema Operacional desenhado especificamente para a rotina do **Guilherme** e do **Caio** na TENNO, eliminando o caos de múltiplos grupos de WhatsApp, impondo a execução mono-tarefa e fornecendo telemetria para gestão de rentabilidade de todos os clientes.

---

## ⚡ Como Rodar no Escritório Imediatamente

### Opção 1: Rodar Localmente no seu Computador
1. Abra o terminal na pasta `07 - Integrações e Código/tenno-ops-panel`
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abra no navegador: `http://localhost:5173`

---

### Opção 2: Subir Diretamente no Lovable (Sem programar nada)
1. Abra o [Lovable.dev](https://lovable.dev)
2. Crie um novo projeto
3. Abra o arquivo [PROMPT_LOVABLE.md](./PROMPT_LOVABLE.md), copie todo o conteúdo e cole no chat do Lovable.
4. O Lovable gerará toda a interface online em segundos com URL pública para você e o Caio usarem no celular e no desktop.

---

## 🗄️ Como Conectar ao Supabase
1. No seu dashboard do [Supabase](https://supabase.com), acesse o **SQL Editor**.
2. Abra o arquivo `../schema_tenno_ops.sql`, copie e execute o script.
3. Crie um arquivo `.env` nesta pasta com as suas credenciais:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```
*(Nota: O painel já possui armazenamento local automático via `localStorage`, então você já pode utilizá-lo hoje mesmo mesmo antes de conectar as chaves do Supabase!)*

---

## 🛡️ Regras de Ouro de Uso
1. **Mono-tarefa Obrigatória:** Ninguém trabalha em nada sem dar **Play** no card correspondente.
2. **Escalonamento sem Interrupção:** Se o Caio travar em um bug, clica em **"Escalar"**, escreve o motivo e parte para o próximo card. O Guilherme pega o ticket no tempo dele.
3. **Previsão no WhatsApp:** Ao aprovar uma demanda, use o botão **"WhatsApp"** para colar a mensagem de protocolo no grupo do cliente e cortar a ansiedade de cobrança.
