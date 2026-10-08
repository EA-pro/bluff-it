import React, { useEffect, useRef } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { ADSENSE_PUBLISHER_ID, AD_UNITS, isAdReady, pushAdSenseScript, type AdSlotName } from '@/ad/adsense';

interface Props {
  /** which configured screen slot this is */
  slot: AdSlotName;
  /** min height to reserve so the layout doesn't jump when an ad loads */
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A REAL AdSense display unit, web-only.
 *
 * Renders an RN View (a <div> on web). On web, when the slot is configured
 * (publisher + slot ID set), it appends a real <ins class="adsbygoogle"> into
 * that div and pushes it to the adsbygoogle queue. On native (iOS/Android)
 * or when unconfigured it renders nothing — so the app is byte-identical to
 * the no-ad build until a publisher ID is pasted in src/ad/adsense.ts.
 */
export default function AdSlot({ slot, minHeight = 90, style }: Props) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isAdReady(slot)) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // Inject the loader once (idempotent inside the helper).
    pushAdSenseScript(ADSENSE_PUBLISHER_ID);

    const host = ref.current as unknown as HTMLDivElement | null;
    if (!host) return;

    // One real responsive unit per host, cleaned up on unmount.
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.minHeight = `${minHeight}px`;
    ins.style.width = '100%';
    ins.style.overflow = 'hidden';
    ins.setAttribute('data-ad-client', ADSENSE_PUBLISHER_ID);
    ins.setAttribute('data-ad-slot', AD_UNITS[slot]);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    host.appendChild(ins);

    try {
      const w = window as unknown as { adsbygoogle?: { push: (req?: object) => void } };
      w.adsbygoogle?.push({});
    } catch {
      /* adsbygoogle not ready yet — the script will render it on load */
    }

    return () => {
      // Remove the unit + its rendered content when the screen unmounts.
      while (host.firstChild) host.removeChild(host.firstChild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  if (Platform.OS !== 'web') return null;
  if (!isAdReady(slot)) return null;

  return <View ref={ref} style={[{ minHeight }, style]} />;
}
