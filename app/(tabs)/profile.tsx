import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    dateOfBirth: '1990-01-01',
    emergencyContact: '+1-555-0456',
    medicalConditions: ['Hypertension', 'Diabetes Type 2'],
    allergies: ['Penicillin', 'Shellfish'],
    bloodType: 'O+',
    insuranceProvider: 'Blue Cross Blue Shield',
    insuranceNumber: 'BC123456789',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [notifications, setNotifications] = useState({
    medicationReminders: true,
    appointmentReminders: true,
    prescriptionExpiry: true,
    emergencyAlerts: true,
  });

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('authed');
      router.replace('/signin');
    } catch (e) {
      Alert.alert('Error', 'Could not sign out. Please try again.');
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (editingField) {
      setProfile({ ...profile, [editingField]: editValue });
      setShowEditModal(false);
      setEditingField(null);
      setEditValue('');
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const handleAddMedicalCondition = () => {
    Alert.prompt(
      'Add Medical Condition',
      'Enter a medical condition:',
      (text) => {
        if (text) {
          setProfile({
            ...profile,
            medicalConditions: [...profile.medicalConditions, text],
          });
        }
      }
    );
  };

  const handleAddAllergy = () => {
    Alert.prompt(
      'Add Allergy',
      'Enter an allergy:',
      (text) => {
        if (text) {
          setProfile({
            ...profile,
            allergies: [...profile.allergies, text],
          });
        }
      }
    );
  };

  const handleRemoveItem = (list: string[], item: string, field: string) => {
    const updatedList = list.filter(i => i !== item);
    setProfile({ ...profile, [field]: updatedList });
  };

  const renderProfileField = (label: string, value: string, field: string) => (
    <TouchableOpacity
      style={styles.profileField}
      onPress={() => handleEditField(field, value)}
    >
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.fieldValueContainer}>
        <ThemedText style={styles.fieldValue}>{value}</ThemedText>
        <IconSymbol name="chevron.right" size={16} color="#8E8E93" />
      </View>
    </TouchableOpacity>
  );

  const renderListField = (label: string, items: string[], field: string) => (
    <View style={styles.listField}>
      <View style={styles.listHeader}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={field === 'medicalConditions' ? handleAddMedicalCondition : handleAddAllergy}
        >
          <IconSymbol name="plus" size={16} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
      </View>
      <View style={styles.listContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <ThemedText style={styles.listItemText}>{item}</ThemedText>
            <TouchableOpacity
              onPress={() => handleRemoveItem(items, item, field)}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
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

        {/* Medical Information */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Medical Information
          </ThemedText>
          {renderProfileField('Blood Type', profile.bloodType, 'bloodType')}
          {renderListField('Medical Conditions', profile.medicalConditions, 'medicalConditions')}
          {renderListField('Allergies', profile.allergies, 'allergies')}
        </View>

        {/* Insurance Information */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Insurance Information
          </ThemedText>
          {renderProfileField('Provider', profile.insuranceProvider, 'insuranceProvider')}
          {renderProfileField('Policy Number', profile.insuranceNumber, 'insuranceNumber')}
        </View>

        {/* Notification Settings */}
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
            <ThemedText style={styles.settingLabel}>Terms of Service</ThemedText>
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
        </View>
      </ScrollView>

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditModal(false)}
            >
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
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  profileField: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 16,
    color: '#8E8E93',
  },
  listField: {
    marginBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  listItemText: {
    fontSize: 14,
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  notificationLabel: {
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingLabel: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
