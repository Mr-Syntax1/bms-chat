import { Suspense } from 'react';
import NPC from './NPC';
import { NPC_LIST } from '../npcData';

/**
 * رندر همه‌ی NPCها. هر NPC مرز Suspense مستقل ندارد چون خودشان از
 * useGLTF می‌خوانند و در CozyScene داخل Suspense مشترک هستند؛ اما برای
 * جلوگیری از فریز لود، اینجا هم یک Suspense سبک می‌گذاریم.
 */
export default function NpcScene() {
  return (
    <Suspense fallback={null}>
      {NPC_LIST.map((npc) => (
        <NPC key={npc.id} data={npc} />
      ))}
    </Suspense>
  );
}
