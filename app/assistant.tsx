import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function AssistantScreen() {
  const navigation = useNavigation();

  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [conversation, setConversation] = useState<
    { role: 'user' | 'assistant'; content: string; timestamp: string; date: string }[]
  >([]);

  const API_URL = 'https://undistractingly-unlocalisable-hadley.ngrok-free.dev';

  const userProfile = {
    age: 32,
    gender: 'Female',
    conditions: ['Asthma'],
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setLoading(true);

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toISOString().split('T')[0];

    const updatedConversation = [
      ...conversation,
      { role: 'user', content: userInput, timestamp, date },
    ];

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConversation.map(({ role, content }) => ({ role, content })),
          userProfile,
        }),
      });

      const text = await res.text();
      const data = JSON.parse(text);
      const aiReply = data.reply || '⚠️ No response received.';
      const replyTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const replyDate = new Date().toISOString().split('T')[0];

      setConversation([
        ...updatedConversation,
        { role: 'assistant', content: aiReply, timestamp: replyTimestamp, date: replyDate },
      ]);
    } catch {
      const errorTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorDate = new Date().toISOString().split('T')[0];
      setConversation([
        ...updatedConversation,
        { role: 'assistant', content: '⚠️ Something went wrong.', timestamp: errorTimestamp, date: errorDate },
      ]);
    } finally {
      setLoading(false);
      setUserInput('');
    }
  };

  const summarizeConversation = async () => {
    if (conversation.length === 0) return;
    setSummarizing(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Summarize this health conversation clearly and concisely.',
            },
            ...conversation.map(({ role, content }) => ({ role, content })),
          ],
          userProfile,
        }),
      });

      const text = await res.text();
      const data = JSON.parse(text);
      const summary = data.reply || '⚠️ No summary available.';
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = now.toISOString().split('T')[0];

      setConversation([
        ...conversation,
        { role: 'assistant', content: `📝 Summary:\n${summary}`, timestamp, date },
      ]);
    } catch {
      // Handle error silently
    } finally {
      setSummarizing(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setUserInput('');
  };

  const ChatBubble = ({ role, content, timestamp }: { role: 'user' | 'assistant'; content: string; timestamp: string }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const isSummary = content.startsWith('📝 Summary:');
    const isUser = role === 'user';

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? '#fff' : isSummary ? '#fff' : '#e0f7f6',
          borderRadius: isUser ? 20 : 8,
          padding: 10,
          marginBottom: 12,
          maxWidth: '80%',
        }}
      >
        <Text style={{ fontWeight: 'bold', color: isUser ? '#000' : '#16619d' }}>
          {isUser ? '🧑 You:' : '🤖 PharmaConnectAI:'}
        </Text>
        <Text style={{ fontSize: 16, color: '#333' }}>
          {isSummary ? content.replace('📝 Summary:\n', '') : content}
        </Text>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{timestamp}</Text>
        {isSummary && (
          <TouchableOpacity
            onPress={() => Clipboard.setString(content.replace('📝 Summary:\n', ''))}
            style={{
              backgroundColor: '#007AFF',
              paddingVertical: 6,
              borderRadius: 6,
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>📋 Copy Summary</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const DateHeader = ({ date }: { date: string }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.Text
        style={{
          opacity: fadeAnim,
          color: '#fff',
          fontWeight: 'bold',
          marginBottom: 8,
          marginTop: 16,
        }}
      >
        {getDateLabel(date)}
      </Animated.Text>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgb(22, 161, 157)' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('index')}
                style={{
                  backgroundColor: '#ccc',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔙 Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={clearConversation}
                style={{
                  backgroundColor: '#FF3B30',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>🧼 Clear</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 18, marginBottom: 10, color: '#fff' }}>
              🤖 Hello! I'm PharmaConnectAI, your personal health assistant. What symptoms are you experiencing today?
            </Text>

            <TouchableOpacity
              onPress={summarizeConversation}
              style={{
                backgroundColor: '#34C759',
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14 }}>
                {summarizing ? 'Summarizing...' : '🧾 Summarize Conversation'}
              </Text>
            </TouchableOpacity>

            {loading && (
              <Text style={{ marginTop: 10, fontStyle: 'italic', color: '#fff' }}>
                🤖 PharmaConnectAI is typing…
              </Text>
            )}

            {conversation.length > 0 && (
              <View style={{ marginTop: 20 }}>
                {conversation.reduce((acc, msg, index) => {
                  const prev = conversation[index - 1];
                  const showDateHeader = !prev || prev.date !== msg.date;
                  if (showDateHeader) {
                    acc.push(
                      <DateHeader key={`date-${msg.date}-${index}`} date={msg.date} />
                    );
                  }
                  acc.push(
                    <ChatBubble
                      key={index}
                      role={msg.role}
                      content={msg.content}
                      timestamp={msg.timestamp}
                    />
                  );
                  return acc;
                }, [] as JSX.Element[])}
              </View>
            )}
          </ScrollView>

          {/* Input bar pinned to bottom */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#e6f7f7' }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: '#fff',
                marginRight: 8,
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
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>
                {loading ? '...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
