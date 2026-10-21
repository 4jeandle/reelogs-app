import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  Modal, ScrollView, Alert, ActivityIndicator, SafeAreaView, Image,
  Linking, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { OTT, formatDate } from "../lib/theme";
import {
  addFriendByCode, removeFriend, getUsersByUids, subscribeFriendWatches,
} from "../lib/db";

const TERMS_TEXT = `제1조 (목적)
이 약관은 Monolog Studio(이하 "회사")가 제공하는 ReLogs 서비스의 이용조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스의 정의)
서비스란 회사가 제공하는 OTT 시청 기록 공유 앱 ReLogs 및 이에 부수하는 일체의 서비스를 의미합니다.

제3조 (약관의 효력 및 변경)
본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.`;

const PRIVACY_TEXT = `개인정보처리방침

Monolog Studio(이하 "회사")는 이용자의 개인정보를 보호합니다.

1. 수집하는 개인정보 항목
- 이메일 주소, 닉네임, 시청 기록 데이터

2. 개인정보의 수집 및 이용 목적
- 회원 관리 및 서비스 제공

3. 문의처: jhokwon0625@gmail.com`;

// ──────────────────────────────────────────────────────────
// LoginScreen — 레퍼런스 UI 적용
// ──────────────────────────────────────────────────────────
export function LoginScreen() {
  const { C } = useTheme();
  const { loginWithEmail, signupWithEmail } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { Alert.alert("오류", "이메일과 비밀번호를 입력해주세요."); return; }
    if (isSignup && !name) { Alert.alert("오류", "닉네임을 입력해주세요."); return; }
    if (isSignup && !agreed) { Alert.alert("오류", "약관에 동의해주세요."); return; }
    setLoading(true);
    try {
      if (isSignup) await signupWithEmail(email, password, name);
      else await loginWithEmail(email, password);
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  const BG = "#F9F4EF";
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
    logoArea: { alignItems: "center", marginBottom: 32 },
    logoRow: { flexDirection: "row", alignItems: "baseline" },
    logoRe: { fontSize: 36, fontWeight: "900", color: "#E50914", letterSpacing: -1 },
    logoLogs: { fontSize: 36, fontWeight: "900", color: "#222", letterSpacing: -1 },
    logoBar: { height: 3, width: 100, borderRadius: 2, backgroundColor: "#E50914", marginTop: 4 },
    sub: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 8 },
    card: { backgroundColor: "#FFF", borderRadius: 18, padding: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: "#E0E0E0" },
    dividerText: { marginHorizontal: 12, color: "#AAA", fontSize: 13 },
    label: { fontSize: 13, color: "#555", marginBottom: 6, fontWeight: "600" },
    input: {
      borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
      color: "#222", backgroundColor: "#FAFAFA", marginBottom: 12,
    },
    loginBtn: { backgroundColor: "#E50914", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    loginBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
    agreeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    agreeCheck: {
      width: 20, height: 20, borderWidth: 1.5, borderColor: "#CCC",
      borderRadius: 4, marginRight: 8, alignItems: "center", justifyContent: "center",
      backgroundColor: agreed ? "#E50914" : "#FFF",
    },
    agreeText: { flex: 1, fontSize: 12, color: "#888" },
    agreeLink: { color: "#E50914", textDecorationLine: "underline" },
    switchRow: { alignItems: "center", marginTop: 20 },
    switchText: { color: "#888", fontSize: 14 },
    switchLink: { color: "#E50914", fontWeight: "700" },
  });

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.logoArea}>
              <View style={s.logoRow}>
                <Text style={s.logoRe}>Re</Text>
                <Text style={s.logoLogs}>Logs</Text>
              </View>
              <View style={s.logoBar} />
              <Text style={s.sub}>OTT 시청 기록을 친구들과 공유하세요</Text>
            </View>

            <View style={s.card}>
              {isSignup && (
                <>
                  <Text style={s.label}>닉네임</Text>
                  <TextInput style={s.input} value={name} onChangeText={setName} placeholder="닉네임을 입력하세요" placeholderTextColor="#CCC" returnKeyType="next" />
                </>
              )}
              <Text style={s.label}>이메일</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="이메일을 입력하세요" placeholderTextColor="#CCC" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
              <Text style={s.label}>비밀번호</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="비밀번호를 입력하세요" placeholderTextColor="#CCC" secureTextEntry returnKeyType="done" onSubmitEditing={handleSubmit} />
              {isSignup && (
                <TouchableOpacity style={s.agreeRow} onPress={() => setAgreed(!agreed)}>
                  <View style={s.agreeCheck}>{agreed && <Ionicons name="checkmark" size={13} color="#FFF" />}</View>
                  <Text style={s.agreeText}>
                    <Text style={s.agreeLink} onPress={() => setTermsVisible(true)}>서비스 이용약관</Text>
                    {" 및 "}
                    <Text style={s.agreeLink} onPress={() => setPrivacyVisible(true)}>개인정보처리방침</Text>
                    에 동의합니다.
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.loginBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.loginBtnText}>{isSignup ? "회원가입" : "로그인"}</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.switchRow}>
              <Text style={s.switchText}>
                {isSignup ? "이미 계정이 있으신가요? " : "아직 계정이 없으신가요? "}
                <Text style={s.switchLink} onPress={() => setIsSignup(!isSignup)}>
                  {isSignup ? "로그인" : "회원가입"}
                </Text>
              </Text>
            </View>

            <PolicyModal visible={termsVisible} onClose={() => setTermsVisible(false)} title="서비스 이용약관" text={TERMS_TEXT} C={C} />
            <PolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} title="개인정보처리방침" text={PRIVACY_TEXT} C={C} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PolicyModal({ visible, onClose, title, text, C }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontWeight: "700", fontSize: 16, color: C.text }}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: C.text, fontSize: 14, lineHeight: 22 }}>{text}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────
// FriendsScreen — 레퍼런스 UI 적용
// ──────────────────────────────────────────────────────────
export function FriendsScreen({ onSelectFriend }) {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState([]);
  const [addCode, setAddCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!profile?.friends?.length) { setFriends([]); return; }
    getUsersByUids(profile.friends).then(setFriends);
  }, [profile?.friends]);

  const sortedFriends = [...friends].sort((a, b) =>
    (a.displayName || "").localeCompare(b.displayName || "", ["ko", "en"], { numeric: true })
  );

  async function handleCopyCode() {
    if (!profile?.inviteCode) return;
    await Clipboard.setStringAsync(profile.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleAddFriend() {
    if (!addCode.trim()) return;
    setLoading(true);
    try {
      await addFriendByCode(user.uid, addCode.trim());
      setAddCode("");
      Alert.alert("완료", "친구가 추가되었습니다!");
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally { setLoading(false); }
  }

  async function handleRemoveFriend(friendId, name) {
    Alert.alert("친구 끊기", `${name}님과 친구를 끊으시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "끊기", style: "destructive", onPress: async () => {
        await removeFriend(user.uid, friendId);
      }},
    ]);
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    // 초대코드 카드
    codeCard: {
      margin: 16, backgroundColor: C.surface, borderRadius: 16,
      padding: 20, borderWidth: 1, borderColor: C.border,
      alignItems: "center",
    },
    codeCardLabel: { fontSize: 12, fontWeight: "700", color: C.red, letterSpacing: 1, marginBottom: 10 },
    codeValue: { fontSize: 30, fontWeight: "900", color: C.text, letterSpacing: 8, marginBottom: 14 },
    copyBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
    },
    copyBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    // 친구 추가
    addSection: { paddingHorizontal: 16, paddingBottom: 16 },
    addLabel: { fontSize: 12, fontWeight: "700", color: C.text3, letterSpacing: 0.5, marginBottom: 8 },
    addRow: { flexDirection: "row", gap: 8 },
    addInput: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
      color: C.text, backgroundColor: C.surface,
      letterSpacing: 3, fontWeight: "700", textAlign: "center",
    },
    addBtn: { backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" },
    addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
    divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16, marginBottom: 8 },
    listLabel: { fontSize: 12, fontWeight: "700", color: C.text3, letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 8 },
    // 친구 아이템
    friendItem: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "#333", alignItems: "center", justifyContent: "center", marginRight: 12,
    },
    avatarText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
    friendInfo: { flex: 1 },
    friendName: { fontSize: 15, fontWeight: "700", color: C.text },
    friendCode: { fontSize: 12, color: C.text3, marginTop: 2 },
    removeBtn: {
      borderWidth: 1, borderColor: C.border, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    removeBtnText: { fontSize: 12, color: C.text3 },
    empty: { textAlign: "center", color: C.text3, marginTop: 40, fontSize: 14, lineHeight: 22 },
  });

  return (
    <View style={s.container}>
      <ScrollView>
        {/* 초대코드 카드 */}
        <View style={s.codeCard}>
          <Text style={s.codeCardLabel}>나의 초대 코드</Text>
          <Text style={s.codeValue}>{profile?.inviteCode || "------"}</Text>
          <TouchableOpacity style={s.copyBtn} onPress={handleCopyCode}>
            <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={16} color="#FFF" />
            <Text style={s.copyBtnText}>{codeCopied ? "복사됨!" : "코드 복사"}</Text>
          </TouchableOpacity>
        </View>

        {/* 친구 추가 */}
        <View style={s.addSection}>
          <Text style={s.addLabel}>친구 추가</Text>
          <View style={s.addRow}>
            <TextInput
              style={s.addInput}
              value={addCode}
              onChangeText={t => setAddCode(t.toUpperCase())}
              placeholder="초대 코드"
              placeholderTextColor={C.text3}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity style={s.addBtn} onPress={handleAddFriend} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.addBtnText}>추가</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.divider} />
        <Text style={s.listLabel}>친구 목록 ({sortedFriends.length})</Text>

        {sortedFriends.length === 0 ? (
          <Text style={s.empty}>아직 친구가 없어요{"\n"}초대 코드로 친구를 추가해보세요!</Text>
        ) : (
          sortedFriends.map(f => (
            <TouchableOpacity key={f.id} style={s.friendItem} onPress={() => onSelectFriend?.(f)}>
              <View style={s.avatar}>
                {f.photoURL
                  ? <Image source={{ uri: f.photoURL }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  : <Text style={s.avatarText}>{(f.displayName || "?").charAt(0).toUpperCase()}</Text>
                }
              </View>
              <View style={s.friendInfo}>
                <Text style={s.friendName}>{f.displayName}</Text>
                <Text style={s.friendCode}>@{f.inviteCode}</Text>
              </View>
              <TouchableOpacity style={s.removeBtn} onPress={() => handleRemoveFriend(f.id, f.displayName)}>
                <Text style={s.removeBtnText}>친구 끊기</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// FriendProfileScreen
// ──────────────────────────────────────────────────────────
const STARS_MAP = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

export function FriendProfileScreen({ friend, onClose }) {
  const { C } = useTheme();
  const [watches, setWatches] = useState([]);

  useEffect(() => {
    if (!friend?.id) return;
    return subscribeFriendWatches(friend.id, setWatches);
  }, [friend?.id]);

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
    backBtn: { marginRight: 12 },
    profile: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#333", marginRight: 10, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
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
        <TouchableOpacity style={s.backBtn} onPress={onClose}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={s.profile}>
          <View style={s.avatar}>
            {friend?.photoURL
              ? <Image source={{ uri: friend.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              : <Text style={s.avatarText}>{(friend?.displayName || "?").charAt(0).toUpperCase()}</Text>
            }
          </View>
          <View>
            <Text style={s.name}>{friend?.displayName}</Text>
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
