// Custom hook for prescription renewal management
import { useCallback, useEffect, useState } from 'react';
import { PrescriptionRenewalService } from '../services/prescription-renewal';
import {
    PrescriptionRenewalWithDetails,
    RenewalApprovalForm,
    RenewalFilters,
    RenewalRequestForm,
    RenewalStats,
    UsePrescriptionRenewalReturn
} from '../types/prescription-renewal';

export function usePrescriptionRenewal(patientId?: string): UsePrescriptionRenewalReturn {
  const [renewals, setRenewals] = useState<PrescriptionRenewalWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RenewalStats | null>(null);

  // Refresh renewals with filters
  const refreshRenewals = useCallback(async (filters: RenewalFilters = {}) => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await PrescriptionRenewalService.getRenewals({
        ...filters,
        patient_id: patientId
      });
      
      setRenewals(response.data);
      
      // Also fetch stats
      const renewalStats = await PrescriptionRenewalService.getRenewalStats(patientId);
      setStats(renewalStats);
    } catch (err: any) {
      setError(err.message);
      console.error('Error refreshing renewals:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Request renewal
  const requestRenewal = useCallback(async (request: RenewalRequestForm) => {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const newRenewal = await PrescriptionRenewalService.createRenewalRequest(request, patientId);
      
      // Refresh the list to include the new renewal
      await refreshRenewals();
      
      return newRenewal;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [patientId, refreshRenewals]);

  // Approve renewal
  const approveRenewal = useCallback(async (approval: RenewalApprovalForm) => {
    setLoading(true);
    setError(null);

    try {
      await PrescriptionRenewalService.approveRenewal(approval);
      
      // Refresh the list to reflect the changes
      await refreshRenewals();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRenewals]);

  // Get renewal by ID
  const getRenewalById = useCallback(async (id: string) => {
    try {
      return await PrescriptionRenewalService.getRenewalById(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Mark renewal as dispensed
  const markAsDispensed = useCallback(async (renewalId: string) => {
    setLoading(true);
    setError(null);

    try {
      await PrescriptionRenewalService.markAsDispensed(renewalId);
      
      // Refresh the list to reflect the changes
      await refreshRenewals();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRenewals]);

  // Load initial data
  useEffect(() => {
    if (patientId) {
      refreshRenewals();
    }
  }, [patientId, refreshRenewals]);

  return {
    renewals,
    loading,
    error,
    stats,
    refreshRenewals,
    requestRenewal,
    approveRenewal,
    getRenewalById,
    markAsDispensed
  };
}
