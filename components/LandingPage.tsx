import React, { useState } from 'react';
import { Button } from './ui/Button';
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  Calendar,
  BarChart3,
  Target,
  AlertCircle,
  Users,
  Briefcase,
  X,
  User,
  Hash,
  Lock
} from 'lucide-react';
import { authService } from '../src/services/authService';

interface LandingPageProps {
  onEnterApp: (name: string, xpId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginXpId, setLoginXpId] = useState('A');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginXpId.trim() || loginXpId === 'A') {
      setLoginError('Por favor, preencha sua matrícula.');
      return;
    }

    if (!loginPassword.trim()) {
      setLoginError('Por favor, informe sua senha.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await authService.signIn(loginXpId, loginPassword);

      if ('error' in result) {
        setLoginError(result.error);
        return;
      }

      onEnterApp(result.profile.name, result.profile.xpId);
    } catch (err) {
      setLoginError('Erro ao conectar. Verifique sua conexão.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleXpIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (value.startsWith('A')) {
      // Permite apenas números após o A
      const numbers = value.substring(1).replace(/\D/g, '');
      setLoginXpId('A' + numbers);
    } else if (value === '') {
      setLoginXpId('A');
    }
  };

  const faqs = [
    {
      question: "Isso é um CRM?",
      answer: "É um app de rotina comercial com funil, feito pra você fazer o básico bem feito toda semana. Sem 'overkill'. Sem complicar."
    },
    {
      question: "Funciona no celular e no desktop?",
      answer: "Sim. A ideia é ser seu instrumento diário: rápido no celular e completo no desktop."
    },
    {
      question: "O gestor consegue ver o time todo?",
      answer: "Sim. Você tem a sua visão (assessor) e o gestor tem a visão consolidada da filial."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      {/* Hero Section */}
      <header className="relative bg-slate-900 text-white pb-12 pt-8 md:pb-20 md:pt-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=2')] opacity-10 bg-cover bg-center"></div>
        <div className="container mx-auto px-4 relative z-10">
          <nav className="flex justify-between items-center mb-10 md:mb-16">
            <div className="text-xl md:text-2xl font-bold tracking-tighter flex items-center gap-2">
              <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
              Pipe Semanal
            </div>
            <Button onClick={handleOpenLogin} variant="secondary" size="sm">Entrar</Button>
          </nav>

          <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12">
            <div className="lg:w-1/2 space-y-4 md:space-y-6 text-center lg:text-left">
              <div className="inline-block px-3 py-1 bg-blue-900/50 border border-blue-500/30 rounded-full text-blue-300 text-[10px] md:text-xs font-semibold tracking-wide uppercase mb-2">
                Simples. Semanal. Fechador.
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                MAIS REUNIÕES.<br />
                <span className="text-orange-500">MAIS CONVERSÃO.</span><br />
                MAIS CAPTAÇÃO.
              </h1>
              <p className="text-slate-300 text-base md:text-xl leading-relaxed max-w-lg mx-auto lg:mx-0">
                Você para de se perder no dia a dia e passa a seguir um passo a passo simples: lead → ligação → 1ª reunião → 2ª reunião → fechamento.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                <Button onClick={handleOpenLogin} variant="secondary" size="lg" className="group text-sm md:text-lg w-full sm:w-auto">
                  QUERO ENTRAR NO PIPE AGORA
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-4">
                Leva menos de 2 minutos para configurar sua semana
              </p>
            </div>

            <div className="lg:w-1/2 relative w-full">
              <div className="bg-slate-800 rounded-xl p-3 md:p-4 shadow-2xl border border-slate-700 transform md:rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-slate-900 rounded-lg p-3 md:p-4 h-64 md:h-80 flex flex-col gap-4 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                    <div className="h-3 md:h-4 w-24 md:w-32 bg-slate-700 rounded animate-pulse"></div>
                    <div className="flex gap-2">
                      <div className="h-6 w-6 md:h-8 md:w-8 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-4 h-full">
                    <div className="w-1/3 bg-slate-800 rounded p-2 flex flex-col gap-2">
                      <div className="h-2 md:h-3 w-12 md:w-16 bg-slate-600 rounded mb-2"></div>
                      <div className="h-12 md:h-16 bg-slate-700 rounded opacity-50"></div>
                      <div className="h-12 md:h-16 bg-slate-700 rounded opacity-50"></div>
                    </div>
                    <div className="w-1/3 bg-slate-800 rounded p-2 flex flex-col gap-2">
                      <div className="h-2 md:h-3 w-12 md:w-16 bg-slate-600 rounded mb-2"></div>
                      <div className="h-12 md:h-16 bg-slate-700 rounded opacity-50"></div>
                    </div>
                    <div className="w-1/3 bg-slate-800 rounded p-2 flex flex-col gap-2">
                      <div className="h-2 md:h-3 w-12 md:w-16 bg-slate-600 rounded mb-2"></div>
                      <div className="h-12 md:h-16 bg-green-900/20 border border-green-500/30 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-2 md:-bottom-6 md:-right-6 bg-white text-slate-900 p-3 md:p-4 rounded-lg shadow-xl border border-slate-200">
                  <div className="text-[10px] md:text-sm font-bold text-slate-500 uppercase">Captação Mensal</div>
                  <div className="text-xl md:text-3xl font-bold text-green-600">R$ 1.2M</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Problem Section */}
      <section className="py-12 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="md:w-1/2 relative w-full">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl group border border-slate-200 aspect-video md:aspect-auto md:h-[400px]">
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200"
                  alt="Equipe reunida em estratégia"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 filter saturate-[0.9]"
                />
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors duration-500"></div>

                <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 p-3 md:p-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-100 animate-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-full mt-1 shrink-0">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">O Problema Atual</p>
                      <p className="text-sm md:text-base text-slate-800 font-semibold italic leading-tight">"Sinto que passo o dia apagando incêndio e não tenho tempo para captar novos clientes."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-slate-900 leading-tight">
                Seu dia começa corrido.<br />
                <span className="text-slate-500">E quando você vê, passou a semana… e o pipe não andou.</span>
              </h2>
              <div className="space-y-4 text-slate-600 text-base md:text-lg">
                <p>
                  Você até tenta se organizar, mas tudo vira bagunça: anotação, WhatsApp, planilha, memória.
                </p>
                <p>
                  Aí vem a sensação de estar “enterrado em trabalho administrativo” em vez de estar vendendo.
                </p>
                <p className="font-semibold text-slate-800 border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r-lg text-sm md:text-base">
                  E pior: você sabe que precisa prospectar, mas fica sem clareza do básico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features / How It Works Section */}
      <section className="py-12 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">Como funciona o seu Pipe Semanal</h2>
            <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
              Um funil simples, direto e visual. Cada lead segue o caminho até o fechamento.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 max-w-5xl mx-auto">
            {[
              { icon: Users, label: 'Leads (300k+)', color: 'bg-slate-100 text-slate-600', step: 1 },
              { icon: Phone, label: 'A Ligar', color: 'bg-blue-100 text-blue-600', step: 2 },
              { icon: Calendar, label: '1ª Reunião', color: 'bg-indigo-100 text-indigo-600', step: 3 },
              { icon: Briefcase, label: '2ª Reunião', color: 'bg-purple-100 text-purple-600', step: 4 },
              { icon: CheckCircle2, label: 'Fechamento', color: 'bg-green-100 text-green-600', step: 5 }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-[10px] md:text-xs font-bold text-slate-400 mb-1">ETAPA {item.step}</div>
                <div className="text-sm md:text-base font-semibold text-slate-800">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-6 md:mt-10">
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm md:text-base">
              <Target className="w-5 h-5" />
              Acompanhe metas semanais e mensais com clareza total
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-slate-900">Perguntas Frequentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 md:px-6 md:py-5 text-left flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm md:text-base pr-4">{faq.question}</span>
                  <span className={`text-slate-400 transition-transform duration-200 text-xl ${openFaqIndex === index ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaqIndex === index && (
                  <div className="px-5 pb-4 md:px-6 md:pb-5 text-slate-600 text-sm md:text-base leading-relaxed border-t border-slate-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            Pronto pra sair do caos e entrar no <span className="text-orange-500">pipe?</span>
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8 text-base md:text-lg">
            Leva 2 minutos. Sem formulário. Sem cartão. É só entrar e começar.
          </p>
          <Button onClick={handleOpenLogin} variant="secondary" size="lg" className="group text-sm md:text-lg">
            ENTRAR NO PIPE AGORA
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-slate-300">Pipe Semanal</span>
          </div>
          <p className="text-xs md:text-sm">
            © {new Date().getFullYear()} Pipe Semanal — Feito para assessores que querem resultado.
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Identificação</h2>
              <p className="text-slate-500 text-sm mt-2">Para acessar seu pipe exclusivo, por favor informe seus dados.</p>
            </div>

            <form onSubmit={handleSubmitLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matrícula XP</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-900 text-white font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    placeholder="Ex: 69037"
                    value={loginXpId}
                    onChange={handleXpIdChange}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-900 text-white font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    placeholder="Sua senha de acesso"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                    required
                  />
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-semibold bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {loginError}
                </div>
              )}
              <Button type="submit" fullWidth size="lg" className="mt-4" disabled={isLoggingIn}>
                {isLoggingIn ? 'Entrando...' : 'Acessar Meu Pipe'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};