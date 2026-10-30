// EmojiPickerPanel.jsx
import { EmojiPicker } from '@ferrucc-io/emoji-picker';

export default function EmojiPickerPanel({ onEmojiSelect }) {
  return (
    <EmojiPicker
      onEmojiSelect={onEmojiSelect}
      emojisPerRow={8}
      emojiSize={32}
      containerHeight={380}
      className="w-[340px]"
    >
      <EmojiPicker.Header className="p-2 pb-0">
        <EmojiPicker.Input placeholder="جستجوی ایموجی..." className="w-full" />
      </EmojiPicker.Header>
      <EmojiPicker.Group className="gap-2">
        <EmojiPicker.List hideStickyHeader={true} />
      </EmojiPicker.Group>
    </EmojiPicker>
  );
}