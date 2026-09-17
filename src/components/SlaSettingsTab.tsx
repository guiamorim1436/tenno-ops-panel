import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Save, Calendar, AlertTriangle, CheckCircle2, Send, MessageSquare } from 'lucide-react';
import { SlaSettings } from '../types';

export const SlaSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SlaSettings>({
    id: 'default',
    urgent_hours: 4,
    normal_hours: 24,
    low_hours: 72,
    work_start_hour: 9,
    work_end_hour: 18,
    work_days: '1,2,3,4,5',
    max_urgent_per_day: 2,
    max_normal_per_day: 4,
    max_low_per_day: 6,
    ical_url_guilherme: 'https://calendar.google.com/calendar/ical/guilherme.amorimcrm%40gmail.com/private-9ae6d607f38a10d5f7eaa414afc48a8a/basic.ics',
    ical_url_caio: '',
    daily_report_group_jid: '120363427677526608@g.us'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isTestingReport, setIsTestingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/sla-settings');
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            max_urgent_per_day: data.settings.max_urgent_per_day ?? 2,
            max_normal_per_day: data.settings.max_normal_per_day ?? 4,
            max_low_per_day: data.settings.max_low_per_day ?? 6
          }));
        }
      } catch (err) {
        console.warn('Usando valores locais de SLA:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/sla-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setFeedback('✓ Configurações de SLA e Limites Diários salvas com sucesso!');
        setTimeout(() => setFeedback(null), 4000);
      } else {
        alert('Erro ao salvar configurações.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestReport = async () => {
    setIsTestingReport(true);
    setReportFeedback(null);
    try {
      const res = await fetch('/api/daily-report?force=true', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.message_sent) {
        setReportFeedback(`✓ Relatório Diário consolidado disparado com sucesso para o grupo Relatórios Diários!`);
      } else {
        setReportFeedback(`⚠️ Relatório gerado, mas houve aviso no WhatsApp: ${data.error || 'Verifique o grupo'}`);
      }
    } catch (err: any) {
      setReportFeedback(`❌ Erro ao disparar relatório: ${err.message}`);
    } finally {
      setIsTestingReport(false);
      setTimeout(() => setReportFeedback(null), 6000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-slate-100">
      {/* Header Explicativo */}
      <div className="p-6 rounded-2xl bg-[#0f1523] border border-slate-800 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-white">Como Funciona o SLA da TENNO Ops</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            O SLA (Acordo de Nível de Serviço) calcula prazos <strong>estritamente dentro do horário comercial útil</strong>.
            Se um chamado urgente (4h) entrar na sexta-feira às 17h00, o sistema projeta a entrega para segunda-feira às 12h00, 
            respeitando o descanso e protegendo a operação de urgências falsas de fim de semana ou noite.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Painel de Horas por Prioridade */}
        <div className="p-6 rounded-2xl bg-[#0d121d] border border-slate-800 space-y-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Meta de Horas Úteis por Prioridade
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Urgente */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Prioridade Urgente
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Para quedas de sistema, bots parados ou webhooks fora do ar.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={settings.urgent_hours}
                  onChange={e => setSettings({ ...settings, urgent_hours: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white text-center focus:outline-none focus:border-rose-500"
                />
                <span className="text-xs text-slate-400 font-semibold">horas úteis</span>
              </div>
            </div>

            {/* Normal */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Prioridade Normal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Para ajustes em funis, novos campos do Kommo ou dúvidas de clientes.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.normal_hours}
                  onChange={e => setSettings({ ...settings, normal_hours: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white text-center focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-slate-400 font-semibold">horas úteis</span>
              </div>
            </div>

            {/* Baixa */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Prioridade Baixa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Para melhorias de longo prazo, refatorações ou tarefas internas.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={settings.low_hours}
                  onChange={e => setSettings({ ...settings, low_hours: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white text-center focus:outline-none focus:border-slate-500"
                />
                <span className="text-xs text-slate-400 font-semibold">horas úteis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulador de Capacidade Diária (WIP Limits por Prioridade) */}
        <div className="p-6 rounded-2xl bg-[#0d121d] border border-slate-800 space-y-5">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Regulador de Limite Diário (Capacidade Máxima por Dia)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Define o teto de novos chamados absorvidos em um único dia. Ao atingir a cota, o SLA projeta o início automaticamente para o próximo dia útil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Limite Urgentes */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-500/20">
              <span className="text-xs font-bold text-rose-300 block mb-1">
                Máx. Urgentes por Dia
              </span>
              <p className="text-[11px] text-slate-400 mb-3">
                Excesso empurra o prazo da nova urgência para o próximo dia útil.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.max_urgent_per_day ?? 2}
                  onChange={e => setSettings({ ...settings, max_urgent_per_day: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white text-center focus:outline-none focus:border-rose-500"
                />
                <span className="text-xs text-slate-400 font-semibold">tarefas/dia</span>
              </div>
            </div>

            {/* Limite Normais */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/20">
              <span className="text-xs font-bold text-amber-300 block mb-1">
                Máx. Normais por Dia
              </span>
              <p className="text-[11px] text-slate-400 mb-3">
                Cota de demandas padrão absorvidas no mesmo expediente.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.max_normal_per_day ?? 4}
                  onChange={e => setSettings({ ...settings, max_normal_per_day: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white text-center focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400 font-semibold">tarefas/dia</span>
              </div>
            </div>

            {/* Limite Baixas */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60">
              <span className="text-xs font-bold text-slate-300 block mb-1">
                Máx. Baixas por Dia
              </span>
              <p className="text-[11px] text-slate-400 mb-3">
                Cota de tarefas de baixa prioridade acomodadas no dia.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.max_low_per_day ?? 6}
                  onChange={e => setSettings({ ...settings, max_low_per_day: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-white text-center focus:outline-none focus:border-slate-500"
                />
                <span className="text-xs text-slate-400 font-semibold">tarefas/dia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expediente Comercial */}
        <div className="p-6 rounded-2xl bg-[#0d121d] border border-slate-800 space-y-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Horário de Expediente da Operação
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Início do Expediente Comercial
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.work_start_hour}
                  onChange={e => setSettings({ ...settings, work_start_hour: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-slate-400">:00 horas</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fim do Expediente Comercial
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.work_end_hour}
                  onChange={e => setSettings({ ...settings, work_end_hour: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-slate-400">:00 horas</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Dias comerciais ativos: <strong>Segunda a Sexta-feira</strong> (Sábados, Domingos e feriados são automaticamente excluídos do cálculo de SLA).
            </span>
          </div>
        </div>

        {/* Google Agenda & Sincronização iCal */}
        <div className="p-6 rounded-2xl bg-[#0d121d] border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              Sincronização com Google Agenda (iCal)
            </h3>
            <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded font-medium">
              1h / Demanda • Pula Reuniões
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Cada tarefa aprovada consome <strong>1 hora</strong> do dia do responsável. Caso o horário colida com eventos e reuniões da Google Agenda, o sistema avança automaticamente para o próximo intervalo vago no horário útil comercial.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Link da Google Agenda Privada (iCal) — Guilherme:
              </label>
              <input
                type="text"
                value={settings.ical_url_guilherme || ''}
                readOnly
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 focus:outline-none cursor-not-allowed"
              />
              <span className="text-[10px] text-emerald-400 mt-1 block">
                ✓ Agenda do Guilherme vinculada e sincronizada ativamente.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Link da Google Agenda Privada (iCal) — Caio:
              </label>
              <input
                type="text"
                placeholder="Cole aqui a URL privada .ics da agenda do Caio quando disponível..."
                value={settings.ical_url_caio || ''}
                onChange={e => setSettings({ ...settings, ical_url_caio: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Assim que preenchido, a fila de demandas do Caio também respeitará automaticamente os compromissos da agenda dele.
              </span>
            </div>
          </div>
        </div>

        {/* Relatório Diário Automático no WhatsApp */}
        <div className="p-6 rounded-2xl bg-[#0d121d] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Relatório Diário Automático no WhatsApp
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
              30 min antes do fim do expediente ({settings.work_end_hour - 1}:30)
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Consolidação diária enviada automaticamente no grupo <strong>Relatórios Diários</strong> com todas as demandas finalizadas no dia, o que ficou pendente para amanhã e o tempo total de foco trabalhado por Guilherme e por Caio.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Grupo WhatsApp de Destino:</span>
              <span className="font-bold text-white font-mono">Relatórios Diários (120363427677526608@g.us)</span>
            </div>
            <button
              type="button"
              onClick={handleTestReport}
              disabled={isTestingReport}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-400 border border-slate-800 hover:border-emerald-500/40 font-semibold flex items-center gap-1.5 transition"
            >
              <Send className={`w-3.5 h-3.5 ${isTestingReport ? 'animate-pulse' : ''}`} />
              <span>{isTestingReport ? 'Disparando...' : 'Testar Envio Agora'}</span>
            </button>
          </div>

          {reportFeedback && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs animate-fadeIn">
              {reportFeedback}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações de SLA'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
