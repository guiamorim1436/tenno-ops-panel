import React, { useState } from 'react';
import { FileText, Download, Copy, Check, Layers, FolderDown } from 'lucide-react';
import { generateClientMarkdown, generateMasterMarkdown } from '../../api/export-markdown';
import { Ticket } from '../types';

interface MarkdownExportTabProps {
  tickets: Ticket[];
}

export const MarkdownExportTab: React.FC<MarkdownExportTabProps> = ({ tickets }) => {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // Lista de clientes únicos
  const clientsList = Array.from(new Set(tickets.map(t => t.client_name || 'Cliente Geral'))).sort();

  // Gera o markdown atual
  const currentMarkdown = selectedClient === 'all'
    ? generateMasterMarkdown(tickets)
    : generateClientMarkdown(
        selectedClient,
        tickets.filter(t => (t.client_name || '').toLowerCase() === selectedClient.toLowerCase())
      );

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCurrent = () => {
    const filename = selectedClient === 'all'
      ? 'TENNO_OPS_MASTER_LOG.md'
      : `${selectedClient.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;

    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllClientsSeparately = () => {
    clientsList.forEach(client => {
      const clientTickets = tickets.filter(t => (t.client_name || '').toLowerCase() === client.toLowerCase());
      const content = generateClientMarkdown(client, clientTickets);
      const filename = `${client.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;

      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Banner Explicativo */}
      <div className="p-5 rounded-2xl bg-[#0f1523] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">Exportação para Obsidian (Markdown Vivo)</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Todas as tarefas criadas ou atualizadas pelo WhatsApp, painel ou IA são sincronizadas em tempo real com a estrutura Markdown abaixo. 
            Você pode baixar o <strong>Master Log</strong> completo ou arquivos individuais por cliente já com YAML frontmatter padrão do Obsidian da TENNO.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadAllClientsSeparately}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition border border-slate-700 shadow-sm"
            title="Baixar 1 arquivo .md para cada cliente"
          >
            <FolderDown className="w-4 h-4 text-purple-400" />
            <span>Baixar Todos por Cliente ({clientsList.length})</span>
          </button>

          <button
            onClick={handleDownloadCurrent}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Baixar {selectedClient === 'all' ? 'Master Log (.MD)' : `${selectedClient} (.MD)`}</span>
          </button>
        </div>
      </div>

      {/* Controles de Seleção e Ações */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-400 shrink-0 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Visualizar Markdown de:
          </label>
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">📂 Master Log Geral (Todos os Clientes)</option>
            {clientsList.map(c => (
              <option key={c} value={c}>
                👤 {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-800"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Conteúdo MD'}</span>
        </button>
      </div>

      {/* Visualizador de Markdown */}
      <div className="bg-[#0a0d14] border border-slate-800 rounded-2xl p-5 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
        {currentMarkdown}
      </div>
    </div>
  );
};
