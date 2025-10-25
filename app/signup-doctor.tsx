// app/signup.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDoctorConfirmed, setIsDoctorConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/');
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace('/');
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || undefined, isDoctor: true } },
    });
    if (error) { setLoading(false); setError(error.message); return; }

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setLoading(false);
      setInfo('Check your email to confirm your account, then sign in.');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      setError('Could not load user after signup.');
      return;
    }

    const { error: uErr } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email!,
      isDoctor: true,
    });
    if (uErr) { setLoading(false); setError('Failed to save user profile.'); return; }

    const { error: rErr } = await supabase.from('user_roles').upsert({
      user_id: user.id,
      role: 'doctor',
    });
    if (rErr) { setLoading(false); setError('Failed to assign doctor role.'); return; }

    const { error: dErr } = await supabase.from('doctor_profiles').upsert({
      user_id: user.id,
    });
    if (dErr) { setLoading(false); setError('Failed to create doctor profile.'); return; }

    setLoading(false);
    setInfo('Doctor account created!');
  };

  return (
    <LinearGradient
      colors={['rgb(21, 210, 209)', 'rgb(22, 161, 157)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Create Doctor Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name (optional)"
          placeholderTextColor="#666"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#666"
          secureTextEntry
          autoComplete="password-new"
          value={confirm}
          onChangeText={setConfirm}
        />

        {/* Checkbox for doctor confirmation */}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setIsDoctorConfirmed((prev) => !prev)}
        >
          <View style={[styles.checkboxBox, isDoctorConfirmed && styles.checkboxBoxChecked]}>
            {isDoctorConfirmed && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I confirm that I am a registered medical practitioner
          </Text>
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.createBtn,
                !isDoctorConfirmed && { opacity: 0.6 },
              ]}
              disabled={!isDoctorConfirmed}
              onPress={handleSignUp}
            >
              <Text style={styles.createBtnText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.link} onPress={() => router.replace('/signin')}>
              Have an account? <Text style={{ fontWeight: '700' }}>Sign in</Text>
            </Text>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    color: '#000',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxBoxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkboxTick: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxLabel: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    marginTop: 18,
    textAlign: 'center',
    color: '#fff',
    textDecorationLine: 'underline',
  },
  error: {
    color: '#ff5252',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  info: {
    color: '#d1fae5',
    marginBottom: 10,
    textAlign: 'center',
  },
});


