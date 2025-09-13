import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  FlatList,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  type: 'emergency' | 'doctor' | 'family' | 'pharmacy';
}

interface GPRecommendation {
  id: string;
  name: string;
  specialty: string;
  distance: string;
  rating: number;
  phone: string;
  address: string;
}

// Mock data for demonstration
const emergencyContacts: EmergencyContact[] = [
  { id: '1', name: 'Emergency Services', number: '911', type: 'emergency' },
  { id: '2', name: 'Dr. Smith', number: '+1-555-0123', type: 'doctor' },
  { id: '3', name: 'Mom', number: '+1-555-0456', type: 'family' },
  { id: '4', name: 'Local Pharmacy', number: '+1-555-0789', type: 'pharmacy' },
];

const mockGPRecommendations: GPRecommendation[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    specialty: 'General Practice',
    distance: '0.5 miles',
    rating: 4.8,
    phone: '+1-555-1001',
    address: '123 Main St, City, State',
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    specialty: 'Internal Medicine',
    distance: '1.2 miles',
    rating: 4.6,
    phone: '+1-555-1002',
    address: '456 Oak Ave, City, State',
  },
  {
    id: '3',
    name: 'Dr. Emily Davis',
    specialty: 'Family Medicine',
    distance: '2.1 miles',
    rating: 4.9,
    phone: '+1-555-1003',
    address: '789 Pine St, City, State',
  },
];

export default function EmergencyScreen() {
  const colorScheme = useColorScheme();
  const [showGPRecommendations, setShowGPRecommendations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleText = (number: string) => {
    Linking.openURL(`sms:${number}`);
  };

  const handleGetDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/maps?q=${encodedAddress}`);
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Are you sure you want to call emergency services?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', onPress: () => handleCall('911') },
      ]
    );
  };

  const handleAIAssistance = () => {
    Alert.alert(
      'AI Medical Assistant',
      'This feature would connect you to an AI assistant for medical guidance. In a real app, this would integrate with your AI service.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Chat', onPress: () => console.log('Starting AI chat') },
      ]
    );
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'exclamationmark.triangle.fill';
      case 'doctor':
        return 'stethoscope';
      case 'family':
        return 'person.2.fill';
      case 'pharmacy':
        return 'pills.fill';
      default:
        return 'phone.fill';
    }
  };

  const getContactColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return '#FF3B30';
      case 'doctor':
        return '#007AFF';
      case 'family':
        return '#34C759';
      case 'pharmacy':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const renderEmergencyContact = ({ item }: { item: EmergencyContact }) => (
    <ThemedView style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={[styles.contactIcon, { backgroundColor: getContactColor(item.type) }]}>
          <IconSymbol name={getContactIcon(item.type)} size={20} color="white" />
        </View>
        <View style={styles.contactInfo}>
          <ThemedText type="subtitle" style={styles.contactName}>
            {item.name}
          </ThemedText>
          <ThemedText style={styles.contactNumber}>{item.number}</ThemedText>
        </View>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#34C759' }]}
          onPress={() => handleCall(item.number)}
        >
          <IconSymbol name="phone.fill" size={16} color="white" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
          onPress={() => handleText(item.number)}
        >
          <IconSymbol name="message.fill" size={16} color="white" />
          <Text style={styles.actionButtonText}>Text</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderGPRecommendation = ({ item }: { item: GPRecommendation }) => (
    <ThemedView style={styles.gpCard}>
      <View style={styles.gpHeader}>
        <View style={styles.gpInfo}>
          <ThemedText type="subtitle" style={styles.gpName}>
            {item.name}
          </ThemedText>
          <ThemedText style={styles.gpSpecialty}>{item.specialty}</ThemedText>
          <ThemedText style={styles.gpAddress}>{item.address}</ThemedText>
        </View>
        <View style={styles.gpRating}>
          <IconSymbol name="star.fill" size={16} color="#FFD700" />
          <ThemedText style={styles.ratingText}>{item.rating}</ThemedText>
        </View>
      </View>
      <View style={styles.gpDetails}>
        <ThemedText style={styles.gpDistance}>{item.distance} away</ThemedText>
        <ThemedText style={styles.gpPhone}>{item.phone}</ThemedText>
      </View>
      <View style={styles.gpActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#34C759' }]}
          onPress={() => handleCall(item.phone)}
        >
          <IconSymbol name="phone.fill" size={16} color="white" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
          onPress={() => handleGetDirections(item.address)}
        >
          <IconSymbol name="location.fill" size={16} color="white" />
          <Text style={styles.actionButtonText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
          onPress={() => Alert.alert('Book Appointment', 'This would open appointment booking')}
        >
          <IconSymbol name="calendar" size={16} color="white" />
          <Text style={styles.actionButtonText}>Book</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Emergency & Help
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Emergency Call Button */}
        <TouchableOpacity
          style={[styles.emergencyButton, { backgroundColor: '#FF3B30' }]}
          onPress={handleEmergencyCall}
        >
          <IconSymbol name="phone.fill" size={24} color="white" />
          <ThemedText style={styles.emergencyButtonText}>Call 911</ThemedText>
        </TouchableOpacity>

        {/* AI Assistant Button */}
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleAIAssistance}
        >
          <IconSymbol name="brain.head.profile" size={24} color="white" />
          <ThemedText style={styles.aiButtonText}>AI Medical Assistant</ThemedText>
        </TouchableOpacity>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Emergency Contacts
          </ThemedText>
          <FlatList
            data={emergencyContacts}
            renderItem={renderEmergencyContact}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* GP Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Find a Doctor
            </ThemedText>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={() => setShowGPRecommendations(!showGPRecommendations)}
            >
              <IconSymbol name="magnifyingglass" size={16} color="white" />
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {showGPRecommendations && (
            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.searchInput, { borderColor: Colors[colorScheme ?? 'light'].border }]}
                placeholder="Search for doctors or specialties..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FlatList
                data={mockGPRecommendations.filter(gp => 
                  gp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  gp.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                renderItem={renderGPRecommendation}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#34C759' }]}
              onPress={() => Alert.alert('Health Records', 'This would open health records')}
            >
              <IconSymbol name="doc.text.fill" size={20} color="white" />
              <Text style={styles.quickActionText}>Health Records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#007AFF' }]}
              onPress={() => Alert.alert('Symptoms Checker', 'This would open symptoms checker')}
            >
              <IconSymbol name="stethoscope" size={20} color="white" />
              <Text style={styles.quickActionText}>Symptoms</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#FF9500' }]}
              onPress={() => Alert.alert('Medication Info', 'This would open medication information')}
            >
              <IconSymbol name="pills.fill" size={20} color="white" />
              <Text style={styles.quickActionText}>Med Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 30,
  },
  aiButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  contactCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactNumber: {
    fontSize: 14,
    color: '#8E8E93',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    marginTop: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  gpCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  gpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gpInfo: {
    flex: 1,
  },
  gpName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gpSpecialty: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  gpAddress: {
    fontSize: 12,
    color: '#8E8E93',
  },
  gpRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  gpDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gpDistance: {
    fontSize: 14,
    color: '#8E8E93',
  },
  gpPhone: {
    fontSize: 14,
    color: '#8E8E93',
  },
  gpActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  quickActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
