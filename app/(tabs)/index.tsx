// app/(tabs)/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

export default function HomePage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem("authed");
      router.replace("/signin"); // auth layout will now show the Sign In stack
    } catch (e) {
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <View style={{ height: 16 }} />
      <Button title="Sign out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24 },
});
