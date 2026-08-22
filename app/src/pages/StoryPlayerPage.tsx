import { useCallback, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StoryPlayer from '@/components/StoryPlayer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiDownload } from '@/api/client';

/**
 * 剧情播放页 — /juqing?story=<id>
 * 支持 after=crash&file=<attachmentId>：完播后弹窗下载崩溃日志
 * 全屏沉浸式视觉小说播放，无 Navbar/Footer
 */
export default function StoryPlayerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storyId = searchParams.get('story') || '';
  const after = searchParams.get('after') || '';
  const file = searchParams.get('file') || '';
  const [showCrashDialog, setShowCrashDialog] = useState(false);

  const goBack = useCallback(() => {
    // 剧情播完，尝试回到上一页，否则回首页
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleComplete = useCallback(() => {
    // 节点1 链路：剧情结束后引导下载崩溃日志
    if (after === 'crash' && file) {
      setShowCrashDialog(true);
    } else {
      goBack();
    }
  }, [after, file, goBack]);

  const handleCancel = useCallback(() => {
    setShowCrashDialog(false);
    goBack();
  }, [goBack]);

  const handleDownload = useCallback(() => {
    setShowCrashDialog(false);
    apiDownload(`/api/files/${file}`, 'crash_11020122_143300.log')
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('下载崩溃日志失败:', e);
      })
      .finally(() => goBack());
  }, [file, goBack]);

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
    <>
      <StoryPlayer
        storyId={storyId}
        onComplete={handleComplete}
        allowSkip={true}
      />
      {/* z-[200] 覆盖 StoryPlayer 的 z-[100] */}
      <Dialog open={showCrashDialog} onOpenChange={setShowCrashDialog}>
        <DialogContent className="z-[200] max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>剧情结束</DialogTitle>
            <DialogDescription>
              系统检测到一条崩溃日志（crash_11020122_143300.log），是否下载？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>取消</Button>
            <Button onClick={handleDownload}>下载崩溃日志</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
