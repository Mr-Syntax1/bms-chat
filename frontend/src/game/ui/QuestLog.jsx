import { useEffect, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import {
  QUEST_STEPS,
  questValue,
  isQuestStepLocked,
  getActiveQuestStep,
  NPC_QUEST_LIST,
  npcQuestValue,
  npcQuestStatus,
} from '../questSteps';
import { NPC_BY_ID } from '../npcData';
import { RARITY } from '../fishData';
import { DAILY_BY_ID, challengeProgress } from '../dailyChallenges';
import { ProgressBar } from './primitives';
import { GameIcon } from './icons';

const ITEMS = [
  { icon: 'map', label: 'تکه نقشه', key: 'parchments', max: 3 },
  { icon: 'lantern', label: 'فانوس', key: 'lanterns', max: 5 },
  { icon: 'key', label: 'کلید', key: 'key', max: 1 },
  { icon: 'shell', label: 'صدف', key: 'shells', max: 10 },
];

const TABS = [
  { id: 'story', label: 'داستان', icon: 'scroll' },
  { id: 'daily', label: 'چالش روزانه', icon: 'star' },
  { id: 'npc', label: 'NPCها', icon: 'users' },
  { id: 'friends', label: 'دوستی', icon: 'heart' },
  { id: 'treasure', label: 'گنج‌ها', icon: 'acorn' },
];

function QuestCard({ step, value, max, done, locked, active }) {
  return (
    <div
      className={`rounded-xl border p-2.5 transition-colors ${
        done
          ? 'border-[#5d9b78]/40 bg-[#5d9b78]/10'
          : locked
            ? 'border-white/6 bg-black/20 opacity-55'
            : active
              ? 'border-[#ffc66d]/45 bg-[#ffc66d]/10'
              : 'border-white/10 bg-black/25'
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[#f5ebdd]" aria-hidden="true">
          <GameIcon name={locked ? 'lock' : step.icon} className="h-4 w-4" strokeWidth={1.7} />
        </span>
        <span className="flex-1 text-[11px] font-bold text-[#f5ebdd]">{step.title}</span>
        {active && (
          <span className="rounded-full bg-[#ff9a4d]/25 px-1.5 py-0.5 text-[8px] font-bold text-[#ffc66d]">
            فعال
          </span>
        )}
        <span className={`font-mono text-[10px] ${done ? 'text-[#65F5A0]' : 'text-[#f5ebdd]/55'}`}>
          {value}/{max}
        </span>
      </div>
      <p className="mb-1.5 text-[10px] leading-relaxed text-[#f5ebdd]/50">{step.desc}</p>
      <ProgressBar value={value} max={max} />
    </div>
  );
}

function Hearts({ level }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`سطح دوستی ${level}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <GameIcon
          key={i}
          name="heart"
          className={`h-3 w-3 ${i < level ? 'text-[#ff6b8a]' : 'text-[#f5ebdd]/18'}`}
          strokeWidth={1.8}
          fill={i < level ? '#ff6b8a' : 'none'}
        />
      ))}
    </div>
  );
}

/**
 * کشوی سمت راست: پیشرفت مأموریت‌ها + NPCها + دوستی + گنج‌ها + اینونتوری.
 * با ESC یا کلیک بیرون بسته می‌شود.
 */
export default function QuestLog({ open, onClose }) {
  const quests = usePlayerStore((s) => s.quests);
  const collected = usePlayerStore((s) => s.collected);
  const foods = usePlayerStore((s) => s.foods);
  const eatFood = usePlayerStore((s) => s.eatFood);
  const fishCaught = usePlayerStore((s) => s.fishCaught);
  const bugsCaught = usePlayerStore((s) => s.bugsCaught);
  const forageItems = usePlayerStore((s) => s.forageItems);
  const goldenAcorns = usePlayerStore((s) => s.goldenAcorns);
  const friendshipLevels = usePlayerStore((s) => s.friendshipLevels);
  const npcInteractions = usePlayerStore((s) => s.npcInteractions);
  const ingredients = usePlayerStore((s) => s.ingredients);
  const nightFireflies = usePlayerStore((s) => s.nightFireflies);
  const active = getActiveQuestStep(quests);
  const [tab, setTab] = useState('story');

  // وضعیت کامل استور برای محاسبه‌ی کوئست NPC (snapshot سبک در رندر)
  const stateSnapshot = { quests, collected, fishCaught, bugsCaught, ingredients, goldenAcorns, nightFireflies, npcInteractions };

  // گروه‌بندی گیاهان چیده‌شده بر اساس نوع (Phase 3d)
  const forageGroups = [];
  for (const item of forageItems) {
    let group = forageGroups.find((g) => g.id === item.id);
    if (!group) {
      group = { id: item.id, name: item.name, icon: item.icon, rarityColor: item.rarityColor, count: 0 };
      forageGroups.push(group);
    }
    group.count += 1;
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.code === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="fixed inset-0 z-[100] cursor-default bg-black/40 backdrop-blur-[2px] cozy-fade-in"
      />

      <aside className="fixed right-0 top-0 z-[101] h-full w-[320px] max-w-[90vw] overflow-y-auto border-l border-white/10 bg-[#171426]/94 p-4 backdrop-blur-xl cozy-pop-in">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#f5ebdd]">دفترچه‌ی کمپ</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/12 text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <GameIcon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* تب‌ها */}
        <div className="mb-3 grid grid-cols-5 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[9px] font-bold transition-colors ${
                tab === t.id
                  ? 'border-[#ffc66d]/50 bg-[#ff9a4d]/16 text-[#ffc66d]'
                  : 'border-white/8 bg-black/25 text-[#f5ebdd]/55 hover:text-[#f5ebdd]'
              }`}
            >
              <GameIcon name={t.icon} className="h-4 w-4" strokeWidth={1.7} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ---- تب داستان ---- */}
        {tab === 'story' && (
          <>
            <section className="mb-5">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
                مأموریت داستانی
              </h3>
              <div className="space-y-2">
                {QUEST_STEPS.map((step) => {
                  const value = questValue(quests, step.key);
                  const done = value >= step.max;
                  const locked = !done && isQuestStepLocked(quests, step.key);
                  const isActive = !done && !locked && active.step.key === step.key;
                  return (
                    <QuestCard
                      key={step.key}
                      step={step}
                      value={value}
                      max={step.max}
                      done={done}
                      locked={locked}
                      active={isActive}
                    />
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">اینونتوری</h3>
              <div className="grid grid-cols-4 gap-2">
                {ITEMS.map((item) => {
                  const value = questValue(quests, item.key);
                  const full = value >= item.max;
                  return (
                    <div
                      key={item.key}
                      title={`${item.label} — ${value}/${item.max}`}
                      className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-colors ${
                        full
                          ? 'border-[#5d9b78]/45 bg-[#5d9b78]/12'
                          : value > 0
                            ? 'border-[#ffc66d]/30 bg-[#ffc66d]/8'
                            : 'border-white/8 bg-black/25'
                      }`}
                    >
                      <span className="text-[#f5ebdd]" aria-hidden="true">
                        <GameIcon name={item.icon} className="h-5 w-5" strokeWidth={1.7} />
                      </span>
                      <span className={`mt-0.5 font-mono text-[9px] ${full ? 'text-[#65F5A0]' : 'text-[#f5ebdd]/50'}`}>
                        {value}/{item.max}
                      </span>
                      <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-[#0d0b16]/95 px-2 py-0.5 text-[9px] text-[#f5ebdd] group-hover:block">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <FishSection fishCaught={fishCaught} />
            <BugSection bugsCaught={bugsCaught} />
            <ForageSection forageGroups={forageGroups} forageItems={forageItems} />
            <FoodSection foods={foods} eatFood={eatFood} />
          </>
        )}

        {/* ---- تب چالش روزانه ---- */}
        {tab === 'daily' && <DailySection />}

        {/* ---- تب NPCها ---- */}
        {tab === 'npc' && (
          <section className="space-y-2">
            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
              مأموریت‌های NPC
            </h3>
            {NPC_QUEST_LIST.map((quest) => {
              const npc = NPC_BY_ID[quest.npcId];
              const value = Math.min(npcQuestValue(quest.npcId, stateSnapshot), quest.max);
              const status = npcQuestStatus(quest.npcId, stateSnapshot);
              const done = status === 'done';
              return (
                <div
                  key={quest.id}
                  className={`rounded-xl border p-2.5 ${
                    done
                      ? 'border-[#5d9b78]/40 bg-[#5d9b78]/10'
                      : status === 'turnin'
                        ? 'border-[#65F5A0]/40 bg-[#65F5A0]/8'
                        : status === 'active'
                          ? 'border-[#ffc66d]/40 bg-[#ffc66d]/8'
                          : 'border-white/10 bg-black/25'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: npc?.accent }} />
                    <span className="flex-1 text-[11px] font-bold text-[#f5ebdd]">{npc?.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        done
                          ? 'bg-[#5d9b78]/25 text-[#65F5A0]'
                          : status === 'turnin'
                            ? 'bg-[#65F5A0]/20 text-[#65F5A0]'
                            : status === 'active'
                              ? 'bg-[#ff9a4d]/25 text-[#ffc66d]'
                              : 'bg-white/8 text-[#f5ebdd]/55'
                      }`}
                    >
                      {done ? 'تمام' : status === 'turnin' ? 'تحویل' : status === 'active' ? 'فعال' : 'جدید'}
                    </span>
                  </div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] text-[#f5ebdd]/70">
                      <GameIcon name={quest.icon} className="h-3 w-3" strokeWidth={1.8} />
                      {quest.title}
                    </span>
                    <span className="font-mono text-[9px] text-[#f5ebdd]/50">
                      {value}/{quest.max}
                    </span>
                  </div>
                  <p className="mb-1.5 text-[9.5px] leading-relaxed text-[#f5ebdd]/45">{quest.desc}</p>
                  <ProgressBar value={value} max={quest.max} />
                  <div className="mt-1 text-[8.5px] text-[#ffc66d]/60">پاداش: {quest.reward?.label}</div>
                </div>
              );
            })}
          </section>
        )}

        {/* ---- تب دوستی ---- */}
        {tab === 'friends' && (
          <section className="space-y-2">
            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
              سطح دوستی
            </h3>
            {Object.values(NPC_BY_ID).map((npc) => {
              const level = friendshipLevels[npc.id] || 1;
              const xp = npcInteractions[npc.id]?.xp || 0;
              const nextXp = level >= 5 ? 0 : level * 40 - xp;
              return (
                <div key={npc.id} className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#f5ebdd]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: npc.accent }} />
                      {npc.name}
                    </span>
                    <Hearts level={level} />
                  </div>
                  <ProgressBar value={level >= 5 ? 1 : (xp % 40) / 40} max={1} />
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-[#f5ebdd]/40">
                    <span>سطح {level} از ۵</span>
                    <span>{level >= 5 ? 'حداکثر' : `${nextXp} XP تا سطح بعد`}</span>
                  </div>
                  {level >= 3 && (
                    <div className="mt-1 text-[8.5px] text-[#65F5A0]/70">هدیه‌ی دوستی باز شد</div>
                  )}
                  {level >= 5 && (
                    <div className="text-[8.5px] text-[#ffc66d]/70">داستان شخصی باز شد</div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ---- تب گنج‌ها ---- */}
        {tab === 'treasure' && (
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
              بلوط‌های طلایی ({goldenAcorns.length}/۶)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => {
                const found = goldenAcorns.includes(i);
                return (
                  <div
                    key={i}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl border ${
                      found
                        ? 'border-[#ffc66d]/45 bg-[#ffc66d]/12 text-[#ffc66d]'
                        : 'border-white/8 bg-black/25 text-[#f5ebdd]/25'
                    }`}
                  >
                    <GameIcon name="acorn" className="h-5 w-5" strokeWidth={1.7} />
                    <span className="mt-1 font-mono text-[8px]">{found ? 'یافت' : 'پنهان'}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] leading-relaxed text-[#f5ebdd]/45">
              بلوط‌ها نزدیک آبشار و در عمق جنگل پنهان‌اند؛ برق‌های کوچک را دنبال کن.
            </p>
            <div className="mt-3">
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
                کرم شب‌تاب شبانه
              </h3>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 p-2.5">
                <span className="flex items-center gap-1.5 text-[11px] text-[#f5ebdd]/80">
                  <GameIcon name="firefly" className="h-4 w-4 text-[#ffe07a]" strokeWidth={1.7} />
                  جمع‌شده در شب
                </span>
                <span className="font-mono text-[11px] text-[#ffe07a]">
                  {nightFireflies || 0}/10
                </span>
              </div>
            </div>
          </section>
        )}

        <p className="mt-5 rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] leading-relaxed text-[#f5ebdd]/40">
          نکته: کنار هر NPC با E گفتگو کن. «!» یعنی مأموریت تازه، «?» یعنی در جریان.
        </p>
      </aside>
    </>
  );
}

function DailySection() {
  const dailyChallenges = usePlayerStore((s) => s.dailyChallenges);
  const dailyProgress = usePlayerStore((s) => s.dailyProgress);
  const dailyCompleted = usePlayerStore((s) => s.dailyCompleted);
  const dailyXp = usePlayerStore((s) => s.dailyXp);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
          چالش‌های امروز
        </h3>
        <span className="flex items-center gap-1 font-mono text-[10px] text-[#ffc66d]/80">
          <GameIcon name="star" className="h-3 w-3" strokeWidth={1.8} />
          {dailyXp} XP
        </span>
      </div>
      {dailyChallenges.length === 0 && (
        <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
          در حال بارگذاری چالش‌های امروز…
        </p>
      )}
      {dailyChallenges.map((id) => {
        const challenge = DAILY_BY_ID[id];
        if (!challenge) return null;
        const value = Math.min(challengeProgress(challenge, dailyProgress), challenge.target);
        const done = dailyCompleted.includes(id) || value >= challenge.target;
        return (
          <div
            key={id}
            className={`rounded-xl border p-2.5 ${
              done ? 'border-[#5d9b78]/40 bg-[#5d9b78]/10' : 'border-[#ffc66d]/35 bg-[#ffc66d]/8'
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[#f5ebdd]" aria-hidden="true">
                <GameIcon name={done ? 'check' : 'star'} className="h-4 w-4" strokeWidth={1.7} />
              </span>
              <span className="flex-1 text-[11px] font-bold text-[#f5ebdd]">{challenge.description}</span>
              <span className={`font-mono text-[10px] ${done ? 'text-[#65F5A0]' : 'text-[#f5ebdd]/55'}`}>
                {value}/{challenge.target}
              </span>
            </div>
            <ProgressBar value={value} max={challenge.target} />
            <div className="mt-1 flex items-center justify-between text-[8.5px] text-[#ffc66d]/60">
              <span>پاداش: {challenge.reward?.xp || 0} XP</span>
              <span>{done ? 'کامل شد' : 'در جریان'}</span>
            </div>
          </div>
        );
      })}
      <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] leading-relaxed text-[#f5ebdd]/40">
        چالش‌ها هر روز نیمه‌شب عوض می‌شوند؛ هر روز سر بزن.
      </p>
    </section>
  );
}

function FishSection({ fishCaught }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
        ماهی‌های صیدشده ({fishCaught.length})
      </h3>
      {fishCaught.length === 0 ? (
        <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
          هنوز ماهی نگرفتی. کنار رودخانه یا اسکله با E ماهیگیری کن.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {fishCaught.map((fish) => {
            const rarity = RARITY[fish.rarity] || RARITY.common;
            return (
              <div
                key={fish.uid}
                title={`${fish.name}${fish.junk ? '' : ` — ${fish.weight} کیلو`} (${rarity.label})`}
                className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-black/25"
                style={{ borderColor: `${rarity.color}55` }}
              >
                <span style={{ color: rarity.color }} aria-hidden="true">
                  <GameIcon name={fish.icon} className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{fish.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BugSection({ bugsCaught }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
        حشرات گرفته‌شده ({bugsCaught.length})
      </h3>
      {bugsCaught.length === 0 ? (
        <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
          هنوز حشره‌ای نگرفتی. نزدیک پروانه/سوسک/کرم شب‌تاب با F تور بزن.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {bugsCaught.map((bug) => (
            <div
              key={bug.uid}
              title={`${bug.name}`}
              className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-black/25"
              style={{ borderColor: `${bug.rarityColor || '#9fd6b0'}55` }}
            >
              <span style={{ color: bug.rarityColor || '#9fd6b0' }} aria-hidden="true">
                <GameIcon name={bug.icon} className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{bug.name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ForageSection({ forageGroups, forageItems }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
        گیاهان چیده‌شده ({forageItems.length})
      </h3>
      {forageGroups.length === 0 ? (
        <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
          هنوز گیاهی نچیدی. کنار قارچ/توت/گیاه با F بچین.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {forageGroups.map((group) => (
            <div
              key={group.id}
              title={`${group.name} ×${group.count}`}
              className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-black/25"
              style={{ borderColor: `${group.rarityColor || '#9fd6b0'}55` }}
            >
              <span style={{ color: group.rarityColor || '#9fd6b0' }} aria-hidden="true">
                <GameIcon name={group.icon} className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{group.name}</span>
              <span className="font-mono text-[8px] text-[#f5ebdd]/45">×{group.count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FoodSection({ foods, eatFood }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#ffc66d]/80">
        غذاهای پخته‌شده ({foods.length})
      </h3>
      {foods.length === 0 ? (
        <p className="rounded-xl border border-white/6 bg-black/20 p-2.5 text-[10px] text-[#f5ebdd]/40">
          هنوز چیزی نپختی. سر یک ایستگاه پخت برو و E را نگه دار.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {foods.map((dish) => (
            <button
              key={dish.uid}
              type="button"
              onClick={() => eatFood(dish.uid)}
              title={`${dish.name} (${dish.qualityLabel}) — برای خوردن کلیک کن`}
              className={`group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border transition-colors hover:brightness-110 ${
                dish.quality === 'perfect'
                  ? 'border-[#ffc66d]/50 bg-[#ffc66d]/12'
                  : dish.quality === 'burnt'
                    ? 'border-[#ef4444]/40 bg-[#ef4444]/10'
                    : 'border-[#5d9b78]/35 bg-[#5d9b78]/8'
              }`}
            >
              <span className="text-[#f5ebdd]" aria-hidden="true">
                <GameIcon name={dish.icon} className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <span className="mt-0.5 line-clamp-1 px-0.5 text-[8px] text-[#f5ebdd]/65">{dish.name}</span>
              <span className="flex items-center gap-1 font-mono text-[8px] text-[#f5ebdd]/45">
                <GameIcon name="plate" className="h-2.5 w-2.5" strokeWidth={2} />
                {dish.hunger}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
