// app/medications.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  prescription_id: string;
  prescribed_at: string;
  start_date: string | null;
  end_date: string | null;
  status: string; // 'active' | ...
};

type MedOption = {
  id: string;
  label: string;     // "Panadol (Paracetamol) 500 mg tablet"
  sublabel?: string; // e.g., "ATC: N02BE01"
};

// ---------- helpers ----------
async function ensurePatientProfile(uid: string) {
  const { error } = await supabase
    .from("patient_profiles")
    .upsert({ user_id: uid }, { onConflict: "user_id" });
  if (error) throw error;
}

async function ensureAppUserRow(uid: string) {
  const { data: u } = await supabase.auth.getUser();
  const email = u?.user?.email ?? null;
  const { error } = await supabase.from("users").upsert({ id: uid, email }, { onConflict: "id" });
  if (error) throw error;
}

// ---------- Component ----------
export default function MedicationsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PrescribedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Track IDs to prevent duplicates when optimistic add + realtime both occur
  const seenItemIdsRef = useRef<Set<string>>(new Set());

  // -------- Add modal state --------
  const [showAdd, setShowAdd] = useState(false);
  const [medId, setMedId] = useState("");
  const [sig, setSig] = useState("");

  // -------- Medication dropdown/search state --------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [medLoading, setMedLoading] = useState(false);
  const [medOptions, setMedOptions] = useState<MedOption[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedOption | null>(null);

  // Load and cache current user ID early
  useEffect(() => {
    (async () => {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error);
        setCurrentUserId(null);
        return;
      }
      const uid = userData.user?.id ?? null;
      setCurrentUserId(uid);
    })();
  }, []);

  // -------- Load current user's prescriptions --------
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

    // update seen ids
    const s = new Set<string>();
    flattened.forEach((i) => s.add(i.id));
    seenItemIdsRef.current = s;

    setItems(flattened);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForCurrentUser();
  }, []);

  // -------- Realtime subscription --------
  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to INSERT/UPDATE/DELETE on prescription_items
    const channel = supabase
      .channel(`rx-items:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prescription_items" },
        async (payload: RealtimePostgresInsertPayload<any>) => {
          try {
            const row = payload.new as {
              id: string;
              prescription_id: string;
              medication_id: string;
              sig_text: string | null;
            };

            // Avoid duplicates if we already have it (optimistic add or previously loaded)
            if (seenItemIdsRef.current.has(row.id)) return;

            // Fetch the parent prescription; ensure it belongs to current user (RLS should already enforce, but double-check)
            const { data: rx, error: rxErr } = await supabase
              .from("prescriptions")
              .select("id, patient_id, prescribed_at, start_date, end_date, status")
              .eq("id", row.prescription_id)
              .maybeSingle();

            if (rxErr || !rx) return;
            if (rx.patient_id !== currentUserId) return; // not mine → ignore

            // Fetch medication details
            const { data: medRow, error: medErr } = await supabase
              .from("medications")
              .select("id, generic_name, brand_name, form, strength_value, strength_unit")
              .eq("id", row.medication_id)
              .maybeSingle();

            if (medErr) {
              console.error(medErr);
              return;
            }

            const newItem: PrescribedItem = {
              id: row.id,
              sig_text: row.sig_text,
              medication: (medRow ?? null) as Medication | null,
              prescription_id: row.prescription_id,
              prescribed_at: rx.prescribed_at ?? new Date().toISOString(),
              start_date: rx.start_date,
              end_date: rx.end_date,
              status: rx.status ?? "active",
            };

            setItems((prev) => {
              if (prev.some((p) => p.id === row.id)) return prev;
              const next = [newItem, ...prev];
              seenItemIdsRef.current.add(row.id);
              return next;
            });
          } catch (e) {
            console.error("Realtime INSERT handler error:", e);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "prescription_items" },
        async (payload) => {
          const row = payload.new as { id: string; sig_text: string | null };
          setItems((prev) =>
            prev.map((p) => (p.id === row.id ? { ...p, sig_text: row.sig_text } : p))
          );
          seenItemIdsRef.current.add(row.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "prescription_items" },
        async (payload) => {
          const row = payload.old as { id: string };
          setItems((prev) => prev.filter((p) => p.id !== row.id));
          seenItemIdsRef.current.delete(row.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // -------- Optional grouping --------
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

  // -------- Medication search (server-side) --------
  const fetchMedications = useCallback(
    async (q: string) => {
      setMedLoading(true);

      const orFilter = q?.trim()
        ? `generic_name.ilike.%${q.trim()}%,brand_name.ilike.%${q.trim()}%`
        : undefined;

      let query = supabase
        .from("medications")
        .select("id, generic_name, brand_name, form, strength_value, strength_unit, atc_code")
        .order("generic_name", { ascending: true })
        .limit(50);

      if (orFilter) query = query.or(orFilter);

      const { data, error } = await query;
      setMedLoading(false);

      if (error) {
        console.error(error);
        Alert.alert("Error", "Couldn't load medications.");
        setMedOptions([]);
        return;
      }

      const opts: MedOption[] = (data ?? []).map((m: any) => {
        const main =
          (m.brand_name ? `${m.brand_name} (${m.generic_name})` : m.generic_name) ?? "Medication";

        const dose = [m.strength_value, m.strength_unit].filter(Boolean).join(" ");
        const form = m.form ? ` ${m.form}` : "";
        const label = [main, dose || "", form].join("").trim();

        return {
          id: m.id,
          label: label || main,
          sublabel: m.atc_code ? `ATC: ${m.atc_code}` : undefined,
        };
      });

      setMedOptions(opts);
    },
    []
  );

  // Debounce search while modal open
  useEffect(() => {
    if (!showAdd) return;
    const t = setTimeout(() => fetchMedications(medSearch), 200);
    return () => clearTimeout(t);
  }, [showAdd, medSearch, fetchMedications]);

  // Initial load when opening the Add modal
  useEffect(() => {
    if (showAdd) fetchMedications("");
  }, [showAdd, fetchMedications]);

  // -------- Add medication flow (optimistic prepend) --------
  const handleAddMedication = async () => {
    try {
      if (!medId.trim()) {
        Alert.alert("Select a medication", "Please choose a medication from the list.");
        return;
      }
      if (!sig.trim()) {
        Alert.alert("Missing SIG", "Please enter directions for use.");
        return;
      }

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr || !u?.user?.id) throw new Error("Not signed in.");
      const uid = u.user.id;

      await ensurePatientProfile(uid);
      await ensureAppUserRow(uid);

      // Create prescription and return metadata we need to render immediately
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert([{ patient_id: uid, created_by: uid }])
        .select("id, prescribed_at, start_date, end_date, status")
        .single();
      if (rxErr) throw rxErr;

      // Insert the item and return its id + sig_text
      const { data: itemRow, error: itemErr } = await supabase
        .from("prescription_items")
        .insert([
          {
            prescription_id: rx.id,
            medication_id: medId.trim(),
            sig_text: sig.trim(),
          },
        ])
        .select("id, sig_text")
        .single();
      if (itemErr) throw itemErr;

      // Fetch the medication row to render details
      const { data: medRow, error: medErr } = await supabase
        .from("medications")
        .select("id, generic_name, brand_name, form, strength_value, strength_unit")
        .eq("id", medId.trim())
        .single();
      if (medErr) throw medErr;

      // Build the prescribed item and prepend to list (optimistic UI)
      const newItem: PrescribedItem = {
        id: itemRow.id,
        sig_text: itemRow.sig_text,
        medication: medRow as Medication,
        prescription_id: rx.id,
        prescribed_at: rx.prescribed_at ?? new Date().toISOString(),
        start_date: rx.start_date,
        end_date: rx.end_date,
        status: rx.status ?? "active",
      };

      setItems((prev) => {
        if (prev.some((p) => p.id === newItem.id)) return prev;
        const next = [newItem, ...prev];
        seenItemIdsRef.current.add(newItem.id);
        return next;
      });

      // Reset UI
      setShowAdd(false);
      setMedId("");
      setSelectedMed(null);
      setSig("");

      // Optional: toast
      Alert.alert("Added", "Medication added to your prescriptions.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not add medication.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.navigate("/")}
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
            {/* Medication picker */}
            <View>
              <ThemedText style={styles.inputLabel}>Medication</ThemedText>

              <TouchableOpacity
                onPress={() => setPickerOpen((v) => !v)}
                style={[
                  styles.input,
                  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                ]}
                accessibilityLabel="Open medication dropdown"
              >
                <ThemedText style={{ color: selectedMed ? "#111827" : "#6B7280" }}>
                  {selectedMed ? selectedMed.label : "Search & select a medication"}
                </ThemedText>
                <Ionicons name={pickerOpen ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
              </TouchableOpacity>

              {pickerOpen && (
                <View
                  style={{
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E5EA",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                    <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                      <TextInput
                        value={medSearch}
                        onChangeText={setMedSearch}
                        placeholder="Type to search by generic or brand name"
                        style={{ fontSize: 16 }}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={{ height: 220 }}>
                      {medLoading ? (
                        <View style={{ alignItems: "center", justifyContent: "center", height: 220 }}>
                          <ThemedText>Loading…</ThemedText>
                        </View>
                      ) : (
                        <FlatList
                          data={medOptions}
                          keyExtractor={(o) => o.id}
                          keyboardShouldPersistTaps="handled"
                          ItemSeparatorComponent={() => (
                            <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />
                          )}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedMed(item);
                                setMedId(item.id); // feeds existing add flow
                                setPickerOpen(false);
                              }}
                              style={{ paddingHorizontal: 12, paddingVertical: 12 }}
                            >
                              <ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
                                {item.label}
                              </ThemedText>
                              {!!item.sublabel && (
                                <ThemedText style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                                  {item.sublabel}
                                </ThemedText>
                              )}
                            </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                            <View style={{ padding: 16 }}>
                              <ThemedText style={{ color: "#6B7280" }}>
                                No medications found. Try a different search.
                              </ThemedText>
                            </View>
                          }
                        />
                      )}
                    </View>
                </View>
              )}
            </View>

            {/* SIG / Directions */}
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
