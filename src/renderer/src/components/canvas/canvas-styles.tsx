export const canvasStyles = {
  background: {
    container: {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'auto',
    },
    image: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: 1,
    },
    video: {
      position: 'absolute' as const,
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      zIndex: 1,
      transform: 'scaleX(-1)' as const,
    },
  },
  canvas: {
    container: {
      position: 'relative',
      width: '100%',
      height: '100%',
      zIndex: '1',
      pointerEvents: 'auto',
    },
  },
  subtitle: {
    container: {
      // 文字泡样式:深色半透明气泡,白字,无白框感;仅在回复有内容时出现
      backgroundColor: 'rgba(20, 22, 30, 0.62)',
      backdropFilter: 'blur(8px)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '16px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      maxWidth: '95%',
    },
    text: {
      color: 'white',
      fontSize: '1.1rem',
      textAlign: 'center',
      lineHeight: '1.4',
      whiteSpace: 'pre-wrap',
    },
  },
  wsStatus: {
    container: {
      position: 'relative',
      // top: '20px',
      // left: '20px',
      zIndex: 2,
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'medium',
      color: 'white',
      transition: 'all 0.2s',
      cursor: 'pointer',
      userSelect: 'none',
      _hover: {
        opacity: 0.8,
      },
    },
  },
};
