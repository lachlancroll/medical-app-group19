import { useState, useEffect } from 'react';
import { getPrescriptions, getActivePrescriptions, getExpiringPrescriptions, createPrescription, requestRefill, updatePrescriptionStatus } from '@/services/prescriptions';
import { PrescriptionWithDetails, PrescriptionForm } from '@/types/db';

export function usePrescriptions(patientId: string) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [activePrescriptions, setActivePrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [expiringPrescriptions, setExpiringPrescriptions] = useState<PrescriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [allPrescriptions, active, expiring] = await Promise.all([
        getPrescriptions(patientId),
        getActivePrescriptions(patientId),
        getExpiringPrescriptions(patientId)
      ]);
      setPrescriptions(allPrescriptions);
      setActivePrescriptions(active);
      setExpiringPrescriptions(expiring);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addPrescription = async (prescription: PrescriptionForm, createdBy: string) => {
    try {
      const newPrescription = await createPrescription(prescription, createdBy);
      await refresh(); // Refresh the list
      return newPrescription;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const requestRefillPrescription = async (prescriptionId: string) => {
    try {
      const updatedPrescription = await requestRefill(prescriptionId);
      await refresh(); // Refresh the list
      return updatedPrescription;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const markAsCompleted = async (prescriptionId: string) => {
    try {
      await updatePrescriptionStatus(prescriptionId, 'completed');
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const markAsExpired = async (prescriptionId: string) => {
    try {
      await updatePrescriptionStatus(prescriptionId, 'expired');
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  useEffect(() => {
    if (patientId) {
      refresh();
    }
  }, [patientId]);

  return {
    prescriptions,
    activePrescriptions,
    expiringPrescriptions,
    loading,
    error,
    refresh,
    addPrescription,
    requestRefill: requestRefillPrescription,
    markAsCompleted,
    markAsExpired,
  };
}
