// Custom hook for prescription tracking
import { useCallback, useEffect, useState } from 'react';
import { PrescriptionTrackingService } from '../services/prescription-renewal';
import {
    PrescriptionFilters,
    PrescriptionStats,
    PrescriptionWithDetails,
    UsePrescriptionTrackingReturn
} from '../types/prescription-renewal';

export function usePrescriptionTracking(patientId?: string): UsePrescriptionTrackingReturn {
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [activePrescriptions, setActivePrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [expiringPrescriptions, setExpiringPrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PrescriptionStats | null>(null);

  // Refresh prescriptions with filters
  const refreshPrescriptions = useCallback(async (filters: PrescriptionFilters = {}) => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const [allPrescriptions, active, expiring, prescriptionStats] = await Promise.all([
        PrescriptionTrackingService.getPrescriptions({
          ...filters,
          patient_id: patientId
        }),
        PrescriptionTrackingService.getActivePrescriptions(patientId),
        PrescriptionTrackingService.getExpiringPrescriptions(patientId),
        PrescriptionTrackingService.getPrescriptionStats(patientId)
      ]);
      
      setPrescriptions(allPrescriptions.data);
      setActivePrescriptions(active);
      setExpiringPrescriptions(expiring);
      setStats(prescriptionStats);
    } catch (err: any) {
      setError(err.message);
      console.error('Error refreshing prescriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Get prescription by ID
  const getPrescriptionById = useCallback(async (id: string) => {
    try {
      // For now, find in the current list
      // In a real app, you might want to fetch from API
      return prescriptions.find(p => p.id === id) || null;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [prescriptions]);

  // Update prescription status
  const updatePrescriptionStatus = useCallback(async (
    id: string, 
    status: 'active' | 'completed' | 'expired' | 'cancelled'
  ) => {
    setLoading(true);
    setError(null);

    try {
      await PrescriptionTrackingService.updatePrescriptionStatus(id, status);
      
      // Refresh the list to reflect the changes
      await refreshPrescriptions();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshPrescriptions]);

  // Load initial data
  useEffect(() => {
    if (patientId) {
      refreshPrescriptions();
    }
  }, [patientId, refreshPrescriptions]);

  return {
    prescriptions,
    activePrescriptions,
    expiringPrescriptions,
    loading,
    error,
    stats,
    refreshPrescriptions,
    getPrescriptionById,
    updatePrescriptionStatus
  };
}
