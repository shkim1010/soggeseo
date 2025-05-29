import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const scentNotes = {
  top: ["라벤더", "레몬", "자몽", "로즈마리", "페퍼민트"],
  middle: ["라일락", "피오니", "자스민", "클린코튼", "일랑일랑"],
  base: ["샌달우드", "시더우드", "바닐라", "화이트머스크", "블랙머스크"],
};

async function getSpotifyToken(clientId, clientSecret) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

async function getArtistGenres(song, token) {
  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(song)}&type=track&limit=1`,
    {
      headers: { Authorization: "Bearer " + token },
    }
  );
  const searchData = await searchRes.json();

  if (!searchData.tracks.items.length) return [];

  const artistId = searchData.tracks.items[0].artists[0].id;
  const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: "Bearer " + token },
  });
  const artistData = await artistRes.json();
  return artistData.genres;
}

async function getGPTRecommendation(genres, song, openaiKey) {
  const prompt = `
너는 뛰어난 향수 조향사야.
아래 향수 노트 리스트에서 선택해서
노래 장르: ${genres.join(", ") || "없음"}
노래 제목: ${song}
어울리는 탑 노트 1개, 미들 노트 1개, 베이스 노트 1개를 추천해줘.

탑 노트: 라벤더, 레몬, 자몽, 로즈마리, 페퍼민트
미들 노트: 라일락, 피오니, 자스민, 클린코튼, 일랑일랑
베이스 노트: 샌달우드, 시더우드, 바닐라, 화이트머스크, 블랙머스크

추천 결과를 아래 형식으로 답해줘:
탑 노트: XXX
미들 노트: XXX
베이스 노트: XXX
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { song } = req.body;
  if (!song) return res.status(400).json({ error: "Missing song name" });

  try {
    const spotifyToken = await getSpotifyToken(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET
    );

    const genres = await getArtistGenres(song, spotifyToken);
    const perfumeReply = await getGPTRecommendation(
      genres,
      song,
      process.env.OPENAI_API_KEY
    );

    // Firebase Firestore에 저장
    await addDoc(collection(db, "recommendations"), {
      song,
      genres,
      perfumeReply,
      timestamp: Date.now(),
    });

    return res.status(200).json({ reply: perfumeReply });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
