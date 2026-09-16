import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Save, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SlaSettings } from '../types';

export const SlaSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SlaSettings>({
    id: 'default',
    urgent_hours: 4,
    normal_hours: 24,
    low_hours: 72,
    work_start_hour: 9,
    work_end_hour: 18,
    work_days: '1,2,3,4,5'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/sla-settings');
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
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
        setFeedback('✓ Configurações de SLA salvas com sucesso!');
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações de SLA'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
