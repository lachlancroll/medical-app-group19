// app/signup.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button, // <-- add
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";


export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [isDoctor, setIsDoctor] = useState(false); // <-- checkbox state
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // one function to provision app rows once we have a session
  const provisionForUser = useCallback(
    async (uid: string) => {
      const { data: authUser } = await supabase.auth.getUser();
      const emailNow = authUser?.user?.email ?? email;

      // public.users (still mirrors isDoctor)
      const { error: upUsersErr } = await supabase
        .from("users")
        .upsert(
          { id: uid, email: emailNow ?? "", isDoctor },
          { onConflict: "id" }
        );
      if (upUsersErr) console.error("upsert public.users failed:", upUsersErr);

      // Validate DOB format lightly (YYYY-MM-DD)
      const dobClean = /^\d{4}-\d{2}-\d{2}$/.test(dob.trim())
        ? dob.trim()
        : null;

      // public.profiles — write full_name, phone, dob
      const { error: upProfilesErr } = await supabase.from("profiles").upsert(
        {
          user_id: uid,
          full_name: fullName || null,
          phone: phone || null,
          dob: dobClean, // Postgres DATE accepts 'YYYY-MM-DD'
          // is_doctor is set by your auth trigger; no need to send here
        },
        { onConflict: "user_id" }
      );
      if (upProfilesErr) {
        console.error("upsert public.profiles failed:", upProfilesErr);
        setError(upProfilesErr.message);
      }
    },
    [email, fullName, phone, dob, isDoctor]
  );

  // If already authed, skip this screen
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // ensure provisioned (in case user came here while already logged in)
        await provisionForUser(session.user.id);
        router.replace("/");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_e, session) => {
        if (session?.user?.id) {
          // after email-confirm or immediate sign-in, provision rows then navigate
          await provisionForUser(session.user.id);
          router.replace("/");
        }
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [router, provisionForUser]);

  const handleSignUp = async () => {
    if (!email || !password)
      return setError("Email and password are required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    setError("");
    setInfo("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
          phone: phone || undefined,
          dob: dob || undefined,
          isDoctor: isDoctor, // this drives patient/doctor branch
        },
        emailRedirectTo:
          Platform.OS === "web" ? window.location.origin : undefined,
      },
    });

    setLoading(false);
    if (error) return setError(error.message);

    // If email confirmation is ON, there won't be a session yet:
    if (!data.session) {
      setInfo("Check your email to confirm your account, then sign in.");
    } else {
      // If confirmation is OFF, the auth state listener will provision + redirect.
      setInfo("Account created!");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name (optional)"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TextInput
        style={styles.input}
        placeholder="DOB (YYYY-MM-DD)"
        autoCapitalize="none"
        value={dob}
        onChangeText={setDob}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="password-new"
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        secureTextEntry
        autoComplete="password-new"
        value={confirm}
        onChangeText={setConfirm}
      />

      <View style={styles.row}>
        <Switch value={isDoctor} onValueChange={setIsDoctor} />
        <Text style={{ marginLeft: 8 }}>I’m a doctor</Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={styles.info}>{info}</Text>}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Button title="Create Account" onPress={handleSignUp} />
          <Text style={styles.link} onPress={() => router.replace("/signin")}>
            Have an account? Sign in
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 20,
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    color: "white",
  },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
  info: { color: "green", marginBottom: 10, textAlign: "center" },
  link: {
    marginTop: 12,
    textAlign: "center",
    textDecorationLine: "underline",
    color: "white",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    color: "white",
  },
});
