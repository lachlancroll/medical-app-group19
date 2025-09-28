// Prescription Renewal Card Component
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PrescriptionRenewalCardProps } from '../../types/prescription-renewal';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

export function PrescriptionRenewalCard({
  renewal,
  onPress,
  onApprove,
  onReject,
  showActions = false
}: PrescriptionRenewalCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'dispensed':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'approved':
        return 'checkmark-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      case 'dispensed':
        return 'checkmark-done-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const medicationName = renewal.prescription?.items[0]?.medication?.brand_name || 
                        renewal.prescription?.items[0]?.medication?.generic_name || 
                        'Unknown Medication';

  const handleApprove = () => {
    Alert.alert(
      'Approve Renewal',
      `Are you sure you want to approve the renewal for ${medicationName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => onApprove?.(renewal.id) }
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Renewal',
      `Are you sure you want to reject the renewal for ${medicationName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => onReject?.(renewal.id) }
      ]
    );
  };

  return (
    <TouchableOpacity onPress={() => onPress?.(renewal)}>
      <ThemedView style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.medicationInfo}>
            <ThemedText type="subtitle" style={styles.medicationName}>
              {medicationName}
            </ThemedText>
            <ThemedText style={styles.prescriptionId}>
              Prescription #{renewal.prescription_id.slice(-8)}
            </ThemedText>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(renewal.status) }]}>
            <Ionicons 
              name={getStatusIcon(renewal.status) as any} 
              size={16} 
              color="white" 
            />
            <ThemedText style={styles.statusText}>
              {renewal.status.charAt(0).toUpperCase() + renewal.status.slice(1)}
            </ThemedText>
          </View>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Requested:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatDate(renewal.request_date)}
            </ThemedText>
          </View>

          {renewal.requested_quantity && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Quantity:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {renewal.requested_quantity}
              </ThemedText>
            </View>
          )}

          {renewal.requested_refills && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Refills:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {renewal.requested_refills}
              </ThemedText>
            </View>
          )}

          {renewal.patient_notes && (
            <View style={styles.notesContainer}>
              <ThemedText style={styles.notesLabel}>Patient Notes:</ThemedText>
              <ThemedText style={styles.notesText}>
                {renewal.patient_notes}
              </ThemedText>
            </View>
          )}

          {renewal.doctor_notes && (
            <View style={styles.notesContainer}>
              <ThemedText style={styles.notesLabel}>Doctor Notes:</ThemedText>
              <ThemedText style={styles.notesText}>
                {renewal.doctor_notes}
              </ThemedText>
            </View>
          )}

          {renewal.rejection_reason && (
            <View style={styles.notesContainer}>
              <ThemedText style={[styles.notesLabel, { color: '#EF4444' }]}>
                Rejection Reason:
              </ThemedText>
              <ThemedText style={[styles.notesText, { color: '#EF4444' }]}>
                {renewal.rejection_reason}
              </ThemedText>
            </View>
          )}

          {renewal.approved_at && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Approved:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(renewal.approved_at)}
              </ThemedText>
            </View>
          )}

          {renewal.dispensed_at && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Dispensed:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(renewal.dispensed_at)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {showActions && renewal.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={handleReject}
            >
              <Ionicons name="close" size={18} color="white" />
              <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]} 
              onPress={handleApprove}
            >
              <Ionicons name="checkmark" size={18} color="white" />
              <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
    marginRight: 12,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  prescriptionId: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
