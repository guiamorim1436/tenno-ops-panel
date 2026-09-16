import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_supabase';

function formatSeconds(sec: number): string {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Gera Markdown de um Cliente específico com Frontmatter compatível com Obsidian
export function generateClientMarkdown(clientName: string, tickets: any[]): string {
  const nowStr = new Date().toISOString().split('T')[0];
  const totalSeconds = tickets.reduce((acc, t) => acc + (t.total_time_seconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(2);
  const completedCount = tickets.filter(t => t.status === 'completed').length;
  const pendingCount = tickets.filter(t => t.status !== 'completed').length;

  let md = `---
tipo: registro_operacional
cliente: "${clientName}"
data: ${nowStr}
origem: tenno_ops_panel
fonte_bruta: whatsapp_evolution
status: ativo
responsavel: "Equipe TENNO"
tags:
  - cliente
  - suporte
  - operacao
  - tenno_ops
---

# Registro Operacional: ${clientName}

> **Última sincronização:** ${new Date().toLocaleString('pt-BR')}  
> **Total de Demandas:** ${tickets.length} (${completedCount} concluídas, ${pendingCount} ativas)  
> **Consumo de Horas:** **${totalHours} horas** (${formatSeconds(totalSeconds)})

---

## 📊 Resumo Executivo
| Métrica | Valor |
| :--- | :--- |
| **Total de Chamados** | ${tickets.length} |
| **Demandas Concluídas** | ${completedCount} |
| **Demandas em Aberto / Fila** | ${pendingCount} |
| **Tempo Total Acumulado** | ${formatSeconds(totalSeconds)} (${totalHours}h) |

---

## 📌 Demandas Ativas & Fila de Trabalho

`;

  const activeTickets = tickets.filter(t => t.status !== 'completed');
  if (activeTickets.length === 0) {
    md += `*Nenhuma demanda ativa no momento.*\n\n`;
  } else {
    activeTickets.forEach(t => {
      const isPaused = t.status === 'paused';
      const statusBadge = isPaused 
        ? `🟡 **PAUSADA** (${t.pause_category || 'Aguardando'})` 
        : t.status === 'in_progress' 
        ? `🟢 **EM ANDAMENTO**` 
        : t.status === 'pending_approval' 
        ? `🟠 **INBOX / APROVAÇÃO**` 
        : `🔵 **NA FILA**`;

      md += `### [PROT-${t.ticket_code}] ${t.title}
- **Status:** ${statusBadge}
- **Prioridade:** ${t.priority.toUpperCase()} (SLA alvo: ${t.sla_hours_target}h)
- **Responsável:** ${t.assignee_name || 'A definir'}
- **Tempo Trabalhado:** ${formatSeconds(t.total_time_seconds)}
`;

      if (t.sla_deadline) {
        md += `- **Previsão SLA:** ${new Date(t.sla_deadline).toLocaleString('pt-BR')}\n`;
      }

      if (isPaused && t.pause_reason) {
        md += `- **Motivo da Pausa:** *"${t.pause_reason}"*\n`;
        md += `- **Próxima Ação Por Conta De:** **${(t.next_action_by || 'Cliente').toUpperCase()}**\n`;
      }

      if (t.description) {
        md += `\n> **Contexto / Descrição:**\n> ${t.description.replace(/\n/g, '\n> ')}\n`;
      }

      md += `\n---\n\n`;
    });
  }

  md += `## ✅ Histórico de Demandas Concluídas\n\n`;
  const completedTickets = tickets.filter(t => t.status === 'completed');
  if (completedTickets.length === 0) {
    md += `*Nenhuma demanda concluída ainda.*\n\n`;
  } else {
    completedTickets.forEach(t => {
      md += `- [x] **[PROT-${t.ticket_code}]** ${t.title} — *${formatSeconds(t.total_time_seconds)}* (Concluído em: ${t.completed_at ? new Date(t.completed_at).toLocaleDateString('pt-BR') : 'Hoje'})\n`;
    });
    md += `\n`;
  }

  return md;
}

// Gera o Arquivo Mestre Geral com Todos os Clientes
export function generateMasterMarkdown(tickets: any[]): string {
  const nowStr = new Date().toISOString().split('T')[0];
  const clientsMap = new Map<string, any[]>();

  tickets.forEach(t => {
    const client = t.client_name || 'Cliente Geral';
    const list = clientsMap.get(client) || [];
    list.push(t);
    clientsMap.set(client, list);
  });

  let md = `---
tipo: registro_mestre_operacional
data: ${nowStr}
origem: tenno_ops_panel
status: ativo
tags:
  - operacao
  - master_log
  - tenno_ops
---

# TENNO OPS — MASTER LOG OPERACIONAL

Este arquivo consolida todas as tarefas capturadas via WhatsApp, painel e IA, atualizado em tempo real.

> **Gerado em:** ${new Date().toLocaleString('pt-BR')}  
> **Total Geral de Demandas:** ${tickets.length}  
> **Clientes Ativos:** ${clientsMap.size}

---

## 📑 Índice por Cliente
`;

  Array.from(clientsMap.keys()).sort().forEach(c => {
    md += `- [${c}](#${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')})\n`;
  });

  md += `\n---\n\n`;

  Array.from(clientsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([client, clientTickets]) => {
    md += `\n# ${client}\n\n`;
    md += generateClientMarkdown(client, clientTickets).split('---')[2] || ''; // Extrai o corpo sem o frontmatter duplicado
    md += `\n\n==============================================================================\n\n`;
  });

  return md;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { data: tickets, error } = await supabase
      .from('tenno_tickets')
      .select('*')
      .order('ticket_code', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tickets para Markdown:', error);
      return res.status(500).json({ error: error.message });
    }

    const { client, format } = req.query;

    // Se solicitou um cliente específico
    if (client && typeof client === 'string') {
      const filtered = (tickets || []).filter(t => 
        (t.client_name || '').toLowerCase() === client.toLowerCase()
      );
      const mdContent = generateClientMarkdown(client, filtered);
      
      if (format === 'raw') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${client.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
        return res.status(200).send(mdContent);
      }

      return res.status(200).json({
        client,
        total_tickets: filtered.length,
        markdown: mdContent
      });
    }

    // Se solicitou exportação individual em lote (JSON com todos os clientes)
    if (format === 'bundle') {
      const clientsMap = new Map<string, any[]>();
      (tickets || []).forEach(t => {
        const c = t.client_name || 'Cliente Geral';
        const list = clientsMap.get(c) || [];
        list.push(t);
        clientsMap.set(c, list);
      });

      const clientFiles = Array.from(clientsMap.entries()).map(([c, list]) => ({
        client: c,
        filename: `${c.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`,
        content: generateClientMarkdown(c, list)
      }));

      const masterContent = generateMasterMarkdown(tickets || []);

      return res.status(200).json({
        success: true,
        total_clients: clientFiles.length,
        master_file: {
          filename: 'TENNO_OPS_MASTER_LOG.md',
          content: masterContent
        },
        client_files: clientFiles
      });
    }

    // Padrão: Retorna o Master Log completo
    const masterMd = generateMasterMarkdown(tickets || []);

    if (format === 'raw') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="TENNO_OPS_MASTER_LOG.md"');
      return res.status(200).send(masterMd);
    }

    return res.status(200).json({
      success: true,
      total_tickets: tickets?.length || 0,
      master_markdown: masterMd
    });

  } catch (error: any) {
    console.error('Erro em export-markdown:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
