// Prescription Tracking Card Component
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { PrescriptionTrackingCardProps } from '../../types/prescription-renewal';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

export function PrescriptionTrackingCard({
  prescription,
  onRequestRenewal,
  onViewDetails,
  showRenewalButton = true
}: PrescriptionTrackingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'expired':
        return '#EF4444';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'expired':
        return 'close-circle-outline';
      case 'cancelled':
        return 'ban-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = (endDate: string | null) => {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const medicationName = prescription.items[0]?.medication?.brand_name || 
                        prescription.items[0]?.medication?.generic_name || 
                        'Unknown Medication';

  const dosage = prescription.items[0]?.medication?.strength_value && 
                prescription.items[0]?.medication?.strength_unit
    ? `${prescription.items[0].medication.strength_value} ${prescription.items[0].medication.strength_unit}`
    : null;

  const form = prescription.items[0]?.medication?.form;

  const daysUntilExpiry = getDaysUntilExpiry(prescription.end_date);
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const handleRequestRenewal = () => {
    onRequestRenewal?.(prescription.id);
  };

  const handleViewDetails = () => {
    onViewDetails?.(prescription.id);
  };

  return (
    <ThemedView style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.medicationInfo}>
          <ThemedText type="subtitle" style={styles.medicationName}>
            {medicationName}
          </ThemedText>
          {dosage && (
            <ThemedText style={styles.dosage}>
              {dosage} {form ? `• ${form}` : ''}
            </ThemedText>
          )}
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescription.status) }]}>
          <Ionicons 
            name={getStatusIcon(prescription.status) as any} 
            size={16} 
            color="white" 
          />
          <ThemedText style={styles.statusText}>
            {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
          </ThemedText>
        </View>
      </View>

      {/* Prescription Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Prescribed:</ThemedText>
          <ThemedText style={styles.detailValue}>
            {formatDate(prescription.prescribed_at)}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Start Date:</ThemedText>
          <ThemedText style={styles.detailValue}>
            {formatDate(prescription.start_date)}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>End Date:</ThemedText>
          <ThemedText style={[
            styles.detailValue,
            isExpired && { color: '#EF4444' },
            isExpiringSoon && { color: '#F59E0B' }
          ]}>
            {formatDate(prescription.end_date)}
            {daysUntilExpiry !== null && (
              <ThemedText style={styles.daysText}>
                {' '}({daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'})
              </ThemedText>
            )}
          </ThemedText>
        </View>

        {prescription.items[0]?.sig_text && (
          <View style={styles.sigContainer}>
            <ThemedText style={styles.sigLabel}>Instructions:</ThemedText>
            <ThemedText style={styles.sigText}>
              {prescription.items[0].sig_text}
            </ThemedText>
          </View>
        )}

        {prescription.items[0]?.refills_remaining !== null && (
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Refills Remaining:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {prescription.items[0]?.refills_remaining || 0}
            </ThemedText>
          </View>
        )}

        {prescription.notes && (
          <View style={styles.notesContainer}>
            <ThemedText style={styles.notesLabel}>Notes:</ThemedText>
            <ThemedText style={styles.notesText}>
              {prescription.notes}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.detailsButton} 
          onPress={handleViewDetails}
        >
          <Ionicons name="eye-outline" size={18} color="#3B82F6" />
          <ThemedText style={styles.detailsButtonText}>View Details</ThemedText>
        </TouchableOpacity>

        {showRenewalButton && prescription.status === 'active' && (
          <TouchableOpacity 
            style={[
              styles.renewalButton,
              isExpired && styles.renewalButtonDisabled
            ]} 
            onPress={handleRequestRenewal}
            disabled={isExpired}
          >
            <Ionicons 
              name="refresh-outline" 
              size={18} 
              color={isExpired ? '#9CA3AF' : 'white'} 
            />
            <ThemedText style={[
              styles.renewalButtonText,
              isExpired && styles.renewalButtonTextDisabled
            ]}>
              {isExpired ? 'Expired' : 'Request Renewal'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Expiry Warning */}
      {isExpiringSoon && !isExpired && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <ThemedText style={styles.warningText}>
            This prescription expires in {daysUntilExpiry} days. Consider requesting a renewal.
          </ThemedText>
        </View>
      )}
    </ThemedView>
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
  dosage: {
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
  daysText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sigContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  sigLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  sigText: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
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
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 6,
  },
  detailsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  renewalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    gap: 6,
  },
  renewalButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  renewalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  renewalButtonTextDisabled: {
    color: '#9CA3AF',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
});
