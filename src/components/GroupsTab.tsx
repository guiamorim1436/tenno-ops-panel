import React, { useState, useEffect } from 'react';
import { Users2, Search, Save, RefreshCw, MessageCircle, Copy, Check } from 'lucide-react';
import { GroupMapping } from '../types';

export const GroupsTab: React.FC = () => {
  const [groups, setGroups] = useState<GroupMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingJid, setSavingJid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedJid, setCopiedJid] = useState<string | null>(null);

  // Armazena as edições locais dos inputs de clientes
  const [clientNameInputs, setClientNameInputs] = useState<{ [jid: string]: string }>({});

  const fetchGroups = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/evolution-groups');
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
        // Inicializa inputs com os valores mapeados atuais
        const initialMap: { [jid: string]: string } = {};
        data.groups.forEach((g: GroupMapping) => {
          if (g.client_name) {
            initialMap[g.remote_jid] = g.client_name;
          }
        });
        setClientNameInputs(initialMap);
      }
    } catch (err: any) {
      setFeedback(`Erro ao carregar grupos: ${err.message || 'Falha na conexão'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSaveMapping = async (group: GroupMapping) => {
    const clientName = clientNameInputs[group.remote_jid]?.trim();
    if (!clientName) {
      alert('Por favor, informe o Nome do Cliente para vincular a este grupo.');
      return;
    }

    setSavingJid(group.remote_jid);
    try {
      const res = await fetch('/api/evolution-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remote_jid: group.remote_jid,
          group_name: group.group_name,
          client_name: clientName
        })
      });

      if (res.ok) {
        setGroups(prev =>
          prev.map(g =>
            g.remote_jid === group.remote_jid
              ? { ...g, client_name: clientName, is_mapped: true }
              : g
          )
        );
        setFeedback(`✓ Grupo "${group.group_name}" vinculado com sucesso ao cliente "${clientName}"!`);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar: ${errorData.error || 'Falha'}`);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSavingJid(null);
    }
  };

  const copyJid = (jid: string) => {
    navigator.clipboard.writeText(jid);
    setCopiedJid(jid);
    setTimeout(() => setCopiedJid(null), 2000);
  };

  const filteredGroups = groups.filter(g =>
    g.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.remote_jid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (clientNameInputs[g.remote_jid] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner Explicativo */}
      <div className="p-5 rounded-2xl bg-[#0f1523] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">Mapeamento de Grupos WhatsApp & Clientes</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Busca todos os grupos do seu WhatsApp através da Evolution API. Como um único cliente pode ter 2, 3 ou mais grupos (ex: filiais, grupos de suporte ou diferentes setores), você pode escrever o mesmo <strong>Nome do Cliente</strong> em vários grupos para que os tickets e métricas sejam consolidados automaticamente!
          </p>
        </div>

        <button
          onClick={fetchGroups}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition border border-slate-700 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Buscando...' : 'Sincronizar Grupos'}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Controles de Busca e Métricas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome do grupo, cliente ou JID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Total: <strong>{groups.length}</strong> grupos</span>
          <span>•</span>
          <span className="text-emerald-400">Mapeados: <strong>{groups.filter(g => g.is_mapped).length}</strong></span>
        </div>
      </div>

      {/* Lista de Grupos */}
      {loading && groups.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
          Buscando grupos da Evolution API...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-800/60">
          Nenhum grupo encontrado com o termo buscado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map(group => {
            const isSaving = savingJid === group.remote_jid;
            const currentInput = clientNameInputs[group.remote_jid] || '';
            const isModified = currentInput !== (group.client_name || '');

            return (
              <div
                key={group.remote_jid}
                className="p-4 rounded-2xl bg-[#0d121d] border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white line-clamp-1">{group.group_name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
                            {group.remote_jid}
                          </span>
                          <button
                            onClick={() => copyJid(group.remote_jid)}
                            className="text-slate-500 hover:text-slate-300"
                            title="Copiar Remote JID"
                          >
                            {copiedJid === group.remote_jid ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {group.is_mapped ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold shrink-0">
                        Vinculado
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shrink-0">
                        Sem Vínculo
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Nome do Cliente Associado:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Nome da Empresa, Cliente Alpha, etc."
                      value={currentInput}
                      onChange={e =>
                        setClientNameInputs(prev => ({
                          ...prev,
                          [group.remote_jid]: e.target.value
                        }))
                      }
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />

                    <button
                      onClick={() => handleSaveMapping(group)}
                      disabled={isSaving || !currentInput.trim()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        isModified
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
