import { getSupabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    xpId: string;
    name: string;
    role: 'Gestor' | 'Assessor' | 'Assessor Senior' | 'Assessor Especialista';
    active: boolean;
}

export const authService = {
    /**
     * Login com matrícula XP e senha.
     * Email usado internamente: {xpId}@rba-pipe.local
     */
    async signIn(xpId: string, password: string): Promise<{ profile: UserProfile } | { error: string }> {
        const supabase = getSupabase();
        if (!supabase) {
            return { error: 'Supabase não configurado. Configure as variáveis de ambiente.' };
        }

        const email = `${xpId.trim().toLowerCase()}@rba-pipe.local`;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('[Auth] Login error:', error.message);
            return { error: 'Matrícula ou senha incorreta.' };
        }

        if (!data.user) {
            return { error: 'Erro inesperado no login.' };
        }

        // Busca o perfil na tabela profiles
        const profile = await authService.getProfile(data.user.id);
        if (!profile) {
            return { error: 'Perfil não encontrado. Contate o gestor.' };
        }

        if (!profile.active) {
            await supabase.auth.signOut();
            return { error: 'Sua conta foi desativada. Contate o gestor.' };
        }

        return { profile };
    },

    /**
     * Logout do usuário.
     */
    async signOut(): Promise<void> {
        const supabase = getSupabase();
        if (!supabase) return;
        await supabase.auth.signOut();
    },

    /**
     * Altera a senha do usuário logado.
     * Reautentica primeiro com a senha atual para garantir segurança.
     */
    async changePassword(
        xpId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> {
        const supabase = getSupabase();
        if (!supabase) return { success: false, error: 'Supabase não configurado.' };

        // Reautentica para verificar a senha atual
        const email = `${xpId.trim().toLowerCase()}@rba-pipe.local`;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });

        if (signInError) {
            return { success: false, error: 'Senha atual incorreta.' };
        }

        // Atualiza para a nova senha
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
            return { success: false, error: 'Erro ao alterar senha. Tente novamente.' };
        }

        return { success: true };
    },

    /**
     * Busca o perfil de um usuário pelo ID do Supabase Auth.
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        const supabase = getSupabase();
        if (!supabase) return null;

        const { data, error } = await (supabase
            .from('profiles' as any)
            .select('*')
            .eq('id', userId)
            .single() as any);

        if (error || !data) return null;

        return {
            id: data.id,
            xpId: data.xp_id,
            name: data.name,
            role: data.role,
            active: data.active,
        };
    },

    /**
     * Busca todos os perfis ativos (para listagem do time).
     */
    async getAllProfiles(): Promise<UserProfile[]> {
        const supabase = getSupabase();
        if (!supabase) return [];

        const { data, error } = await (supabase
            .from('profiles' as any)
            .select('*')
            .eq('active', true)
            .order('name') as any);

        if (error || !data) return [];

        return (data as any[]).map((d) => ({
            id: d.id,
            xpId: d.xp_id,
            name: d.name,
            role: d.role,
            active: d.active,
        }));
    },

    /**
     * Cria um novo assessor (signup + profile).
     * Nota: signUp() pode criar uma nova sessão. Após criar, restaura a sessão do gestor.
     */
    async createAdvisor(
        xpId: string,
        name: string,
        role: string = 'Assessor'
    ): Promise<{ success: boolean; error?: string }> {
        const supabase = getSupabase();
        if (!supabase) return { success: false, error: 'Supabase não configurado.' };

        // Salvar sessão atual do gestor
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData?.session;

        const email = `${xpId.trim().toLowerCase()}@rba-pipe.local`;
        const defaultPassword = xpId.trim().toUpperCase(); // Senha padrão = matrícula

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password: defaultPassword,
            options: {
                data: {
                    xp_id: xpId.trim().toUpperCase(),
                    name: name.trim(),
                    role,
                },
            },
        });

        if (signUpError) {
            // Restaurar sessão do gestor em caso de erro
            if (currentSession?.refresh_token) {
                await supabase.auth.refreshSession({ refresh_token: currentSession.refresh_token });
            }
            if (signUpError.message.includes('already registered')) {
                return { success: false, error: 'Esta matrícula já está cadastrada.' };
            }
            return { success: false, error: signUpError.message };
        }

        // Restaurar a sessão do gestor
        if (currentSession?.refresh_token) {
            await supabase.auth.refreshSession({ refresh_token: currentSession.refresh_token });
        }

        return { success: true };
    },

    /**
     * Desativa um assessor (marca active = false no profile).
     * Não remove do Auth (requer Admin API).
     */
    async deactivateAdvisor(xpId: string): Promise<{ success: boolean; error?: string }> {
        const supabase = getSupabase();
        if (!supabase) return { success: false, error: 'Supabase não configurado.' };

        // Buscar profile pela matrícula XP
        const { data: profileData, error: findError } = await (supabase
            .from('profiles' as any)
            .select('id, role')
            .eq('xp_id', xpId.trim().toUpperCase())
            .single() as any);

        if (findError || !profileData) {
            return { success: false, error: 'Matrícula não encontrada.' };
        }

        if (profileData.role === 'Gestor') {
            return { success: false, error: 'Não é possível remover um Gestor.' };
        }

        const { error: updateError } = await (supabase
            .from('profiles' as any)
            .update({ active: false } as any)
            .eq('id', profileData.id) as any);

        if (updateError) {
            return { success: false, error: 'Erro ao desativar assessor.' };
        }

        return { success: true };
    },

    /**
     * Retorna a sessão ativa atual (se houver).
     */
    async getSession() {
        const supabase = getSupabase();
        if (!supabase) return null;

        const { data } = await supabase.auth.getSession();
        return data?.session ?? null;
    },

    /**
     * Escuta mudanças no estado de autenticação.
     */
    onAuthStateChange(callback: (event: string, session: any) => void) {
        const supabase = getSupabase();
        if (!supabase) return { data: { subscription: { unsubscribe: () => { } } } };

        return supabase.auth.onAuthStateChange(callback);
    },
};
