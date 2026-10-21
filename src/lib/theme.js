export const OTT = {
  netflix: {
    name: "Netflix",
    color: "#E50914",
    // iOS 앱 scheme: 검색 페이지로 바로 이동
    scheme: "nflx://www.netflix.com/search?q=",
    // 앱 없을 때 웹 검색 폴백
    url: "https://www.netflix.com/search?q=",
  },
  wavve: {
    name: "Wavve",
    color: "#005BE2",
    scheme: "wavve://search?query=",
    url: "https://www.wavve.com/search?searchWord=",
  },
  tving: {
    name: "TVING",
    color: "#FF153C",
    scheme: "tving://search?keyword=",
    url: "https://www.tving.com/search/all?searchText=",
  },
  watcha: {
    name: "Watcha",
    color: "#FF0558",
    scheme: "watcha://search?query=",
    url: "https://watcha.com/search?query=",
  },
  disneyplus: {
    name: "Disney+",
    color: "#0063E5",
    scheme: "disneyplus://search?q=",
    url: "https://www.disneyplus.com/search/",
  },
  appletv: {
    name: "Apple TV+",
    color: "#000000",
    // Apple TV 앱은 universal link 방식
    scheme: "videos://",
    url: "https://tv.apple.com/search?term=",
  },
  coupangplay: {
    name: "쿠팡플레이",
    color: "#0049A5",
    scheme: "coupangplay://search?keyword=",
    url: "https://play.coupang.com/vod/search?keyword=",
  },
  laftel: {
    name: "라프텔",
    color: "#7B68EE",
    scheme: "laftel://search?keyword=",
    url: "https://laftel.net/search?keyword=",
  },
  seezn: {
    name: "Seezn",
    color: "#5D3FD3",
    scheme: "seezn://search?keyword=",
    url: "https://www.seezn.com/search?q=",
  },
  other: {
    name: "기타",
    color: "#888888",
    scheme: "",
    url: "",
  },
};

export const STATUS = {
  watching: { label: "시청중", color: "#4CAF50" },
  completed: { label: "완료", color: "#2196F3" },
  paused: { label: "일시정지", color: "#FF9800" },
  dropped: { label: "드롭", color: "#9E9E9E" },
  want: { label: "보고싶어요", color: "#E91E63" },
};

export const GENRE_EMOJI = {
  액션: "💥",
  로맨스: "💕",
  코미디: "😂",
  공포: "👻",
  SF: "🚀",
  판타지: "🧙",
  드라마: "🎭",
  애니메이션: "🎨",
  다큐: "📽️",
  스릴러: "🔪",
  범죄: "🕵️",
  역사: "📜",
  음악: "🎵",
  가족: "👨‍👩‍👧",
  스포츠: "⚽",
};

export function getGradient(ottKey) {
  const ott = OTT[ottKey] || OTT.other;
  return [ott.color, ott.color + "99"];
}

export function getEmoji(genre) {
  return GENRE_EMOJI[genre] || "🎬";
}

export function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}
