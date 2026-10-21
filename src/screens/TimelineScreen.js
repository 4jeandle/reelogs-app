import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { subscribeMyWatches, subscribeFriendWatches, getUsersByUids } from "../lib/db";

function formatDateLabel(seconds) {
  if (!seconds) return "날짜 없음";
  const d = new Date(seconds * 1000);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - target) / (1000 * 60 * 60 * 24);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(seconds) {
  if (!seconds) return "";
  const d = new Date(seconds * 1000);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const hour = h % 12 || 12;
  return `${ampm} ${hour}:${m}`;
}

const OTT_COLORS = {
  netflix: "#E50914", tving: "#FF153C", wavve: "#0075FF",
  disney: "#113CCF", watcha: "#FF0558", coupang: "#EE2400", other: "#888888",
};

export default function TimelineScreen() {
  const { C } = useTheme();
  const { user, profile } = useAuth();
  const [myWatches, setMyWatches] = useState([]);
  const [friendWatches, setFriendWatches] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});

  useEffect(() => {
    if (!user) return;
    return subscribeMyWatches(user.uid, setMyWatches);
  }, [user]);

  useEffect(() => {
    if (!profile?.friends?.length) { setFriendWatches([]); return; }
    const unsubList = [];
    profile.friends.forEach(fid => {
      const unsub = subscribeFriendWatches(fid, (watches) => {
        setFriendWatches(prev => {
          const filtered = prev.filter(w => w.uid !== fid);
          return [...filtered, ...watches];
        });
      });
      unsubList.push(unsub);
    });
    return () => unsubList.forEach(u => u());
  }, [profile?.friends]);

  useEffect(() => {
    if (!profile?.friends?.length) return;
    getUsersByUids(profile.friends).then(users => {
      const map = {};
      users.forEach(u => { map[u.id] = u; });
      setFriendProfiles(map);
    });
  }, [profile?.friends]);

  function getDisplayName(watch) {
    if (watch.uid === user?.uid) return profile?.displayName || "나";
    return friendProfiles[watch.uid]?.displayName || "친구";
  }

  // 날짜별 그룹핑
  const allWatches = [...myWatches, ...friendWatches].sort((a, b) => {
    return (b.watchedAt?.seconds || b.createdAt?.seconds || 0) - (a.watchedAt?.seconds || a.createdAt?.seconds || 0);
  });

  const grouped = [];
  let lastLabel = null;
  allWatches.forEach(w => {
    const seconds = w.watchedAt?.seconds || w.createdAt?.seconds;
    const label = formatDateLabel(seconds);
    if (label !== lastLabel) {
      grouped.push({ type: "header", label, key: `h_${label}` });
      lastLabel = label;
    }
    grouped.push({ type: "item", watch: w, key: w.id });
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    pageHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    pageTitle: { fontSize: 18, fontWeight: "700", color: C.text },
    liveBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: C.red, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" },
    liveText: { color: "#FFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
    dateHeader: {
      paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
    },
    dateLabel: { fontSize: 13, fontWeight: "700", color: C.text3 },
    item: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    timeCol: { width: 60, marginRight: 12 },
    timeText: { fontSize: 12, color: C.text3 },
    ottDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    line: { width: 1, height: 20, backgroundColor: C.border, marginLeft: 3, marginTop: 2 },
    content: { flex: 1 },
    titleText: { fontSize: 14, fontWeight: "600", color: C.text },
    userChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      marginTop: 4, alignSelf: "flex-start",
      backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
    },
    userAvatar: {
      width: 16, height: 16, borderRadius: 8,
      backgroundColor: C.red, alignItems: "center", justifyContent: "center",
    },
    userAvatarText: { color: "#FFF", fontSize: 9, fontWeight: "700" },
    userChipText: { fontSize: 11, color: C.text3 },
    empty: { textAlign: "center", color: C.text3, marginTop: 80, fontSize: 14, lineHeight: 22 },
  });

  if (grouped.length === 0) {
    return (
      <View style={s.container}>
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>오늘의 시청 타임라인</Text>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={s.empty}>시청 기록이 없어요{"\n"}기록을 추가하면 타임라인에 나타나요!</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>오늘의 시청 타임라인</Text>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>
      <FlatList
        data={grouped}
        keyExtractor={item => item.key}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View style={s.dateHeader}>
                <Text style={s.dateLabel}>{item.label}</Text>
              </View>
            );
          }
          const w = item.watch;
          const seconds = w.watchedAt?.seconds || w.createdAt?.seconds;
          const name = getDisplayName(w);
          const initial = name.charAt(0).toUpperCase();
          const ottColor = OTT_COLORS[w.ott] || OTT_COLORS.other;
          return (
            <View style={s.item}>
              <View style={s.timeCol}>
                <Text style={s.timeText}>{formatTime(seconds)}</Text>
                <View style={[s.ottDot, { backgroundColor: ottColor }]} />
              </View>
              <View style={s.content}>
                <Text style={s.titleText}>{w.title}</Text>
                <View style={s.userChip}>
                  <View style={s.userAvatar}><Text style={s.userAvatarText}>{initial}</Text></View>
                  <Text style={s.userChipText}>{name}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
