import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useGame } from '@/game/useStore';
import PhaseFade from '@/components/PhaseFade';
import Gate from '@/screens/Gate';
import Setup from '@/screens/Setup';
import Reading from '@/screens/Reading';
import Handoff from '@/screens/Handoff';
import Guess from '@/screens/Guess';
import Reveal from '@/screens/Reveal';
import Vote from '@/screens/Vote';
import MoleVote from '@/screens/MoleVote';
import Anticipation from '@/screens/Anticipation';
import Result from '@/screens/Result';
import End from '@/screens/End';
import HomeTab from '@/screens/HomeTab';
import ShopTab from '@/screens/ShopTab';
import ProfileTab from '@/screens/ProfileTab';
import TabBar, { type TabId } from '@/components/TabBar';
import { isUnlocked } from '@/game/premium';

/**
 * BLUFF IT — one phone, passed around.
 *
 * Home is a Clash-Royale-style tab hub (Shop · HOME · Profile).
 * Game history lives inside the Profile page.
 * When a game is running, the game phases take over full-screen; the tab bar
 * returns to the hub. A password GATE sits in front of everything.
 */
const TABS: TabId[] = ['shop', 'home', 'profile'];
const GAME_PHASES = new Set(['setup', 'reading', 'handoff', 'guess', 'reveal', 'vote', 'molevote', 'anticipation', 'result', 'end']);

export default function Index() {
  // snapshot the unlock flag once per mount (React-Compiler safe, SSR safe)
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  useEffect(() => {
    setUnlocked(isUnlocked());
  }, []);

  const { phase } = useGame();
  const inGame = GAME_PHASES.has(phase);

  if (!unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
        <Gate onUnlock={() => setUnlocked(true)} />
      </View>
    );
  }

  // while a game is in progress: full-screen game phases (no tab bar)
  if (inGame) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
        <PhaseFade animationKey={phase}>
          {phase === 'setup' && <Setup />}
          {phase === 'reading' && <Reading />}
          {phase === 'handoff' && <Handoff />}
          {phase === 'guess' && <Guess />}
          {phase === 'reveal' && <Reveal />}
          {phase === 'vote' && <Vote />}
          {phase === 'molevote' && <MoleVote />}
          {phase === 'anticipation' && <Anticipation />}
          {phase === 'result' && <Result />}
          {phase === 'end' && <End />}
        </PhaseFade>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeTab onTab={setTab} />}
        {tab === 'shop' && <ShopTab />}
        {tab === 'profile' && <ProfileTab />}
      </View>
      <TabBar tab={tab} onTab={setTab} />
    </View>
  );
}
