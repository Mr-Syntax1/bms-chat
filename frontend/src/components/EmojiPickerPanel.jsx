// EmojiPickerPanel.jsx
import EmojiPicker from 'emoji-picker-react';

export default function EmojiPickerPanel({ onEmojiSelect }) {
  return (
    <div className="w-full sm:w-[360px]">
      <EmojiPicker
        onEmojiClick={(emojiObject) => onEmojiSelect(emojiObject.emoji)}
        theme="dark"
        searchDisabled={false}
        skinTonesDisabled={false}
        width="100%"
        height={380}
        //  این استایل‌ها ظاهر آن را از دیسکورد هم مدرن‌تر و هماهنگ با تم شما می‌کند 
        style={{
          '--epr-bg-color': '#0f1115', // پس‌زمینه‌ی فوق‌العاده تیره و شیک
          '--epr-category-label-bg-color': '#0f1115',
          '--epr-category-icon-active-color': '#6366f1', // رنگ primary-500 شما
          '--epr-hover-bg-color': 'rgba(99, 102, 241, 0.15)', // هاور نرم با درخشش اولیه
          '--epr-search-border-color': 'rgba(255, 255, 255, 0.08)',
          '--epr-search-bg-color': '#161920',
          '--epr-emoji-variation-picker-bg-color': '#161920',
          '--epr-border-radius': '16px', // گوشه‌های گردتر و مدرن‌تر از دیسکورد
          '--epr-text-color': '#e2e8f0',
          '--epr-search-input-bg-color': '#161920',
          '--epr-search-input-text-color': '#e2e8f0',
        }}
      />
    </div>
  );
}