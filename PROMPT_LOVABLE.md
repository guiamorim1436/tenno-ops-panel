# 🚀 Prompt Mestre para o Lovable: Sistema Tenno Ops (Painel Anti-Caos)

Copie e cole o prompt abaixo diretamente no **Lovable** para criar ou atualizar o aplicativo da TENNO em segundos:

---

```markdown
Crie um aplicativo web responsivo e elegante chamado "TENNO Ops - Fila Única & Timer Mono-Tarefa", com tema escuro profissional (dark mode inspirado em Vercel/Linear), usando React, Tailwind CSS, Lucide Icons e Supabase.

O objetivo do app é acabar com a multitarefa e o caos operacional em uma agência de automação composta por Guilherme (Líder Técnico) e Caio (Assistente Operacional), atendendo mais de 30-40 grupos de WhatsApp (com foco na Dr360).

### 1. Barra de Foco Superior (Header Fixo)
- Seletor de Perfil Ativo no topo direito: Alternar entre [ 👤 Guilherme ] e [ 👤 Caio ].
- Caixa de Tarefa Ativa em destaque no centro da barra:
  - Se houver tarefa rodando: exibe o código do ticket (#012), nome do cliente, título da demanda, um cronômetro digital ao vivo (ex: `00:41:19` em verde neon) e botões rápidos: [ ⏸️ Pausar ] e [ ✅ Concluir ].
  - Se nenhuma tarefa estiver rodando: exibe aviso sutil "Nenhuma tarefa em execução. Escolha um card e clique em Iniciar para ativar o foco mono-tarefa."
  - Alerta de segurança: se o timer passar de 3 horas ininterruptas, toca um alerta sonoro e exibe modal de confirmação.

### 2. Ações Rápidas do Topo
- Botão "+ Nova Demanda Rápida" (abre modal limpo com Cliente, Título, Descrição, Prioridade: Urgente 4h / Normal 24h / Baixa 72h, e Atribuir para: Caio ou Guilherme).
- Alternador de Visualização: [ 📋 Fila de Execução ] e [ 📊 Telemetria Dr360 & Horas ].

### 3. Fila de Execução (Quadro Ágil com 4 Colunas)
- **Coluna 1: Pendentes de Aprovação (Inbox):**
  - Cards de demandas que entraram dos grupos.
  - Cada card tem: Nome do cliente, resumo do pedido, prioridade sugerida.
  - Botão de 1 clique: [ ✅ Aprovar Demanda ] (calcula automaticamente a data limite de SLA útil comercial 09h-18h e move para a fila do responsável).
- **Coluna 2: Fila do Caio (Implantações & Suporte N1):**
  - Cards ordenados por urgência de SLA.
  - Badge de SLA com relógio regressivo (ex: "Resta 5h úteis", fica vermelho se faltar menos de 4h).
  - Botão [ ▶️ Iniciar (Play) ]: Ao clicar, pausa automaticamente qualquer outra tarefa aberta do Caio e liga o cronômetro desta.
  - Botão [ ⚠️ Escalar para Guilherme ]: Abre modal rápido pedindo 1 frase ("Onde você travou?"). Ao confirmar, o card migra com prioridade máxima para a coluna do Guilherme.
- **Coluna 3: Fila do Guilherme (Bugs Complexos & Arquitetura):**
  - Mesma mecânica de Play/Pausa mono-tarefa.
  - Se o card veio escalado pelo Caio, exibe badge chamativo [ 🚨 ESCALADO POR CAIO ] e o motivo do bloqueio em destaque.
- **Coluna 4: Concluídos Hoje:**
  - Cards finalizados com o tempo total acumulado em minutos/horas (ex: "⏱️ 1h 45m gastos").

### 4. Funcionalidade Exclusiva: Gerador de Resposta WhatsApp
- Em qualquer card aprovado, incluir botão [ 💬 Copiar p/ WhatsApp ].
- Ao clicar, copia para o clipboard uma mensagem pronta e elegante para colar no grupo do cliente:
  "Olá [Nome do Cliente]! 👋 Sua solicitação foi registrada com sucesso sob o protocolo #[ID]:
  📌 *Demanda:* [Título]
  ⏳ *Previsão de Entrega:* [Data formatada, ex: Quinta-feira até as 17h]
  👨‍💻 *Responsável:* [Nome do Responsável]
  Qualquer dúvida avisamos por aqui!"

### 5. Aba de Telemetria Dr360 & Horas (Arma de Renegociação)
- Tabela analítica agrupando todas as demandas por cliente/clínica:
  - Colunas: Cliente/Clínica, Total de Chamados no Mês, Horas Totais Gastas (horas decimais e hh:mm), Mensalidade Paga (R$), Custo da Hora Efetiva (R$/hora).
  - Destaque em vermelho para clínicas da Dr360 que estouraram mais de 3 horas no mês.
  - Card de resumo no topo: "Dr360 Consumo Geral: 112h gastas no mês por R$ 4.000,00 -> Você está recebendo R$ 35,71 por hora técnica!".
  - Botão [ 📥 Exportar Relatório PDF / CSV ] para levar na reunião de renegociação.

### 6. Banco de Dados e Integração Supabase
- Conectar com as tabelas: `tenno_clients`, `tenno_team_members`, `tenno_tickets`, `tenno_time_logs` e `tenno_escalations`.
- Implementar as RPCs: `start_task_timer`, `pause_task_timer`, `complete_task` e `escalate_task_to_guilherme`.
- Atualizações em tempo real (Supabase Realtime) para que Guilherme e Caio vejam os cards e timers sincronizados instantaneamente no escritório.
```
