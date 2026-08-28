import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing } from 'react-native';
import { FaceVibe, pickFaceCandidates, registerFaceEmoji } from '@/game/facepick';
import BigButton from '@/components/BigButton';
import { Palette, Radius, Shadow } from '@/constants/theme';

declare global {
  interface Window {
    faceapi?: any;
  }
}

type Stage = 'idle' | 'loading' | 'scanning' | 'result' | 'error';

type LmPt = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

function loadFaceApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve();
    const s = document.createElement('script');
    s.src = 'face-api.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('face-api.js could not be loaded'));
    document.head.appendChild(s);
  });
}

async function ensureModels() {
  if (!window.faceapi) await loadFaceApi();
  await Promise.all([
    window.faceapi.nets.tinyFaceDetector.loadFromUri('models/'),
    window.faceapi.nets.faceLandmark68Net.loadFromUri('models/'),
  ]);
}

/** Human-friendly error for whatever the browser threw. */
function camError(e: any): string {
  const name = e?.name ?? '';
  if (name === 'NotAllowedError')
    return 'Camera access was blocked. Allow the camera in your browser (padlock/camera icon in the address bar), then try again — or just upload a photo below. 📷';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'No camera found on this device. No worries — upload a selfie photo below instead! 🖼️';
  if (name === 'NotReadableError')
    return 'The camera is busy in another app or tab. Close it and retry — or upload a photo below. 🖼️';
  if (name === 'InsecureContextError' || !navigator.mediaDevices)
    return 'The camera needs a secure connection (HTTPS). The link you opened looks insecure — or upload a photo instead! 🖼️';
  return `Camera hiccup (${name || e?.message || 'unknown'}). No problem — upload a selfie photo below instead! 🖼️`;
}

type Props = {
  visible: boolean;
  playerName: string;
  /** Emojis already taken by other players — the AI will not suggest them. */
  excludeEmojis?: string[];
  onClose: (avatarId: string | null) => void;
};

/**
 * Face scan — the AI reads your real face (68 landmarks, 100% on-device) and
 * picks the emoji that best matches YOUR face + expression. Then you choose
 * which of the 3 fits. Nobody can end up with the same face.
 */
export default function FaceScan({ visible, playerName, excludeEmojis = [], onClose }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [facePos, setFacePos] = useState<{ x: number; y: number } | null>(null);

  // the AI's picks (once detection succeeds)
  const [candidates, setCandidates] = useState<FaceVibe[]>([]);
  const [liveEmoji, setLiveEmoji] = useState<string>('🔍');
  const [picked, setPicked] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(false);
  const stableRef = useRef(0);
  const hostRef = useRef<View | null>(null);
  const fileRef = useRef<any>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const lastLmRef = useRef<LmPt[] | null>(null);
  const lastBoxRef = useRef<Box | null>(null);

  const stopAll = useCallback(() => {
    loopRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finishWith = useCallback(
    (cands: FaceVibe[]) => {
      setCandidates(cands);
      setPicked(0);
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      setStage('result');
    },
    [pop],
  );

  const startCamera = useCallback(async () => {
    setStage('loading');
    setErrorMsg('');
    try {
      await ensureModels();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('InsecureContextError');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage('scanning');
    } catch (e: any) {
      stopAll();
      setErrorMsg(camError(e));
      setStage('error');
    }
  }, [stopAll]);

  // Attach the live <video> and run the detection loop.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || stage !== 'scanning') return;
    const host = hostRef.current as unknown as HTMLDivElement | null;
    if (!host || !streamRef.current) return;

    const v = document.createElement('video');
    v.setAttribute('playsinline', 'true');
    v.setAttribute('muted', 'true');
    v.setAttribute('autoplay', 'true');
    Object.assign(v.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      objectFit: 'cover', transform: 'scaleX(-1)',
    });
    host.appendChild(v);
    videoRef.current = v;

    let cancelled = false;
    const opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const seed = Math.floor(Math.random() * 97);

    const tick = async () => {
      if (cancelled || !loopRef.current) return;
      const vid = videoRef.current;
      if (vid && vid.readyState >= 2) {
        try {
          const res: any = await window.faceapi.detectSingleFace(vid, opts).withFaceLandmarks();
          if (cancelled) return;
          if (res) {
            const vw = vid.videoWidth || 640;
            const vh = vid.videoHeight || 480;
            const box: Box = { ...res.detection.box };
            const lm: LmPt[] = res.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y }));
            lastLmRef.current = lm;
            lastBoxRef.current = box;
            setFacePos({ x: 1 - (box.x / vw + box.width / vw / 2), y: box.y / vh + box.height / vh / 2 });

            // live preview: the AI's best guess so far
            try {
              const c = pickFaceCandidates(lm, box, seed, excludeEmojis);
              if (c.length) setLiveEmoji(c[0].emoji);
            } catch { /* ignore */ }

            stableRef.current += 1;
            if (stableRef.current === 14) {
              loopRef.current = false;
              stopAll();
              const c = pickFaceCandidates(lm, box, seed, excludeEmojis);
              finishWith(c);
              return;
            }
          } else {
            setFacePos(null);
            stableRef.current = Math.max(0, stableRef.current - 1);
          }
        } catch {
          /* skip frame */
        }
      }
      if (!cancelled && loopRef.current) setTimeout(() => tick(), 110);
    };

    (async () => {
      try {
        v.srcObject = streamRef.current;
        await v.play();
      } catch (e: any) {
        if (!cancelled) {
          cancelled = true;
          stopAll();
          setErrorMsg(camError(e));
          setStage('error');
        }
        return;
      }
      setFacePos(null);
      setLiveEmoji('🔍');
      stableRef.current = 0;
      loopRef.current = true;
      tick();
    })();

    return () => {
      cancelled = true;
      loopRef.current = false;
      stopAll();
      v.remove();
      videoRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, visible, stopAll, finishWith]);

  // Reset when closed.
  useEffect(() => {
    if (!visible) {
      setStage('idle');
      setFacePos(null);
      setErrorMsg('');
      setCandidates([]);
      setLiveEmoji('🔍');
      pop.setValue(0);
    }
  }, [visible, pop]);

  /** Photo upload fallback: pick/take a selfie, detect the face in the image. */
  const onPhoto = useCallback(
    (file: File) => {
      setStage('loading');
      setErrorMsg('');
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          await ensureModels();
          const maxW = 640;
          const scale = Math.min(1, maxW / img.width);
          const cw = Math.round(img.width * scale);
          const ch = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas');
          ctx.drawImage(img, 0, 0, cw, ch);
          const res: any = await window.faceapi
            .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
            .withFaceLandmarks();
          if (!res) throw new Error('no-face');
          const box: Box = { ...res.detection.box };
          const lm: LmPt[] = res.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y }));
          const c = pickFaceCandidates(lm, box, Math.floor(Math.random() * 97), excludeEmojis);
          finishWith(c);
        } catch (e: any) {
          if (e?.message === 'no-face') {
            setErrorMsg('We could not find a face in that photo 😅 — make sure your face is big and clear, then try again. Or just pick an avatar!');
          } else {
            setErrorMsg('Hmm, the photo could not be processed. Try another photo, or just pick an avatar! 😊');
          }
          setStage('error');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        setErrorMsg('That file could not be read as a photo. Try another one, or just pick an avatar! 😊');
        setStage('error');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [finishWith, excludeEmojis],
  );

  if (!visible || Platform.OS !== 'web') return null;

  const confirm = () => {
    const c = candidates[picked];
    if (!c) return;
    const id = registerFaceEmoji(c);
    onClose(id);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.eyebrow}>🤖 AI SCAN · 100% ON YOUR DEVICE</Text>
        <Text style={styles.title}>{playerName ? `Picking ${playerName}'s face` : 'Pick your face'}</Text>

        {stage === 'idle' && (
          <View style={styles.idleBox}>
            <Text style={{ fontSize: 60 }}>📸</Text>
            <Text style={styles.idleText}>
              Smile at the camera and the AI will pick the emoji that looks most like YOU. Nothing ever leaves this phone.
            </Text>
            <BigButton label="Start camera 📷" onPress={startCamera} variant="win" />
            <Text style={styles.or}>— or —</Text>
            <Pressable style={styles.photoBtn} onPress={() => fileRef.current?.click()} hitSlop={8}>
              <Text style={styles.photoBtnText}>🖼️ Upload a selfie photo instead</Text>
            </Pressable>
            <Text style={styles.photoHint}>works even when the camera is blocked</Text>
          </View>
        )}

        {stage === 'loading' && (
          <View style={styles.idleBox}>
            <Text style={{ fontSize: 48 }}>⏳</Text>
            <Text style={styles.idleText}>Loading the AI models (~1 sec)…</Text>
          </View>
        )}

        {(stage === 'scanning' || (stage === 'error' && streamRef.current)) && (
          <View style={styles.cameraWrap} ref={hostRef as any}>
            {stage === 'scanning' && facePos && (
              <View pointerEvents="none" style={[styles.faceDot, { left: `${facePos.x * 100}%`, top: `${facePos.y * 100}%` }]}>
                <Text style={{ fontSize: 34 }}>{liveEmoji}</Text>
              </View>
            )}
            {stage === 'scanning' && (
              <View style={styles.scanHint} pointerEvents="none">
                <Text style={styles.scanHintText}>{facePos ? 'The AI is reading your face… 🤳' : 'Come to the center of the screen 📱'}</Text>
              </View>
            )}
            {stage === 'scanning' && (
              <Pressable
                style={styles.cancelChip}
                onPress={() => {
                  stopAll();
                  setStage('idle');
                }}
                hitSlop={10}
              >
                <Text style={styles.cancelChipText}>✕ cancel</Text>
              </Pressable>
            )}
          </View>
        )}

        {stage === 'result' && candidates.length > 0 && (
          <Animated.View style={[styles.resultWrap, { transform: [{ scale: pop }] }]}>
            <Text style={styles.bigEmoji}>{candidates[picked].emoji}</Text>
            <Text style={styles.vibeLabel}>“{candidates[picked].label}”</Text>
            <Text style={styles.resultSub}>That's you, according to the AI. Want a different vibe?</Text>
            <View style={styles.candRow}>
              {candidates.map((c, i) => (
                <Pressable key={i} onPress={() => setPicked(i)} style={[styles.cand, i === picked && styles.candOn]}>
                  <Text style={{ fontSize: 40 }}>{c.emoji}</Text>
                  <Text style={styles.candLabel}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <BigButton label="Use this face ✅" onPress={confirm} variant="win" style={{ marginTop: 18 }} />
            <Pressable onPress={() => setStage('idle')} style={{ marginTop: 12 }}>
              <Text style={styles.linkText}>Scan again</Text>
            </Pressable>
          </Animated.View>
        )}

        {stage === 'error' && (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{errorMsg}</Text>
            <Pressable style={styles.photoBtn} onPress={() => fileRef.current?.click()} hitSlop={8}>
              <Text style={styles.photoBtnText}>🖼️ Upload a selfie photo</Text>
            </Pressable>
            <BigButton label="Continue anyway (keep avatar) 😎" onPress={() => onClose(null)} variant="win" style={{ marginTop: 14 }} />
          </View>
        )}

        {/* hidden file input: capture="user" opens the camera app on phones */}
        {Platform.OS === 'web' && (
          <View style={styles.hiddenHost}>
            <input
              ref={fileRef as any}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: 'none' }}
              onChange={(e: any) => {
                const f = e.target.files?.[0];
                if (f) onPhoto(f);
                e.target.value = '';
              }}
            />
          </View>
        )}

        <Pressable
          style={styles.closeRow}
          onPress={() => {
            stopAll();
            onClose(null);
          }}
          hitSlop={10}
        >
          <Text style={styles.closeText}>Continue without scan →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(21,26,46,0.85)', justifyContent: 'flex-end', zIndex: 50 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl + 8,
    borderTopRightRadius: Radius.xl + 8,
    padding: 22,
    paddingBottom: 28,
    borderWidth: 4,
    borderColor: '#1B1F3B',
    ...Shadow.pop,
  },
  eyebrow: { fontSize: 11, fontWeight: '900', color: Palette.muted, letterSpacing: 1.5, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: Palette.ink, textAlign: 'center', marginTop: 6 },
  idleBox: { alignItems: 'center', paddingVertical: 22 },
  idleText: { color: Palette.ink, fontSize: 16, lineHeight: 23, textAlign: 'center', marginVertical: 14, paddingHorizontal: 12 },
  or: { color: Palette.muted, fontWeight: '800', fontSize: 13, marginVertical: 12 },
  photoBtn: {
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: Palette.grape,
    backgroundColor: '#F5F1FF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  photoBtnText: { color: Palette.grape, fontWeight: '900', fontSize: 15 },
  photoHint: { color: Palette.muted, fontSize: 11, fontWeight: '700', marginTop: 8 },
  cameraWrap: { height: 300, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#111', marginTop: 16, position: 'relative', borderWidth: 4, borderColor: '#1B1F3B' },
  faceDot: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -42 }, { translateY: -42 }] },
  scanHint: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  scanHintText: { backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontWeight: '800', fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  cancelChip: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  cancelChipText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  resultWrap: { alignItems: 'center', marginTop: 14 },
  bigEmoji: { fontSize: 108, lineHeight: 120 },
  vibeLabel: { fontSize: 20, fontWeight: '900', color: Palette.ink, marginTop: 2 },
  resultSub: { fontSize: 14, color: Palette.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  candRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  cand: { borderRadius: 20, borderWidth: 3, borderColor: 'transparent', padding: 10, alignItems: 'center', gap: 4 },
  candOn: { borderColor: Palette.ink, backgroundColor: Palette.soft },
  candLabel: { fontSize: 10, fontWeight: '800', color: Palette.muted },
  errBox: { paddingVertical: 20, alignItems: 'center', gap: 12 },
  errText: { color: Palette.ink, fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  linkText: { color: Palette.muted, fontWeight: '800', fontSize: 15 },
  closeRow: { alignItems: 'center', marginTop: 16 },
  closeText: { color: Palette.muted, fontWeight: '800', fontSize: 15 },
  hiddenHost: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
