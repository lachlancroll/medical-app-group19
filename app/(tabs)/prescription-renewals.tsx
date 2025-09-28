// Prescription Renewals Screen
import { PrescriptionRenewalCard } from '@/components/prescription-renewal/PrescriptionRenewalCard';
import { PrescriptionTrackingCard } from '@/components/prescription-renewal/PrescriptionTrackingCard';
import { RenewalRequestModal } from '@/components/prescription-renewal/RenewalRequestModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePrescriptionRenewal } from '@/hooks/usePrescriptionRenewal';
import { usePrescriptionTracking } from '@/hooks/usePrescriptionTracking';
import { PrescriptionFilters, RenewalFilters } from '@/types/prescription-renewal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function PrescriptionRenewalsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<{
    id: string;
    medicationName: string;
  } | null>(null);
  const [filters, setFilters] = useState<RenewalFilters>({});
  const [prescriptionFilters, setPrescriptionFilters] = useState<PrescriptionFilters>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'dispensed'>('all');
  const [activeTab, setActiveTab] = useState<'renewals' | 'tracking'>('renewals');

  // Get current user ID (in a real app, this would come from auth context)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const {
    renewals,
    loading: renewalsLoading,
    error: renewalsError,
    stats,
    refreshRenewals,
    requestRenewal,
    approveRenewal
  } = usePrescriptionRenewal(currentUserId || undefined);

  const {
    prescriptions,
    activePrescriptions,
    expiringPrescriptions,
    loading: prescriptionsLoading,
    error: prescriptionsError,
    stats: prescriptionStats,
    refreshPrescriptions
  } = usePrescriptionTracking(currentUserId || undefined);

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      refreshRenewals(filters);
      refreshPrescriptions(prescriptionFilters);
    }
  }, [currentUserId, filters, prescriptionFilters, refreshRenewals, refreshPrescriptions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'renewals') {
      await refreshRenewals(filters);
    } else {
      await refreshPrescriptions(prescriptionFilters);
    }
    setRefreshing(false);
  };

  const handleFilterChange = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    if (filter === 'all') {
      setFilters({});
    } else {
      setFilters({ status: [filter] });
    }
  };

  const handleRequestRenewal = (prescriptionId: string, medicationName?: string) => {
    setSelectedPrescription({ 
      id: prescriptionId, 
      medicationName: medicationName || 'Unknown Medication' 
    });
    setShowRequestModal(true);
  };

  const handleSubmitRenewalRequest = async (request: any) => {
    try {
      await requestRenewal(request);
      setShowRequestModal(false);
      setSelectedPrescription(null);
      Alert.alert('Success', 'Renewal request submitted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit renewal request');
    }
  };

  const handleApproveRenewal = async (renewalId: string) => {
    try {
      await approveRenewal({
        renewal_id: renewalId,
        approved: true,
        doctor_notes: 'Approved via mobile app'
      });
      Alert.alert('Success', 'Renewal approved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve renewal');
    }
  };

  const handleRejectRenewal = async (renewalId: string) => {
    Alert.prompt(
      'Reject Renewal',
      'Please provide a reason for rejection:',
      async (reason) => {
        if (reason) {
          try {
            await approveRenewal({
              renewal_id: renewalId,
              approved: false,
              rejection_reason: reason
            });
            Alert.alert('Success', 'Renewal rejected successfully');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reject renewal');
          }
        }
      }
    );
  };

  const renderRenewalCard = ({ item }: { item: any }) => (
    <PrescriptionRenewalCard
      renewal={item}
      onPress={(renewal) => {
        // Navigate to renewal details
        console.log('Navigate to renewal details:', renewal.id);
      }}
      onApprove={handleApproveRenewal}
      onReject={handleRejectRenewal}
      showActions={true} // Show actions for doctors
    />
  );

  const renderPrescriptionCard = ({ item }: { item: any }) => (
    <PrescriptionTrackingCard
      prescription={item}
      onRequestRenewal={(prescriptionId) => {
        const medicationName = item.items[0]?.medication?.brand_name || 
                              item.items[0]?.medication?.generic_name || 
                              'Unknown Medication';
        handleRequestRenewal(prescriptionId, medicationName);
      }}
      onViewDetails={(prescriptionId) => {
        // Navigate to prescription details
        console.log('Navigate to prescription details:', prescriptionId);
      }}
      showRenewalButton={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'renewals' ? 'document-text-outline' : 'medical-outline'} 
        size={48} 
        color="#8E8E93" 
      />
      <ThemedText style={styles.emptyText}>
        {activeTab === 'renewals' ? 'No renewals found' : 'No prescriptions found'}
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        {activeTab === 'renewals' 
          ? (activeFilter === 'all' 
              ? 'You don\'t have any prescription renewals yet'
              : `No ${activeFilter} renewals found`)
          : 'Your prescriptions will appear here once they are added by your doctor'
        }
      </ThemedText>
    </View>
  );

  const renderStats = () => {
    if (activeTab === 'renewals' && !stats) return null;
    if (activeTab === 'tracking' && !prescriptionStats) return null;

    const currentStats = activeTab === 'renewals' ? stats : prescriptionStats;

    if (activeTab === 'renewals') {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{stats?.total_renewals || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Total</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#F59E0B' }]}>
              {stats?.pending_renewals || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Pending</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#10B981' }]}>
              {stats?.approved_renewals || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Approved</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#3B82F6' }]}>
              {stats?.dispensed_renewals || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Dispensed</ThemedText>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{prescriptionStats?.total_prescriptions || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Total</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#10B981' }]}>
              {prescriptionStats?.active_prescriptions || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Active</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#F59E0B' }]}>
              {prescriptionStats?.expiring_soon || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Expiring Soon</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: '#EF4444' }]}>
              {prescriptionStats?.expired_prescriptions || 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Expired</ThemedText>
          </View>
        </View>
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <ThemedText type="title" style={styles.title}>
          {activeTab === 'renewals' ? 'Prescription Renewals' : 'Prescription Tracking'}
        </ThemedText>

        <TouchableOpacity
          onPress={() => {
            if (activeTab === 'renewals') {
              // Show prescription selection modal for renewal request
              Alert.alert('Select Prescription', 'Please select a prescription from the tracking tab to request a renewal.');
            } else {
              // Refresh prescriptions
              handleRefresh();
            }
          }}
          accessibilityLabel={activeTab === 'renewals' ? 'Request Renewal' : 'Refresh'}
          style={styles.addButton}
        >
          <Ionicons 
            name={activeTab === 'renewals' ? 'add' : 'refresh'} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'renewals' && styles.activeTab]}
          onPress={() => setActiveTab('renewals')}
        >
          <Ionicons 
            name="document-text-outline" 
            size={20} 
            color={activeTab === 'renewals' ? '#3B82F6' : '#6B7280'} 
          />
          <ThemedText style={[
            styles.tabText,
            activeTab === 'renewals' && styles.activeTabText
          ]}>
            Renewals
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tracking' && styles.activeTab]}
          onPress={() => setActiveTab('tracking')}
        >
          <Ionicons 
            name="medical-outline" 
            size={20} 
            color={activeTab === 'tracking' ? '#3B82F6' : '#6B7280'} 
          />
          <ThemedText style={[
            styles.tabText,
            activeTab === 'tracking' && styles.activeTabText
          ]}>
            Tracking
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Filters - Only show for renewals tab */}
      {activeTab === 'renewals' && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
              { key: 'dispensed', label: 'Dispensed' }
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  activeFilter === filter.key && styles.activeFilterButton
                ]}
                onPress={() => handleFilterChange(filter.key as typeof activeFilter)}
              >
                <ThemedText
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter.key && styles.activeFilterButtonText
                  ]}
                >
                  {filter.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content List */}
      <FlatList
        data={activeTab === 'renewals' ? renewals : prescriptions}
        renderItem={activeTab === 'renewals' ? renderRenewalCard : renderPrescriptionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Renewal Request Modal */}
      <RenewalRequestModal
        visible={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedPrescription(null);
        }}
        onSubmit={handleSubmitRenewalRequest}
        prescriptionId={selectedPrescription?.id || ''}
        medicationName={selectedPrescription?.medicationName || ''}
        loading={renewalsLoading}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#EBF4FF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
