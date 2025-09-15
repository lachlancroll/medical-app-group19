// app/profile.tsx
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { supabase } from '../../supabaseClient';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  emergencyContact: string;
  medicalConditions: string[];
  allergies: string[];
  bloodType: string;
  insuranceProvider: string;
  insuranceNumber: string;
}

const emptyProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  emergencyContact: '',
  medicalConditions: [],
  allergies: [],
  bloodType: '',
  insuranceProvider: '',
  insuranceNumber: '',
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [notifications, setNotifications] = useState({
    medicationReminders: true,
    appointmentReminders: true,
    prescriptionExpiry: true,
    emergencyAlerts: true,
  });

  // -------- Load user from Supabase --------
  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      const m = (user?.user_metadata ?? {}) as any;

      setProfile({
        name: m.full_name ?? m.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? m.phone ?? '',
        dateOfBirth: m.dateOfBirth ?? m.dob ?? '',
        emergencyContact: m.emergencyContact ?? '',
        medicalConditions: Array.isArray(m.medicalConditions) ? m.medicalConditions : [],
        allergies: Array.isArray(m.allergies) ? m.allergies : [],
        bloodType: m.bloodType ?? '',
        insuranceProvider: m.insuranceProvider ?? '',
        insuranceNumber: m.insuranceNumber ?? '',
      });
    })();
  }, []);

  // Helper to persist *metadata* to Supabase
  const persistMetadata = async (next: UserProfile) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: next.name,
        phone: next.phone,
        dateOfBirth: next.dateOfBirth,
        emergencyContact: next.emergencyContact,
        medicalConditions: next.medicalConditions,
        allergies: next.allergies,
        bloodType: next.bloodType,
        insuranceProvider: next.insuranceProvider,
        insuranceNumber: next.insuranceNumber,
      },
    });
    if (error) throw error;
  };

  // -------- Actions --------
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return Alert.alert('Error', error.message);
    router.replace('/signin');
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    // local update
    const next: UserProfile = { ...profile, [editingField]: editValue } as UserProfile;
    setProfile(next);
    setShowEditModal(false);
    setEditingField(null);
    setEditValue('');

    try {
      if (editingField === 'email') {
        // Updating email triggers a confirmation email (if enabled)
        const { error } = await supabase.auth.updateUser({ email: next.email });
        if (error) throw error;
        Alert.alert('Check your email', 'Confirm the change to update your login email.');
      } else {
        await persistMetadata(next);
        Alert.alert('Saved', 'Profile updated successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update profile.');
    }
  };

  const handleRemoveItem = async (list: string[], item: string, field: keyof Pick<UserProfile, 'medicalConditions' | 'allergies'>) => {
    const updated = list.filter(i => i !== item);
    const next: UserProfile = { ...profile, [field]: updated };
    setProfile(next);
    try {
      await persistMetadata(next);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update profile.');
    }
  };

  const renderProfileField = (label: string, value: string, field: string) => (
    <TouchableOpacity
      style={styles.profileField}
      onPress={() => handleEditField(field, value)}
    >
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.fieldValueContainer}>
        <ThemedText style={styles.fieldValue}>{value || '—'}</ThemedText>
        <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header with back arrow + title + sign out */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Back to Home"
          style={styles.backBtn}
        >
          <IconSymbol name="chevron.left" size={22} color="#007AFF" />
          <ThemedText style={styles.backText}>Home</ThemedText>
        </TouchableOpacity>

        <ThemedText type="title" style={styles.title}>Profile</ThemedText>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Personal Information */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Personal Information
          </ThemedText>
          {renderProfileField('Name', profile.name, 'name')}
          {renderProfileField('Email', profile.email, 'email')}
          {renderProfileField('Phone', profile.phone, 'phone')}
          {renderProfileField('Date of Birth', profile.dateOfBirth, 'dateOfBirth')}
          {renderProfileField('Emergency Contact', profile.emergencyContact, 'emergencyContact')}
        </View>

        {/* Notification Settings (local toggles for now) */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notification Settings
          </ThemedText>
          <View style={styles.notificationItem}>
            <ThemedText style={styles.notificationLabel}>Medication Reminders</ThemedText>
            <Switch
              value={notifications.medicationReminders}
              onValueChange={(value) => setNotifications({ ...notifications, medicationReminders: value })}
              trackColor={{ false: '#E5E5EA', true: Colors[colorScheme ?? 'light'].tint }}
              thumbColor={notifications.medicationReminders ? 'white' : '#8E8E93'}
            />
          </View>
          <View style={styles.notificationItem}>
            <ThemedText style={styles.notificationLabel}>Appointment Reminders</ThemedText>
            <Switch
              value={notifications.appointmentReminders}
              onValueChange={(value) => setNotifications({ ...notifications, appointmentReminders: value })}
              trackColor={{ false: '#E5E5EA', true: Colors[colorScheme ?? 'light'].tint }}
              thumbColor={notifications.appointmentReminders ? 'white' : '#8E8E93'}
            />
          </View>
          <View style={styles.notificationItem}>
            <ThemedText style={styles.notificationLabel}>Prescription Expiry Alerts</ThemedText>
            <Switch
              value={notifications.prescriptionExpiry}
              onValueChange={(value) => setNotifications({ ...notifications, prescriptionExpiry: value })}
              trackColor={{ false: '#E5E5EA', true: Colors[colorScheme ?? 'light'].tint }}
              thumbColor={notifications.prescriptionExpiry ? 'white' : '#8E8E93'}
            />
          </View>
          <View style={styles.notificationItem}>
            <ThemedText style={styles.notificationLabel}>Emergency Alerts</ThemedText>
            <Switch
              value={notifications.emergencyAlerts}
              onValueChange={(value) => setNotifications({ ...notifications, emergencyAlerts: value })}
              trackColor={{ false: '#E5E5EA', true: Colors[colorScheme ?? 'light'].tint }}
              thumbColor={notifications.emergencyAlerts ? 'white' : '#8E8E93'}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            App Settings
        </ThemedText>
          <TouchableOpacity style={styles.settingItem}>
        <ThemedText style={styles.settingLabel}>Privacy Policy</ThemedText>
          <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
        < ThemedText style={styles.settingLabel}>Terms of Service</ThemedText>
          <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <ThemedText style={styles.settingLabel}>Help & Support</ThemedText>
          <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
        </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>About</ThemedText>
            <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
        </TouchableOpacity>

  {/* 🚪 Sign Out button */}
  <TouchableOpacity
    style={[styles.settingItem, { justifyContent: 'center' }]}
    onPress={handleSignOut}
  >
    <ThemedText style={[styles.settingLabel, { color: '#FF3B30', textAlign: 'center' }]}>
      Sign Out
    </ThemedText>
  </TouchableOpacity>
</View>

      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Edit {editingField}</ThemedText>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <IconSymbol name="xmark" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={[styles.editInput, { borderColor: Colors[colorScheme ?? 'light'].border }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              autoFocus
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={handleSaveEdit}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, marginLeft: -8 },
  backText: { marginLeft: 4, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: 'bold' },
  signOutButton: { padding: 8 },

  scrollContent: { paddingBottom: 100 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },

  profileField: {
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  fieldLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  fieldValueContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldValue: { fontSize: 16, color: '#8E8E93' },

  listField: { marginBottom: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addButton: { padding: 4 },
  listContainer: { gap: 8 },
  listItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F2F2F7', borderRadius: 8,
  },
  listItemText: { fontSize: 14, flex: 1 },

  notificationItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  notificationLabel: { fontSize: 16 },

  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  settingLabel: { fontSize: 16 },

  modalContainer: { flex: 1, paddingTop: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  modalFooter: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#E5E5EA', gap: 12,
  },
  cancelButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
