// Renewal Request Modal Component
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { RenewalRequestForm, RenewalRequestModalProps } from '../../types/prescription-renewal';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

export function RenewalRequestModal({
  visible,
  onClose,
  onSubmit,
  prescriptionId,
  medicationName,
  loading = false
}: RenewalRequestModalProps) {
  const [formData, setFormData] = useState<RenewalRequestForm>({
    prescription_id: prescriptionId,
    requested_quantity: null,
    requested_refills: null,
    patient_notes: ''
  });

  const handleSubmit = async () => {
    if (!formData.prescription_id) {
      Alert.alert('Error', 'Prescription ID is required');
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        prescription_id: prescriptionId,
        requested_quantity: null,
        requested_refills: null,
        patient_notes: ''
      });
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      prescription_id: prescriptionId,
      requested_quantity: null,
      requested_refills: null,
      patient_notes: ''
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Request Renewal
          </ThemedText>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Medication Info */}
          <View style={styles.medicationInfo}>
            <ThemedText style={styles.medicationName}>
              {medicationName}
            </ThemedText>
            <ThemedText style={styles.prescriptionId}>
              Prescription #{prescriptionId.slice(-8)}
            </ThemedText>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Quantity */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                Requested Quantity (optional)
              </ThemedText>
              <TextInput
                style={styles.input}
                value={formData.requested_quantity?.toString() || ''}
                onChangeText={(text) => {
                  const quantity = text ? parseInt(text, 10) : null;
                  setFormData(prev => ({ ...prev, requested_quantity: quantity }));
                }}
                placeholder="Enter quantity needed"
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            {/* Refills */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                Requested Refills (optional)
              </ThemedText>
              <TextInput
                style={styles.input}
                value={formData.requested_refills?.toString() || ''}
                onChangeText={(text) => {
                  const refills = text ? parseInt(text, 10) : null;
                  setFormData(prev => ({ ...prev, requested_refills: refills }));
                }}
                placeholder="Enter number of refills"
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            {/* Patient Notes */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                Additional Notes (optional)
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.patient_notes || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, patient_notes: text }))}
                placeholder="Any additional information for your doctor..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <ThemedText style={styles.infoText}>
                Your renewal request will be reviewed by your doctor
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <ThemedText style={styles.infoText}>
                You'll be notified once your request is approved or rejected
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleClose}
            disabled={loading}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ThemedText style={styles.submitButtonText}>Submitting...</ThemedText>
            ) : (
              <>
                <Ionicons name="send" size={18} color="white" />
                <ThemedText style={styles.submitButtonText}>Submit Request</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  medicationInfo: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 20,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  prescriptionId: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  footer: {
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
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    gap: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
