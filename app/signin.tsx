import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { signInWithEmail, signUpWithEmail } from '@/services/auth';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { user } = await signInWithEmail(email, password);
      if (user) {
        await AsyncStorage.setItem('authed', '1');
        await AsyncStorage.setItem('userId', user.id);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { user } = await signUpWithEmail(email, password, {
        full_name: fullName,
        role: 'patient'
      });
      
      if (user) {
        Alert.alert(
          'Success', 
          'Account created! Please check your email to verify your account.',
          [
            {
              text: 'OK',
              onPress: () => setIsSignUp(false)
            }
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
      
      {isSignUp && (
        <TextInput 
          style={styles.input} 
          placeholder="Full Name" 
          value={fullName} 
          onChangeText={setFullName} 
        />
      )}
      
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        autoCapitalize="none" 
        value={email} 
        onChangeText={setEmail} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />
      
      {!!error && <Text style={styles.error}>{error}</Text>}
      
      <Button 
        title={isSignUp ? 'Sign Up' : 'Sign In'} 
        onPress={isSignUp ? handleSignUp : handleSignIn}
        disabled={loading}
      />
      
      <Button 
        title={isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'} 
        onPress={() => setIsSignUp(!isSignUp)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});
