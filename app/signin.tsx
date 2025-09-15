// app/(auth)/signin.tsx (or wherever your SignInPage lives)
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabaseClient';

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // success will redirect via onAuthStateChange
  };

  const handleSignUp = async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);

    // If email confirmations are ON in Supabase Auth settings,
    // user must verify their email before session starts.
    if (!data.session) {
      setError('Check your inbox to confirm your email, then sign in.');
    }
    // If confirmations are OFF, onAuthStateChange will redirect.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator />
      ) : mode === 'signin' ? (
        <>
          <Button title="Sign In" onPress={handleSignIn} />
          <Text style={styles.link} onPress={() => { setMode('signup'); setError(''); }}>
            Need an account? Sign up
          </Text>
        </>
      ) : (
        <>
          <Button title="Create Account" onPress={handleSignUp} />
          <Text style={styles.link} onPress={() => { setMode('signin'); setError(''); }}>
            Have an account? Sign in
          </Text>
          <Text style={styles.link} onPress={() => router.replace('/signup')}>
            Need an account? Sign up
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 8 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
  link: { marginTop: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
