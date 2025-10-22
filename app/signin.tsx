// app/(auth)/signin.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Logo from '../assets/group19logo.svg'; // from app/(auth)
import { supabase } from '../supabaseClient'; // keep your path

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // If already authed, skip screen
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/');
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // success redirects via onAuthStateChange
  };

  return (
    <LinearGradient
      colors={['#0ea5e9', '#6366f1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bg}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Logo / Brand */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Logo width={70} height={70} />   {/* scales perfectly */}
            </View>
            <Text style={styles.brand}>PharmaConnect</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Sign In</Text>

            {/* Email */}
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPw}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} accessibilityLabel="Toggle password visibility">
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            {/* Primary button */}
            <TouchableOpacity
              style={[styles.primaryBtn, (loading || !email || !password) && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={loading || !email || !password}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryText}>Sign In</Text>}
            </TouchableOpacity>

            {/* Links */}
            <TouchableOpacity onPress={() => router.replace('/signup')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Need an account? <Text style={styles.linkTextBold}>Sign up</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/signup-doctor')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Doctor? <Text style={styles.linkTextBold}>Create a clinician account</Text></Text>
            </TouchableOpacity>
          </View>

          {/* Footer blurb */}
          <Text style={styles.caption}>Secure sign-in powered by Supabase</Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrap: { alignItems: 'center', marginBottom: 18 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  logo: { width: 40, height: 40 },
  brand: { color: '#ffffff', marginTop: 10, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },

  error: { color: '#ef4444', textAlign: 'center', marginTop: 4, marginBottom: 10 },

  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.6 },

  linkBtn: { paddingVertical: 10, alignItems: 'center' },
  linkText: { color: '#334155' },
  linkTextBold: { color: '#2563eb', fontWeight: '700' },

  caption: { color: '#e5e7eb', marginTop: 14, fontSize: 12 },
});
