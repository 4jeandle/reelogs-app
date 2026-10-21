import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView,
  Image, TextInput, Alert, ActivityIndicator, ScrollView, FlatList,
  Linking,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";

import { ThemeProvider, useTheme } from "./src/lib/ThemeContext";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import { OTT, formatDate } from "./src/lib/theme";
import {
  subscribeMyWatches, updateWatch, deleteWatch,
  uploadProfilePhoto, subscribeFriendWatches,
} from "./src/lib/db";
import { LoginScreen, FriendsScreen, FriendProfileScreen } from "./src/screens/OtherScreens";
import HomeScreen from "./src/screens/HomeScreen";
import GroupsScreen from "./src/screens/GroupsScreen";
import TimelineScreen from "./src/screens/TimelineScreen";

const Tab = createBottomTabNavigator();

// ──────────────────────────────────────────────────────────
// MyRecordsScreen
// ──────────────────────────────────────────────────────────
const STARS_MAP = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

function MyRecordsScreen({ onClose }) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const [watches, setWatches] = useState([]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyWatches(user.uid, setWatches);
  }, [user]);

  async function handleWatch(watch) {
    const ott = OTT[watch.ott] || OTT.other;
    if (!ott.url) return;
    if (ott.scheme) {
      try {
        const ok = await Linking.canOpenURL(ott.scheme);
        if (ok) { await Linking.openURL(ott.scheme); return; }
      } catch {}
    }
    Linking.openURL(ott.url);
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    profile: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, marginRight: 10, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 18 },
    name: { fontSize: 17, fontWeight: "700", color: C.text },
    count: { fontSize: 13, color: C.text3, marginTop: 2 },
    row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    titleDate: { flexDirection: "row", alignItems: "center", flex: 1 },
    titleText: { fontSize: 15, fontWeight: "600", color: C.text, flexShrink: 1 },
    dateText: { fontSize: 12, color: C.text3, marginLeft: 8 },
    rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
    ottName: { fontSize: 13, fontWeight: "700" },
    stars: { fontSize: 13, color: "#FFB800" },
    watchBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
    watchBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
    memo: { fontSize: 13, color: C.text3, marginTop: 4, lineHeight: 18 },
    empty: { textAlign: "center", color: C.text3, marginTop: 60, fontSize: 14 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={{ marginRight: 12 }} onPress={onClose}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={s.profile}>
          <View style={s.avatar}><Text style={s.avatarText}>👤</Text></View>
          <View>
            <Text style={s.name}>{profile?.displayName || "나"}</Text>
            <Text style={s.count}>{watches.length}편 시청</Text>
          </View>
        </View>
      </View>
      {watches.length === 0 ? (
        <Text style={s.empty}>시청 기록이 없어요</Text>
      ) : (
        <FlatList
          data={watches}
          keyExtractor={i => i.id}
          renderItem={({ item }) => {
            const ott = OTT[item.ott] || OTT.other;
            const date = item.watchedAt?.toDate ? item.watchedAt.toDate() : (item.createdAt?.toDate ? item.createdAt.toDate() : null);
            const dateStr = date ? date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "";
            return (
              <View style={s.row}>
                <View style={s.rowTop}>
                  <View style={s.titleDate}>
                    <Text style={s.titleText} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.dateText}>{dateStr}</Text>
                  </View>
                </View>
                <View style={s.rowBottom}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[s.ottName, { color: ott.color }]}>{ott.name}</Text>
                    {item.rating > 0 && <Text style={s.stars}>{STARS_MAP[Math.round(item.rating)]}</Text>}
                  </View>
                  <TouchableOpacity style={[s.watchBtn, { backgroundColor: ott.color }]} onPress={() => handleWatch(item)}>
                    <Text style={s.watchBtnText}>▶ 보기</Text>
                  </TouchableOpacity>
                </View>
                {item.memo ? <Text style={s.memo}>{item.memo}</Text> : null}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────
// MyPageSheet — 레퍼런스 UI 적용
// ──────────────────────────────────────────────────────────
function MyPageSheet({ visible, onClose }) {
  const { C, isDark, toggleTheme } = useTheme();
  const { user, profile, logout } = useAuth();
  const [editModal, setEditModal] = useState(false);
  const [recordsModal, setRecordsModal] = useState(false);
  const [watches, setWatches] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) return;
    return subscribeMyWatches(user.uid, setWatches);
  }, [user]);

  const completedCount = watches.filter(w => w.status === "completed").length;
  const watchingCount = watches.filter(w => w.status === "watching").length;

  const initial = (profile?.displayName || "?").charAt(0).toUpperCase();

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: insets.bottom + 16,
    },
    handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
    // 프로필 행
    profileSection: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatarCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.red, alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: "#FFF", fontSize: 24, fontWeight: "700" },
    profileInfo: { flex: 1, marginLeft: 14 },
    profileName: { fontSize: 17, fontWeight: "700", color: C.text },
    profileEmail: { fontSize: 13, color: C.text3, marginTop: 2 },
    inviteBadge: {
      borderWidth: 1, borderColor: C.red, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: "flex-start",
    },
    inviteText: { fontSize: 11, color: C.red, fontWeight: "700", letterSpacing: 2 },
    // 통계
    statsSection: {
      flexDirection: "row", paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    stat: { flex: 1, alignItems: "center" },
    statNum: { fontSize: 22, fontWeight: "800", color: C.text },
    statLabel: { fontSize: 12, color: C.text3, marginTop: 3 },
    statDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },
    // 메뉴
    menuItem: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 20, paddingVertical: 15,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    menuIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
      marginRight: 14,
    },
    menuText: { flex: 1, fontSize: 15, color: C.text, fontWeight: "500" },
    menuArrow: {},
    logoutItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15 },
    logoutIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: "#FF3B3015", alignItems: "center", justifyContent: "center",
      marginRight: 14,
    },
    logoutText: { flex: 1, fontSize: 15, color: "#FF3B30", fontWeight: "500" },
  });

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.sheet}>
              <View style={s.handle} />

              {/* 프로필 */}
              <View style={s.profileSection}>
                <View style={s.avatarCircle}>
                  {profile?.photoURL
                    ? <Image source={{ uri: profile.photoURL }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                    : <Text style={s.avatarText}>{initial}</Text>
                  }
                </View>
                <View style={s.profileInfo}>
                  <Text style={s.profileName}>{profile?.displayName || "나"}</Text>
                  <Text style={s.profileEmail}>{user?.email}</Text>
                  {profile?.inviteCode && (
                    <View style={s.inviteBadge}>
                      <Text style={s.inviteText}>{profile.inviteCode}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 통계 */}
              <View style={s.statsSection}>
                <View style={s.stat}>
                  <Text style={s.statNum}>{watches.length}</Text>
                  <Text style={s.statLabel}>전체 기록</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statNum}>{watchingCount}</Text>
                  <Text style={s.statLabel}>시청 중</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statNum}>{completedCount}</Text>
                  <Text style={s.statLabel}>완료</Text>
                </View>
              </View>

              {/* 메뉴 */}
              <TouchableOpacity style={s.menuItem} onPress={() => { setEditModal(true); }}>
                <View style={s.menuIconWrap}><Ionicons name="person-outline" size={18} color={C.text} /></View>
                <Text style={s.menuText}>정보 수정</Text>
                <Ionicons name="chevron-forward" size={16} color={C.text3} style={s.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity style={s.menuItem} onPress={() => { onClose(); setRecordsModal(true); }}>
                <View style={s.menuIconWrap}><Ionicons name="heart-outline" size={18} color={C.text} /></View>
                <Text style={s.menuText}>좋아한 작품</Text>
                <Ionicons name="chevron-forward" size={16} color={C.text3} style={s.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity style={s.menuItem}>
                <View style={s.menuIconWrap}><Ionicons name="bookmark-outline" size={18} color={C.text} /></View>
                <Text style={s.menuText}>나중에 볼 작품</Text>
                <Ionicons name="chevron-forward" size={16} color={C.text3} style={s.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
                <View style={s.menuIconWrap}><Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={C.text} /></View>
                <Text style={s.menuText}>다크 모드</Text>
                <Ionicons name={isDark ? "toggle" : "toggle-outline"} size={22} color={isDark ? C.red : C.text3} />
              </TouchableOpacity>

              <TouchableOpacity style={s.logoutItem} onPress={() => { onClose(); logout(); }}>
                <View style={s.logoutIconWrap}><Ionicons name="log-out-outline" size={18} color="#FF3B30" /></View>
                <Text style={s.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={recordsModal} animationType="slide" onRequestClose={() => setRecordsModal(false)}>
        <MyRecordsScreen onClose={() => setRecordsModal(false)} />
      </Modal>

      <Modal visible={editModal} animationType="slide" onRequestClose={() => setEditModal(false)}>
        <EditProfileModal onClose={() => setEditModal(false)} />
      </Modal>
    </>
  );
}

// ──────────────────────────────────────────────────────────
// EditProfileModal
// ──────────────────────────────────────────────────────────
function EditProfileModal({ onClose }) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.displayName || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { updateDoc, doc } = await import("firebase/firestore");
      const { db } = await import("./src/lib/firebase");
      await updateDoc(doc(db, "users", user.uid), { displayName: name.trim() });
      onClose();
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled) return;
    setLoading(true);
    try {
      await uploadProfilePhoto(user.uid, result.assets[0].uri);
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: C.text },
    avatarSection: { alignItems: "center", padding: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 36, color: "#FFF", fontWeight: "700" },
    changePhoto: { marginTop: 10, color: C.red, fontSize: 14, fontWeight: "600" },
    section: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    label: { fontSize: 13, color: C.text3, marginBottom: 8, fontWeight: "600" },
    input: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
      color: C.text, backgroundColor: C.surface,
    },
    saveBtn: { backgroundColor: C.red, margin: 16, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
    saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  });

  const initial = (profile?.displayName || "?").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose}><Text style={{ color: C.text3, fontSize: 16 }}>취소</Text></TouchableOpacity>
        <Text style={s.title}>프로필 편집</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          {profile?.photoURL
            ? <Image source={{ uri: profile.photoURL }} style={{ width: 80, height: 80, borderRadius: 40 }} />
            : <Text style={s.avatarText}>{initial}</Text>
          }
        </View>
        <TouchableOpacity onPress={handlePickPhoto}>
          <Text style={s.changePhoto}>사진 변경</Text>
        </TouchableOpacity>
      </View>
      <View style={s.section}>
        <Text style={s.label}>닉네임</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="닉네임을 입력하세요" placeholderTextColor={C.text3} />
      </View>
      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>저장</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────────────────
function Header({ onProfilePress, profile }) {
  const { C } = useTheme();
  const initial = (profile?.displayName || "?").charAt(0).toUpperCase();

  const s = StyleSheet.create({
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    logoWrap: { flexDirection: "column", alignItems: "flex-start" },
    logoRow: { flexDirection: "row", alignItems: "baseline" },
    logoRe: { fontSize: 20, fontWeight: "900", color: C.red, letterSpacing: -0.5 },
    logoLogs: { fontSize: 20, fontWeight: "900", color: C.text, letterSpacing: -0.5 },
    logoBar: { height: 3, borderRadius: 2, marginTop: 2, width: "100%", backgroundColor: C.red },
    profileBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.red, alignItems: "center", justifyContent: "center",
    },
    profileBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  });

  return (
    <View style={s.header}>
      <View style={s.logoWrap}>
        <View style={s.logoRow}>
          <Text style={s.logoRe}>Re</Text>
          <Text style={s.logoLogs}>Logs</Text>
        </View>
        <View style={s.logoBar} />
      </View>
      <TouchableOpacity style={s.profileBtn} onPress={onProfilePress}>
        {profile?.photoURL
          ? <Image source={{ uri: profile.photoURL }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          : <Text style={s.profileBtnText}>{initial}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// FriendsTab
// ──────────────────────────────────────────────────────────
function FriendsTab() {
  const [selectedFriend, setSelectedFriend] = useState(null);
  if (selectedFriend) {
    return <FriendProfileScreen friend={selectedFriend} onClose={() => setSelectedFriend(null)} />;
  }
  return <FriendsScreen onSelectFriend={setSelectedFriend} />;
}

// ──────────────────────────────────────────────────────────
// MainApp
// ──────────────────────────────────────────────────────────
function MainApp() {
  const { C } = useTheme();
  const { user, loading, profile } = useAuth();
  const [myPageVisible, setMyPageVisible] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={C.red} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.surface }}>
      <Header onProfilePress={() => setMyPageVisible(true)} profile={profile} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom || 6,
            paddingTop: 4,
          },
          tabBarActiveTintColor: C.red,
          tabBarInactiveTintColor: C.text3,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 0 },
          tabBarIcon: ({ color, focused }) => {
            const icons = {
              홈: focused ? "home" : "home-outline",
              타임라인: focused ? "time" : "time-outline",
              그룹: focused ? "people" : "people-outline",
              친구: focused ? "person-add" : "person-add-outline",
            };
            return <Ionicons name={icons[route.name]} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="타임라인" component={TimelineScreen} />
        <Tab.Screen name="그룹" component={GroupsScreen} />
        <Tab.Screen name="친구" component={FriendsTab} />
      </Tab.Navigator>

      <MyPageSheet visible={myPageVisible} onClose={() => setMyPageVisible(false)} />
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <MainApp />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
