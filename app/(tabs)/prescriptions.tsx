import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { usePrescriptions } from "@/hooks/usePrescrtiptions";
import { useAuth } from "@/hooks/useAuth";
import { PrescriptionForm, PrescriptionWithDetails } from "@/types/db";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  quantity: number;
  refills: number;
  prescribedBy: string;
  prescribedDate: string;
  expiryDate: string;
  instructions: string;
  status: "active" | "expired" | "completed";
}

// Mock data for demonstration
const mockPrescriptions: Prescription[] = [
  {
    id: "1",
    medicationName: "Lisinopril",
    dosage: "10mg",
    quantity: 30,
    refills: 2,
    prescribedBy: "Dr. Smith",
    prescribedDate: "2024-01-01",
    expiryDate: "2024-07-01",
    instructions: "Take once daily with food",
    status: "active",
  },
  {
    id: "2",
    medicationName: "Metformin",
    dosage: "500mg",
    quantity: 60,
    refills: 1,
    prescribedBy: "Dr. Johnson",
    prescribedDate: "2024-01-05",
    expiryDate: "2024-07-05",
    instructions: "Take twice daily with meals",
    status: "active",
  },
  {
    id: "3",
    medicationName: "Amoxicillin",
    dosage: "250mg",
    quantity: 21,
    refills: 0,
    prescribedBy: "Dr. Brown",
    prescribedDate: "2023-12-15",
    expiryDate: "2024-01-15",
    instructions: "Take three times daily for 7 days",
    status: "expired",
  },
];

export default function PrescriptionsScreen() {
  const colorScheme = useColorScheme();
  const { user, patientProfile } = useAuth();
  const {
    prescriptions,
    activePrescriptions,
    expiringPrescriptions,
    loading,
    addPrescription,
    requestRefill,
  } = usePrescriptions(patientProfile?.user_id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrescription, setNewPrescription] = useState<PrescriptionForm>({
    patient_id: patientProfile?.user_id || '',
    doctor_id: "",
    appointment_id: "",
    start_date: "",
    end_date: "",
    repeats_total: 0,
    generic_substitution: false,
    notes: "",
    prescription_items: [],
  });

  const handleAddPrescription = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Please sign in to add prescriptions");
      return;
    }

    try {
      await addPrescription(newPrescription, user.id);
      setShowAddModal(false);
      setNewPrescription({
        patient_id: patientProfile?.user_id || '',
        doctor_id: "",
        appointment_id: "",
        start_date: "",
        end_date: "",
        repeats_total: 0,
        generic_substitution: false,
        notes: "",
        prescription_items: [],
      });
      Alert.alert("Success", "Prescription added successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to add prescription");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#34C759";
      case "expired":
        return "#FF3B30";
      case "completed":
        return "#8E8E93";
      default:
        return "#8E8E93";
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 30 && diffDays > 0;
  };

  const renderPrescription = ({ item }: { item: PrescriptionWithDetails }) => (
    <ThemedView style={styles.prescriptionCard}>
      <View style={styles.prescriptionHeader}>
        <View style={styles.medicationInfo}>
          <ThemedText type="subtitle" style={styles.medicationName}>
            {item.prescription_items?.[0]?.medication?.generic_name ||
              "Unknown Medication"}
          </ThemedText>
          <ThemedText style={styles.medicationDosage}>
            {item.prescription_items?.[0]?.medication?.strength_value}{" "}
            {item.prescription_items?.[0]?.medication?.strength_unit}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.prescriptionDetails}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Prescribed by:</ThemedText>
          <ThemedText style={styles.detailValue}>
            {item.doctor?.profile?.full_name || "Unknown Doctor"}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Prescribed:</ThemedText>
          <ThemedText style={styles.detailValue}>
            {formatDate(item.prescribed_at)}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Expires:</ThemedText>
          <ThemedText
            style={[
              styles.detailValue,
              isExpiringSoon(item.end_date) && { color: "#FF9500" },
            ]}
          >
            {formatDate(item.end_date)}
            {isExpiringSoon(item.end_date) && " (Expiring Soon)"}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Refills left:</ThemedText>
          <ThemedText style={styles.detailValue}>
            {item.repeats_remaining}
          </ThemedText>
        </View>
      </View>

      {item.prescription_items?.[0]?.sig_text && (
        <View style={styles.instructionsContainer}>
          <ThemedText style={styles.instructionsLabel}>
            Instructions:
          </ThemedText>
          <ThemedText style={styles.instructionsText}>
            {item.prescription_items[0].sig_text}
          </ThemedText>
        </View>
      )}

      {item.status === "active" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.refillButton}
            onPress={() => requestRefill(item.id)}
          >
            <IconSymbol name="arrow.clockwise" size={16} color="#007AFF" />
            <Text style={styles.refillButtonText}>Request Refill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <IconSymbol name="phone" size={16} color="#007AFF" />
            <Text style={styles.contactButtonText}>Contact Doctor</Text>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Prescriptions
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: Colors[colorScheme ?? "light"].tint },
          ]}
          onPress={() => setShowAddModal(true)}
        >
          <IconSymbol name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={prescriptions}
        renderItem={renderPrescription}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="doc.text.fill" size={48} color="#8E8E93" />
            <ThemedText style={styles.emptyText}>
              No prescriptions found
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap the + button to add your first prescription
            </ThemedText>
          </ThemedView>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Add Prescription</ThemedText>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <IconSymbol name="xmark" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Medication Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newPrescription.medicationName}
                onChangeText={(text) =>
                  setNewPrescription({
                    ...newPrescription,
                    medicationName: text,
                  })
                }
                placeholder="e.g., Lisinopril"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Dosage</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newPrescription.dosage}
                onChangeText={(text) =>
                  setNewPrescription({ ...newPrescription, dosage: text })
                }
                placeholder="e.g., 10mg"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Quantity</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newPrescription.quantity}
                onChangeText={(text) =>
                  setNewPrescription({ ...newPrescription, quantity: text })
                }
                placeholder="e.g., 30"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Refills</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newPrescription.refills}
                onChangeText={(text) =>
                  setNewPrescription({ ...newPrescription, refills: text })
                }
                placeholder="e.g., 2"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Prescribed By</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newPrescription.prescribedBy}
                onChangeText={(text) =>
                  setNewPrescription({ ...newPrescription, prescribedBy: text })
                }
                placeholder="e.g., Dr. Smith"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Instructions</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newPrescription.instructions}
                onChangeText={(text) =>
                  setNewPrescription({ ...newPrescription, instructions: text })
                }
                placeholder="e.g., Take once daily with food"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
              ]}
              onPress={handleAddPrescription}
            >
              <ThemedText style={styles.saveButtonText}>
                Add Prescription
              </ThemedText>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 100,
  },
  prescriptionCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  prescriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#8E8E93",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  prescriptionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#8E8E93",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  instructionsContainer: {
    marginBottom: 12,
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  refillButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  refillButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  contactButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
