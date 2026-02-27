import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { AppView } from './types';
import { authService, UserProfile } from './src/services/authService';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [currentUser, setCurrentUser] = useState<{ name: string; xpId: string; role: string } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Verifica se já há sessão ativa ao iniciar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authService.getSession();
        if (session?.user) {
          const profile = await authService.getProfile(session.user.id);
          if (profile && profile.active) {
            setCurrentUser({ name: profile.name, xpId: profile.xpId, role: profile.role });
            setCurrentView(AppView.DASHBOARD);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // Escuta mudanças no estado de auth (ex: expiração de sessão)
  useEffect(() => {
    const { data } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        setCurrentView(AppView.LANDING);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = (name: string, xpId: string) => {
    setCurrentUser({ name, xpId, role: '' });
    setCurrentView(AppView.DASHBOARD);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setCurrentView(AppView.LANDING);
    window.scrollTo(0, 0);
  };

  // Tela de carregamento enquanto verifica sessão
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased text-slate-900 bg-white">
      {currentView === AppView.LANDING ? (
        <LandingPage onEnterApp={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} currentUser={currentUser} />
      )}
    </div>
  );
}