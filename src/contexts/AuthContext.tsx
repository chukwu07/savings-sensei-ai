import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { securityLogger } from '@/utils/securityLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email || 'no user');
        
        // Log authentication events for security monitoring
        securityLogger.logAuthEvent(
          session?.user?.id || null, 
          event.toLowerCase(), 
          !!session,
          { email: session?.user?.email }
        );
        
        // Only restore session if it's a valid login event or existing session
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session with validation
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Session validation error:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Only restore if we have a valid, non-expired session
      if (session && session.expires_at && new Date(session.expires_at * 1000) > new Date()) {
        console.log('✅ Valid session found, restoring user');
        setSession(session);
        setUser(session.user);
      } else {
        console.log('❌ Invalid or expired session, clearing state');
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      securityLogger.logAuthEvent(
        data?.user?.id || null, 
        'sign_in', 
        !error,
        { email, errorType: error?.message }
      );
      
      return { error };
    } catch (error) {
      securityLogger.logAuthEvent(null, 'sign_in', false, { email, error: 'Exception thrown' });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });
      
      securityLogger.logAuthEvent(
        data?.user?.id || null, 
        'sign_up', 
        !error,
        { email, hasDisplayName: !!displayName, errorType: error?.message }
      );
      
      return { error };
    } catch (error) {
      securityLogger.logAuthEvent(null, 'sign_up', false, { email, error: 'Exception thrown' });
      return { error };
    }
  };

  const signOut = async () => {
    console.log('🔐 Starting sign out process...');
    try {
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      // Call Supabase signOut with scope: 'local' to only clear current tab
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Force clear localStorage as additional safeguard
      localStorage.removeItem('sb-egrljooargciueeppecq-auth-token');
      localStorage.removeItem('supabase.auth.token');
      
      if (error) {
        console.error('❌ Sign out error:', error);
        return { error };
      }
      
      console.log('✅ Sign out successful - localStorage cleared');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      // Ensure state is cleared even if API call fails
      setUser(null);
      setSession(null);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}