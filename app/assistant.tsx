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
import { useNavigation } from '@react-navigation/native'; // ✅ Navigation hook

export default function AssistantScreen() {
  const navigation = useNavigation(); // ✅ Initialize navigation

  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);

  const API_URL = 'https://undistractingly-unlocalisable-hadley.ngrok-free.dev';

  const userProfile = {
    age: 32,
    gender: 'Female',
    conditions: ['Asthma'],
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setLoading(true);

    const updatedConversation = [
      ...conversation,
      { role: 'user', content: userInput },
    ];

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConversation,
          userProfile,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        setConversation([
          ...updatedConversation,
          { role: 'assistant', content: '⚠️ Backend returned invalid response.' },
        ]);
        return;
      }

      const aiReply = data.reply || '⚠️ No response received.';
      setConversation([
        ...updatedConversation,
        { role: 'assistant', content: aiReply },
      ]);
    } catch (error: any) {
      setConversation([
        ...updatedConversation,
        { role: 'assistant', content: '⚠️ Sorry, something went wrong while processing your message.' },
      ]);
    } finally {
      setLoading(false);
      setUserInput('');
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setUserInput('');
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
          {/* 🔙 Back Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('index')}
            style={{
              backgroundColor: '#ccc',
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 14 }}>🔙 Back to Home</Text>
          </TouchableOpacity>

          {/* 🧼 Clear Conversation Button */}
          <TouchableOpacity
            onPress={clearConversation}
            style={{
              backgroundColor: '#FF3B30',
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>🧼 Clear Conversation</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            🤖 Hello! I'm PharmaConnectAI, your personal health assistant. What symptoms are you experiencing today?
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

          {conversation.length > 0 && (
            <View style={{ marginTop: 20 }}>
              {conversation.map((msg, index) => (
                <View key={index} style={{ marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold' }}>
                    {msg.role === 'user' ? 'You:' : 'PharmaConnectAI:'}
                  </Text>
                  <Text style={{ fontSize: 16 }}>{msg.content}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}