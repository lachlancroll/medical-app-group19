// assistant.tsx
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
} from 'react-native';
import { supabase } from '../supabaseClient';

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
};

export default function AssistantScreen() {
  const colorScheme = useColorScheme();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const name = user?.user_metadata?.full_name ?? 'there';
      setUserName(name);

      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `🤖 Hello ${name}! I'm your AI health assistant. What symptoms are you experiencing today?`,
        },
      ]);
    };
    loadUser();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });

      const data = await res.json();

      const reply: Message = {
        id: Date.now().toString() + '-bot',
        sender: 'assistant',
        text: data.reply,
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const errorReply: Message = {
        id: Date.now().toString() + '-error',
        sender: 'assistant',
        text: '⚠️ Sorry, something went wrong while processing your message. Please try again shortly.',
      };
      setMessages((prev) => [...prev, errorReply]);
    }

    setInput('');
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <ThemedText style={styles.messageText}>{item.text}</ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ThemedView style={styles.container}>
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatContainer}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Describe your symptoms..."
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  chatContainer: { paddingBottom: 100 },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '80%',
  },
  assistantBubble: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 16,
    color: '#111827',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 8,
  },
});
