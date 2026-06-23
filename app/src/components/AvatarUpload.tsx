import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiUploadAvatar } from '@/api/client';
import { Camera, Loader2, ZoomIn, ZoomOut, Film } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CROP_SIZE = 200;

export function AvatarUpload() {
  const { user, updateAvatar } = useAuth();
  const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || '');
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isGif, setIsGif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }
    setFile(f);
    setIsGif(f.type === 'image/gif');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setOpen(true);
  }, []);

  // 拖动 —— 拖动的是 200×200 的基准图（缩放由 CSS transform 处理）
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  // 上传（GIF 直接传原文件，非 GIF 走 Canvas 裁剪）
  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    try {
      if (isGif) {
        // GIF：直接上传原文件，保留动画
        const avatarUrl = await apiUploadAvatar(file, 'gif');
        updateAvatar(avatarUrl);
        setPreviewUrl(avatarUrl + '?t=' + Date.now());
        setOpen(false);
        return;
      }

      // 非 GIF：Canvas 裁剪流程
      if (!imgRef.current) return;
      const img = imgRef.current;
      if (!img.complete || img.naturalWidth === 0) {
        alert('图片尚未加载完成，请稍后再试');
        return;
      }

      const canvas = canvasRef.current!;
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext('2d')!;

      // Step 1: 将原图按 object-fit:cover 绘制到 200×200 基准 canvas
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = CROP_SIZE;
      baseCanvas.height = CROP_SIZE;
      const bctx = baseCanvas.getContext('2d')!;

      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const fitScale = Math.max(CROP_SIZE / naturalW, CROP_SIZE / naturalH);
      const dw = naturalW * fitScale;
      const dh = naturalH * fitScale;
      const dx = (CROP_SIZE - dw) / 2;
      const dy = (CROP_SIZE - dh) / 2;

      bctx.drawImage(img, dx, dy, dw, dh);

      // Step 2: 从 200×200 基准图上，按 zoom + offset 提取最终区域
      const sx = CROP_SIZE / 2 - (CROP_SIZE / 2) / zoom - offset.x / zoom;
      const sy = CROP_SIZE / 2 - (CROP_SIZE / 2) / zoom - offset.y / zoom;
      const sw = CROP_SIZE / zoom;
      const sh = CROP_SIZE / zoom;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
      ctx.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, CROP_SIZE, CROP_SIZE);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('裁剪失败'))), 'image/png');
      });

      const avatarUrl = await apiUploadAvatar(blob);
      updateAvatar(avatarUrl);
      setPreviewUrl(avatarUrl + '?t=' + Date.now());
      setOpen(false);
    } catch (e: any) {
      alert(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  }, [file, isGif, offset, zoom, updateAvatar]);

  // 临时预览 URL
  const tempPreviewUrl = file ? URL.createObjectURL(file) : null;
  useEffect(() => {
    return () => {
      if (tempPreviewUrl) URL.revokeObjectURL(tempPreviewUrl);
    };
  }, [tempPreviewUrl]);

  return (
    <div>
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <div className={`h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 group-hover:border-primary/50 transition-colors ${previewUrl ? 'border-border/40' : 'bg-primary/10 border-primary/20 text-primary'}`}>
          {previewUrl ? (
            <img src={previewUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-muted-foreground/50">
              {user?.username?.slice(0, 2).toUpperCase() || '?'}
            </span>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="h-5 w-5 text-white/80" />
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" style={{ display: 'none' }} onChange={handleFile} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">设置头像</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {tempPreviewUrl ? (
              isGif ? (
                <>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs">
                    <Film className="h-3 w-3" />
                    <span>GIF 动图 · 保留动画</span>
                  </div>
                  <div className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-2 border-purple-500/30">
                    <img
                      ref={imgRef}
                      src={tempPreviewUrl}
                      alt="gif preview"
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    GIF 动图将完整保留动画效果<br />头像尺寸自动裁剪为圆形
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">拖动图片调整位置</p>
                  <div
                    className="relative w-[200px] h-[200px] rounded-full overflow-hidden border-2 border-primary/30 cursor-move select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ background: '#000' }}
                  >
                    {/* 基准图：200×200 object-fit:cover，缩放由 CSS transform 处理 */}
                    <img
                      ref={imgRef}
                      src={tempPreviewUrl}
                      alt="preview"
                      className="absolute pointer-events-none"
                      style={{
                        width: `${CROP_SIZE}px`,
                        height: `${CROP_SIZE}px`,
                        objectFit: 'cover',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        left: `${offset.x}px`,
                        top: `${offset.y}px`,
                      }}
                      draggable={false}
                    />
                    {/* 中心十字 + 暗角 */}
                    <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: 'inset 0 0 0 999px rgba(0,0,0,0.3)' }}>
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/15" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/15" />
                    </div>
                  </div>

                  {/* 缩放控件 */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(1, z - 0.2))}>
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )
            ) : (
              <div className="p-8">
                <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground text-center">点击下方按钮选择图片</p>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => inputRef.current?.click()}>
                选择图片
              </Button>
              <Button className="flex-1" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />上传中</> : '保存头像'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
