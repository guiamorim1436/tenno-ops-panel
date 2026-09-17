import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { TeamMember } from '../types';

export interface AuthSession {
  email: string;
  name: string;
  memberId: string;
  role: string;
  loggedAt: string;
}

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
  members: TeamMember[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, members }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    setTimeout(() => {
      // Validação das credenciais fixas da TENNO
      if (cleanPass !== 'Vomogi@1436') {
        setError('Senha incorreta. Verifique suas credenciais de acesso.');
        setIsLoading(false);
        return;
      }

      if (cleanEmail === 'guilherme.amorimcrm@gmail.com') {
        const guilhermeMember = members.find(m => m.id === '1') || {
          id: '1',
          name: 'Guilherme',
          role: 'lider_tecnico' as const
        };
        const session: AuthSession = {
          email: cleanEmail,
          name: guilhermeMember.name,
          memberId: guilhermeMember.id,
          role: 'Líder Técnico & Estratégico',
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem('tenno_user_session', JSON.stringify(session));
        onLoginSuccess(session);
      } else if (cleanEmail === 'caio1dan@gmail.com') {
        const caioMember = members.find(m => m.id === '2') || {
          id: '2',
          name: 'Caio',
          role: 'assistente_operacional' as const
        };
        const session: AuthSession = {
          email: cleanEmail,
          name: caioMember.name,
          memberId: caioMember.id,
          role: 'Assistente Operacional',
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem('tenno_user_session', JSON.stringify(session));
        onLoginSuccess(session);
      } else {
        setError('E-mail não autorizado para acesso à operação TENNO.');
        setIsLoading(false);
      }
    }, 350);
  };

  const fillQuick = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Vomogi@1436');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 font-sans relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Cabeçalho TENNO */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-emerald-400/20 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 mb-2">
            <span className="text-2xl font-black text-emerald-400 tracking-wider">T</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TENNO <span className="text-emerald-400 font-light">OPS PANEL</span>
          </h1>
          <p className="text-xs text-slate-400">
            Painel Operacional & Sistema Mono-tarefa Blindado
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-7 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Atalhos Rápidos para os 2 Usuários Autorizados */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acesso Rápido de Equipe:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuick('guilherme.amorimcrm@gmail.com')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-[11px] text-slate-300 transition text-center"
              >
                👤 Guilherme
              </button>
              <button
                type="button"
                onClick={() => fillQuick('caio1dan@gmail.com')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-[11px] text-slate-300 transition text-center"
              >
                👤 Caio
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé institucional */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Operação TENNO • Autenticação Local Segura</p>
        </div>
      </div>
    </div>
  );
};
