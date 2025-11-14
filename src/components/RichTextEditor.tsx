import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '120px'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable features we don't want
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder
      }),
      Underline,
      TextStyle,
      Color,
    ],

    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[' + minHeight + '] p-3',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const textColors = [
    { name: 'Đen', value: '#000000' },
    { name: 'Xám', value: '#6B7280' },
    { name: 'Đỏ', value: '#EF4444' },
    { name: 'Cam', value: '#F97316' },
    { name: 'Vàng', value: '#EAB308' },
    { name: 'Xanh lá', value: '#22C55E' },
    { name: 'Xanh dương', value: '#3B82F6' },
    { name: 'Tím', value: '#A855F7' },
  ];

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="rich-text-editor">
      {/* Toolbar - Chỉ có Bold, Italic, Underline, Color */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {/* Bold */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
          data-testid="button-bold"
          title="In đậm (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        {/* Italic */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
          data-testid="button-italic"
          title="In nghiêng (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Underline */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-muted' : ''}
          data-testid="button-underline"
          title="Gạch chân (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Color */}
        <div className="flex items-center gap-1">
          <Palette className="h-4 w-4 text-muted-foreground" />
          {textColors.map((color) => (
            <button
              key={color.value}
              type="button"
              className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
              onClick={() => editor.chain().focus().setColor(color.value).run()}
              title={color.name}
            />
          ))}
          {/* Reset color */}
          <button
            type="button"
            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform bg-white flex items-center justify-center text-xs"
            onClick={() => editor.chain().focus().unsetColor().run()}
            title="Xóa màu"
          >
            ×
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
