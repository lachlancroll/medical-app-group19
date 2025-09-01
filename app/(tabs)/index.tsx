// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomePage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem("authed");
      router.replace("/signin");
    } catch (e) {
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Home</Text>
        <Pressable onPress={handleSignOut} accessibilityLabel="Sign out">
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {/* Big action buttons (full width, stacked) */}
      <View style={styles.actionsColumn}>
        <LargeActionButton
          label="Medications"
          icon={<MaterialCommunityIcons name="pill" size={30} />}
          onPress={() => Alert.alert("Coming soon", "Medications screen")}
        />
        <LargeActionButton
          label="Appointments"
          icon={<Ionicons name="calendar" size={30} />}
          onPress={() => Alert.alert("Coming soon", "Appointments screen")}
        />
      </View>

      {/* Calendar mock (non-functional) */}
      <View style={styles.calendarCard}>
        <SimpleCalendar />
      </View>
    </SafeAreaView>
  );
}

function LargeActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionContent}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SimpleCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-AU", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, month, 1)),
    [year, month]
  );

  // ----- Build cells with Monday-first alignment -----
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfMonth = new Date(year, month, 1);
  const startIndex = (startOfMonth.getDay() + 6) % 7; // Sun=0→6, Mon=1→0, ..., Sat=6→5

  const prevMonthDays = new Date(year, month, 0).getDate();
  const leading = Array.from({ length: startIndex }, (_, i) => ({
    day: prevMonthDays - startIndex + 1 + i,
    type: "prev" as const,
  }));
  const current = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    type: "curr" as const,
  }));
  const base = [...leading, ...current];
  const trailingCount = (7 - (base.length % 7)) % 7;
  const trailing = Array.from({ length: trailingCount }, (_, i) => ({
    day: i + 1,
    type: "next" as const,
  }));
  const cells = [...base, ...trailing];

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Chunk into exact 7-column rows to avoid percentage rounding issues
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>{monthLabel}</Text>
      </View>

      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <Text key={d} style={styles.dowText} accessibilityLabel={d}>
            {d}
          </Text>
        ))}
      </View>

      <View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((c, ci) => (
              <View key={ci} style={styles.cellFixed} accessible>
                {c.type === "curr" ? (
                  isToday(c.day) ? (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayText}>{c.day}</Text>
                    </View>
                  ) : (
                    <Text style={styles.dayText}>{c.day}</Text>
                  )
                ) : (
                  <Text style={styles.dayFaded}>{c.day}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: 0.2 },
  signOut: { fontSize: 14, color: "#007AFF", fontWeight: "600" },

  // Full-width, stacked buttons
  actionsColumn: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    alignSelf: "stretch",
    backgroundColor: "#F1F5F9",
    paddingVertical: 22,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  calendarCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  calendarHeader: {
    alignItems: "center",
    paddingVertical: 8,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  dowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  dowText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  // NEW: exact 7-column rows so nothing wraps weirdly
  weekRow: {
    flexDirection: "row",
  },
  cellFixed: {
    flex: 1,            // exactly 1/7th of the row
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  // (old %) styles kept for reference but not used anymore for cells)
  gridWrap: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },

  dayText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayFaded: {
    fontSize: 16,
    color: "#CBD5E1",
  },
  todayPill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 8,
  },
  todayText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
