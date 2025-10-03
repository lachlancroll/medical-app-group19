// app/(tabs)/assistant.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AssistantScreen() {
  const [userInput, setUserInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Hardcoded for Android emulator testing
  const API_URL = 'https://undistractingly-unlocalisable-hadley.ngrok-free.dev';

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    setReply('');

    console.log('Using API URL:', API_URL);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });

      const text = await res.text(); // 👈 get raw response
      console.log('🧾 Raw response:', text);

      let data;
      try {
        data = JSON.parse(text); // 👈 try parsing manually
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        setReply('⚠️ Backend returned invalid response. Please check server logs.');
        return;
      }

      console.log('✅ Parsed JSON:', data);
      setReply(data.reply || '⚠️ No response received.');
    } catch (error: any) {
      console.error('❌ Frontend fetch error:', error.message || error);
      setReply('⚠️ Sorry, something went wrong while processing your message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            🤖 Hello! I'm your AI health assistant. What symptoms are you experiencing today?
          </Text>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              marginBottom: 10,
            }}
            placeholder="Type your symptoms..."
            value={userInput}
            onChangeText={setUserInput}
            multiline
          />

          <TouchableOpacity
            onPress={sendMessage}
            style={{
              backgroundColor: '#007AFF',
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>
              {loading ? 'Thinking...' : 'Send'}
            </Text>
          </TouchableOpacity>

          {reply ? (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>HealthMate:</Text>
              <Text style={{ fontSize: 16, marginTop: 8 }}>{reply}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}