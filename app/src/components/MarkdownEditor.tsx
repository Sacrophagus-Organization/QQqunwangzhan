import { useCallback } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import type { ICommand } from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

/**
 * 图片上传到 /api/images/upload，返回 ![](url) 插入编辑器
 */
function uploadImage(file: File): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('arkoverseer_token');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/images/upload');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.url });
        } catch {
          reject(new Error('解析响应失败'));
        }
      } else {
        let errMsg = '上传失败';
        try {
          const errData = JSON.parse(xhr.responseText);
          errMsg = errData.error || errMsg;
        } catch { /* ignore */ }
        reject(new Error(errMsg));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('网络错误')));
    xhr.send(formData);
  });
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '开始编写 Markdown...',
  minHeight = '250px',
  className = '',
}: MarkdownEditorProps) {
  /**
   * 自定义"插入图片"工具栏按钮：
   * 点击后弹出文件选择器 → 上传 → 在当前光标位置插入 ![](url)
   */
  const imageCommand: ICommand = {
    name: 'image',
    keyCommand: 'image',
    buttonProps: { 'aria-label': '插入图片', title: '插入图片' },
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    execute: (_state, api) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const { url } = await uploadImage(file);
          // 在当前光标位置或替换选中文本
          api.replaceSelection(`![](${url})`);
        } catch (e: any) {
          alert('图片上传失败：' + e.message);
        }
      };
      input.click();
    },
  };

  // 按需保留的核心工具栏命令：加粗、斜体、标题、代码块、引用、图片
  const toolbarCommands = [
    commands.group([], { name: 'format', groupName: 'format' }),
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.divider,
    commands.title1,
    commands.title2,
    commands.title3,
    commands.divider,
    commands.quote,
    commands.code,
    commands.codeBlock,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.divider,
    commands.link,
    imageCommand,
  ];

  const handleChange = useCallback(
    (val?: string) => {
      onChange(val || '');
    },
    [onChange],
  );

  return (
    <div className={className} data-color-mode="dark">
      <MDEditor
        value={value}
        onChange={handleChange}
        commands={toolbarCommands}
        preview="live"
        height={minHeight}
        visibleDragbar={false}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
}
