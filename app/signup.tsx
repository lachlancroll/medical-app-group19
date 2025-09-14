// app/signup.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabaseClient';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState(''); // optional, goes into user_metadata
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authed, skip this screen
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/(tabs)');
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace('/(tabs)');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const handleSignUp = async () => {
    if (!email || !password) return setError('Email and password are required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    setInfo('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || undefined } }, // user_metadata
    });

    setLoading(false);
    if (error) return setError(error.message);

    // If email confirmation is ON, there won't be a session yet:
    if (!data.session) {
      setInfo('Check your email to confirm your account, then come back and sign in.');
    } else {
      // If confirmation is OFF, onAuthStateChange will redirect to /(tabs)
      setInfo('Account created!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name (optional)"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="password-new"
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        secureTextEntry
        autoComplete="password-new"
        value={confirm}
        onChangeText={setConfirm}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={styles.info}>{info}</Text>}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Button title="Create Account" onPress={handleSignUp} />
          <Text style={styles.link} onPress={() => router.replace('/signin')}>
            Have an account? Sign in
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
  info: { color: 'green', marginBottom: 10, textAlign: 'center' },
  link: { marginTop: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
