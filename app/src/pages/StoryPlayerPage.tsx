import { useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StoryPlayer from '@/components/StoryPlayer';

/**
 * 剧情播放页 — /juqing?story=<id>
 * 全屏沉浸式视觉小说播放，无 Navbar/Footer
 */
export default function StoryPlayerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storyId = searchParams.get('story') || '';

  const handleComplete = useCallback(() => {
    // 剧情播完，尝试回到上一页，否则回首页
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!storyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">未指定剧情</h1>
          <p className="text-muted-foreground">请通过正确的链接访问剧情播放页面。</p>
        </div>
      </div>
    );
  }

  return (
    <StoryPlayer
      storyId={storyId}
      onComplete={handleComplete}
      allowSkip={true}
    />
  );
}
