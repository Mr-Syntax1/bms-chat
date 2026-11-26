import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { NPC_BY_ID, DIALOGUES, getActionNode } from '../npcData';
import { NPC_QUESTS, npcQuestStatus } from '../questSteps';
import { playPositionalOneShot } from '../audio';
import { NPC_BLIPS } from '../sounds';
import { isNight } from '../envState';
import { GameIcon } from '../ui/icons';
import { ProgressBar } from '../ui/primitives';

const TYPE_SPEED = 30; // ms هر کاراکتر
const BLIP_EVERY = 2; // هر ۲ کاراکتر یک بلیپ

// پخش بلیپ با صدای مخصوص هر NPC (pitch در npcData)
function playBlip(npc) {
  if (!NPC_BLIPS.length || !npc) return;
  const url = NPC_BLIPS[(npc.blip || 1) % NPC_BLIPS.length];
  const { local } = usePlayerStore.getState();
  playPositionalOneShot(url, [local.x, 1.3, local.z], {
    volume: 0.32,
    channel: 'effects',
    refDistance: 2,
    maxDistance: 12,
    playbackRate: npc.pitch || 1,
  });
}

function Hearts({ level }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`سطح دوستی ${level} از ۵`}>
      {Array.from({ length: 5 }, (_, i) => (
        <GameIcon
          key={i}
          name="heart"
          className={`h-3 w-3 ${i < level ? 'text-[#ff6b8a]' : 'text-[#f5ebdd]/20'}`}
          strokeWidth={1.8}
          fill={i < level ? '#ff6b8a' : 'none'}
        />
      ))}
    </div>
  );
}

/**
 * جعبه‌ی دیالوگ NPC: افکت تایپ‌رایتر، انتخاب‌های شاخه‌ای، بلیپ صوتی و بستن با ESC.
 * تمام داده از store و npcData می‌آید؛ هیچ متن محلی ذخیره نمی‌شود.
 */
export default function DialogueBox() {
  const activeDialogue = usePlayerStore((s) => s.activeDialogue);
  const setActiveDialogue = usePlayerStore((s) => s.setActiveDialogue);
  const friendshipLevels = usePlayerStore((s) => s.friendshipLevels);

  const npc = activeDialogue ? NPC_BY_ID[activeDialogue.npcId] : null;
  const level = npc ? friendshipLevels[npc.id] || 1 : 1;

  const close = useCallback(() => {
    setActiveDialogue(null);
    usePlayerStore.getState().setDialogueNode(null);
  }, [setActiveDialogue]);

  const handleChoice = useCallback(
    (choice) => {
      const st = usePlayerStore.getState();
      const npcId = activeDialogue?.npcId;
      if (!npcId) return;
      const action = choice.action;

      if (action === 'close') {
        close();
        return;
      }
      if (action === 'accept') {
        st.acceptNpcQuest(npcId);
        st.pushToast('مأموریت جدید در دفترچه ثبت شد', 'info');
        close();
        return;
      }
      if (action === 'complete') {
        st.completeNpcQuest(npcId);
        close();
        return;
      }
      if (action === 'gift') {
        st.markGiftGiven(npcId);
        const node = getActionNode(npcId, 'gift');
        if (node) st.setActiveDialogue({ npcId, nodeKey: 'gift', text: node.text, choices: node.choices });
        else close();
        return;
      }
      if (action === 'story') {
        st.markStoryHeard(npcId);
        st.addFriendshipXp(npcId, 5);
        const node = getActionNode(npcId, 'story');
        if (node) st.setActiveDialogue({ npcId, nodeKey: 'story', text: node.text, choices: node.choices });
        else close();
        return;
      }
      if (choice.next) {
        const node = DIALOGUES[npcId]?.[choice.next];
        if (!node) return;
        const ctx = { state: st, level, night: isNight() };
        const text = typeof node.text === 'function' ? node.text(ctx) : node.text;
        st.setActiveDialogue({ npcId, nodeKey: choice.next, text, choices: node.choices });
      }
    },
    [activeDialogue, close, level]
  );

  if (!activeDialogue || !npc) return null;

  return (
    <>
      <button
        type="button"
        aria-label="بستن دیالوگ"
        onClick={close}
        className="fixed inset-0 z-[110] cursor-default bg-black/35 backdrop-blur-[1px] cozy-fade-in"
      />

      <DialogueContent
        key={`${activeDialogue.npcId}-${activeDialogue.nodeKey}-${activeDialogue.text}`}
        dialogue={activeDialogue}
        npc={npc}
        level={level}
        onClose={close}
        onChoice={handleChoice}
      />
    </>
  );
}

/**
 * محتوای یک گره‌ی دیالوگ. با key والد دوباره mount می‌شود؛ بنابراین
 * وضعیت تایپ‌رایتر با مقدار اولیه ساخته می‌شود (بدون setState در افکت).
 */
function DialogueContent({ dialogue, npc, level, onClose, onChoice }) {
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const blipCounter = useRef(0);

  const quest = NPC_QUESTS[npc.id];
  const npcInteractions = usePlayerStore((s) => s.npcInteractions);
  const quests = usePlayerStore((s) => s.quests);
  const fishCaught = usePlayerStore((s) => s.fishCaught);
  const bugsCaught = usePlayerStore((s) => s.bugsCaught);
  const ingredients = usePlayerStore((s) => s.ingredients);
  const goldenAcorns = usePlayerStore((s) => s.goldenAcorns);
  const nightFireflies = usePlayerStore((s) => s.nightFireflies);

  const state = { npcInteractions, quests, fishCaught, bugsCaught, ingredients, goldenAcorns, nightFireflies };
  const status = npcQuestStatus(npc.id, state);
  const questValue = quest ? Math.min(Number(quest.value(state)) || 0, quest.max) : 0;

  // تایپ‌رایتر — setState فقط از داخل بازه‌ی زمانی (نه بدنه‌ی افکت)
  useEffect(() => {
    const full = dialogue.text || '';
    let i = 0;
    blipCounter.current = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      blipCounter.current += 1;
      if (blipCounter.current % BLIP_EVERY === 0) playBlip(npc);
      if (i >= full.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setDone(true);
      }
    }, TYPE_SPEED);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [dialogue.text, npc]);

  // ESC: اول متن را کامل می‌کند، بعد می‌بندد
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Escape') return;
      event.stopPropagation();
      if (!done) {
        setTyped(dialogue.text || '');
        setDone(true);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [dialogue.text, done, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[111] flex justify-center p-3 sm:p-5">
      <div className="pointer-events-auto w-[min(680px,94vw)] rounded-2xl border border-[#ffc66d]/25 bg-[#171426]/96 p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl cozy-pop-in">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: npc.accent }} />
            <span className="text-[13px] font-extrabold text-[#f5ebdd]">{npc.name}</span>
            <Hearts level={level} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#f5ebdd]/60 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <GameIcon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {quest && status !== 'offer' && (
          <div className="mb-2.5 rounded-xl border border-white/8 bg-black/25 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#ffc66d]/85">
                <GameIcon name={quest.icon} className="h-3 w-3" strokeWidth={1.8} />
                {quest.title}
              </span>
              <span className="font-mono text-[10px] text-[#f5ebdd]/55">
                {questValue}/{quest.max}
              </span>
            </div>
            <ProgressBar value={questValue} max={quest.max} />
          </div>
        )}

        <p className="min-h-[52px] text-[12.5px] leading-relaxed text-[#f5ebdd]/90">
          {typed}
          {!done && <span className="ml-0.5 inline-block w-1.5 animate-pulse bg-[#ffc66d]/70">&nbsp;</span>}
        </p>

        {done && (
          <div className="mt-3 flex flex-col gap-1.5">
            {dialogue.choices.map((choice, i) => {
              const isComplete = choice.action === 'complete';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChoice(choice)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-right text-[11.5px] font-semibold transition-colors ${
                    isComplete
                      ? 'border-[#65F5A0]/45 bg-[#65F5A0]/12 text-[#65F5A0] hover:bg-[#65F5A0]/20'
                      : 'border-white/10 bg-white/[0.04] text-[#f5ebdd]/85 hover:bg-white/[0.09]'
                  }`}
                >
                  <span>{choice.label}</span>
                  <GameIcon
                    name={isComplete ? 'check' : 'info'}
                    className="h-3.5 w-3.5 opacity-50"
                    strokeWidth={2}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
