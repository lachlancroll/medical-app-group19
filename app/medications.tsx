// app/medications.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

// ---------- Types aligned with your schema ----------
type Medication = {
  id: string;
  generic_name: string | null;
  brand_name?: string | null;
  form?: string | null;
  strength_value: number | null;
  strength_unit: string | null;
};

type PrescribedItem = {
  id: string; // prescription_items.id
  sig_text: string | null;
  medication: Medication | null;
  // parent prescription fields (flattened onto the item)
  prescription_id: string;
  prescribed_at: string; // timestamp
  start_date: string | null; // date
  end_date: string | null; // date
  status: string; // 'active' | ...
};

// ---------- helpers ----------
async function ensurePatientProfile(uid: string) {
  const { error } = await supabase
    .from("patient_profiles")
    .upsert({ user_id: uid }, { onConflict: "user_id" });
  if (error) throw error;
}

// created_by in prescriptions points to public.users(id)
async function ensureAppUserRow(uid: string) {
  const { data: u } = await supabase.auth.getUser();
  const email = u?.user?.email ?? null;
  const { error } = await supabase
    .from("users")
    .upsert({ id: uid, email }, { onConflict: "id" });
  if (error) throw error;
}

// find a doctor linked to this patient via the join table
async function getLinkedDoctorId(patientId: string): Promise<string> {
  const { data, error } = await supabase
    .from("doctor_patient")
    .select("doctor_id")
    .eq("patient_id", patientId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const doctorId = data?.doctor_id as string | undefined;
  if (!doctorId) {
    throw new Error(
      "No linked doctor found for this patient. Ask an admin to add a row in doctor_patient."
    );
  }
  return doctorId;
}

export default function MedicationsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PrescribedItem[]>([]);

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [medId, setMedId] = useState("");
  const [sig, setSig] = useState("");

  // -------- Load current user and fetch their prescriptions --------
  const fetchForCurrentUser = useCallback(async () => {
    setLoading(true);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error(userErr);
      setItems([]);
      setLoading(false);
      return;
    }
    const uid = userData.user?.id;
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        prescribed_at,
        start_date,
        end_date,
        status,
        items:prescription_items (
          id,
          sig_text,
          medication:medications (
            id,
            generic_name,
            brand_name,
            form,
            strength_value,
            strength_unit
          )
        )
      `)
      .eq("patient_id", uid)
      .order("prescribed_at", { ascending: false });

    if (error) {
      console.error(error);
      setItems([]);
      setLoading(false);
      return;
    }

    const flattened: PrescribedItem[] =
      (data ?? []).flatMap((p: any) =>
        (p.items ?? []).map((it: any) => ({
          id: it.id,
          sig_text: it.sig_text,
          medication: it.medication ?? null,
          prescription_id: p.id,
          prescribed_at: p.prescribed_at,
          start_date: p.start_date,
          end_date: p.end_date,
          status: p.status,
        }))
      );

    setItems(flattened);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForCurrentUser();
  }, []);

  // Optional grouping
  const { activeItems, otherItems } = useMemo(() => {
    const a = items.filter((i) => i.status === "active");
    const o = items.filter((i) => i.status !== "active");
    return { activeItems: a, otherItems: o };
  }, [items]);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";

  const renderItem = ({ item }: { item: PrescribedItem }) => {
    const name =
      item.medication?.brand_name ||
      item.medication?.generic_name ||
      "Medication";

    const doseParts = [
      item.medication?.strength_value ?? undefined,
      item.medication?.strength_unit ?? undefined,
    ].filter(Boolean);

    return (
      <ThemedView style={styles.medicationCard}>
        <View style={styles.medicationHeader}>
          <View style={styles.medicationInfo}>
            <ThemedText type="subtitle" style={styles.medicationName}>
              {name}
            </ThemedText>
            {!!doseParts.length && (
              <ThemedText style={styles.medicationDosage}>
                {doseParts.join(" ")}{" "}
                {item.medication?.form ? `• ${item.medication.form}` : ""}
              </ThemedText>
            )}
          </View>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: item.status === "active" ? "#34C759" : "#CBD5E1" },
            ]}
          >
            <ThemedText style={styles.statusText}>{item.status}</ThemedText>
          </View>
        </View>

        {!!item.sig_text && (
          <ThemedText style={styles.sigText}>{item.sig_text}</ThemedText>
        )}

        <View style={styles.rxMetaRow}>
          <ThemedText style={styles.rxMetaLabel}>Prescribed</ThemedText>
          <ThemedText style={styles.rxMetaValue}>
            {formatDate(item.prescribed_at)}
          </ThemedText>
        </View>
        <View style={styles.rxMetaRow}>
          <ThemedText style={styles.rxMetaLabel}>Start</ThemedText>
          <ThemedText style={styles.rxMetaValue}>
            {formatDate(item.start_date)}
          </ThemedText>
        </View>
        <View style={styles.rxMetaRow}>
          <ThemedText style={styles.rxMetaLabel}>End</ThemedText>
          <ThemedText style={styles.rxMetaValue}>
            {formatDate(item.end_date)}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  // -------- Add medication: ensure FK targets, get linked doctor, insert --------
  const handleAddMedication = async () => {
    try {
      if (!medId.trim() || !sig.trim()) {
        Alert.alert("Missing info", "Enter a Medication ID and SIG.");
        return;
      }

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr || !u?.user?.id) throw new Error("Not signed in.");
      const uid = u.user.id;

      // ensure FK targets exist
      await ensurePatientProfile(uid);
      await ensureAppUserRow(uid);

      // create prescription
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert([{ patient_id: uid, created_by: uid }])
        .select("id")
        .single();
      if (rxErr) throw rxErr;

      // add prescription item
      const { error: itemErr } = await supabase
        .from("prescription_items")
        .insert([
          {
            prescription_id: rx.id,
            medication_id: medId.trim(),
            sig_text: sig.trim(),
          },
        ]);
      if (itemErr) throw itemErr;

      setShowAdd(false);
      setMedId("");
      setSig("");
      await fetchForCurrentUser();
      Alert.alert("Added", "Medication added to your prescriptions.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add medication.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with back arrow + title + actions */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          accessibilityLabel="Back to Home"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#007AFF" />
        </TouchableOpacity>

        <ThemedText type="title" style={styles.title}>
          Medications
        </ThemedText>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            accessibilityLabel="Add medication"
            style={[styles.iconBtn, { backgroundColor: "#10B981" }]}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={fetchForCurrentUser}
            accessibilityLabel="Refresh"
            style={[styles.iconBtn, { backgroundColor: Colors[colorScheme ?? "light"].tint }]}
          >
            <Ionicons name="refresh" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ThemedText>Loading medications...</ThemedText>
      ) : (
        <FlatList
          data={[...activeItems, ...otherItems]}
          renderItem={renderItem}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="pill" size={48} color="#8E8E93" />
              <ThemedText style={styles.emptyText}>No prescriptions found</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Prescriptions will appear here after your clinician adds them.
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Add Medication Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={{ flex: 1, paddingTop: 60 }}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Add Medication</ThemedText>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
            <View>
              <ThemedText style={styles.inputLabel}>Medication ID</ThemedText>
              <TextInput
                value={medId}
                onChangeText={setMedId}
                placeholder="UUID from medications table"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
            <View>
              <ThemedText style={styles.inputLabel}>SIG / Directions</ThemedText>
              <TextInput
                value={sig}
                onChangeText={setSig}
                placeholder="e.g., 1 tablet by mouth twice daily"
                multiline
                style={[styles.input, { minHeight: 90 }]}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAdd(false)}>
              <View style={styles.btnContent}>
                <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#10B981" }]}
              onPress={handleAddMedication}
            >
              <View style={styles.btnContent}>
                <MaterialCommunityIcons name="pill" size={18} color="white" />
                <ThemedText style={styles.saveButtonText}>Add</ThemedText>
              </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 28, fontWeight: "bold" },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  listContainer: { paddingBottom: 100 },

  medicationCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  medicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medicationInfo: { flex: 1 },
  medicationName: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  medicationDosage: { fontSize: 14, color: "#8E8E93" },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "white", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },

  sigText: { fontSize: 14, color: "#4B5563", fontStyle: "italic", marginBottom: 12 },

  rxMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  rxMetaLabel: { fontSize: 12, color: "#64748B" },
  rxMetaValue: { fontSize: 12, fontWeight: "600" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#8E8E93", textAlign: "center" },

  // Modal styles
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  inputLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderColor: "#E5E5EA",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    gap: 12,
  },
  btnContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
