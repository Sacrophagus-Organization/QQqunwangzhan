export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 py-4">
      <div className="container mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-muted-foreground font-heading tracking-wide">
        <span>© {new Date().getFullYear()} 石棺解密记录站</span>
        <span className="hidden sm:inline text-border/60">|</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          苏ICP备2026040926号
        </a>
      </div>
    </footer>
  );
}
