/* eslint-disable no-shadow */
// import { StrictMode } from 'react';
import { Box, Flex, ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
// import Canvas from './components/canvas/canvas'; // Likely unused now
import Sidebar from "./components/sidebar/sidebar";
import Footer from "./components/footer/footer";
import { AiStateProvider } from "./context/ai-state-context";
import { Live2DConfigProvider } from "./context/live2d-config-context";
import { SubtitleProvider } from "./context/subtitle-context";
import { BgUrlProvider } from "./context/bgurl-context";
import { layoutStyles } from "./layout";
import WebSocketHandler from "./services/websocket-handler";
import { CameraProvider } from "./context/camera-context";
import { ChatHistoryProvider } from "./context/chat-history-context";
import { CharacterConfigProvider } from "./context/character-config-context";
import { Toaster } from "./components/ui/toaster";
import { VADProvider } from "./context/vad-context";
import { Live2D } from "./components/canvas/live2d";
import TitleBar from "./components/electron/title-bar";
import { InputSubtitle } from "./components/electron/input-subtitle";
import { ProactiveSpeakProvider } from "./context/proactive-speak-context";
import { ScreenCaptureProvider } from "./context/screen-capture-context";
import { GroupProvider } from "./context/group-context";
import { BrowserProvider } from "./context/browser-context";
// eslint-disable-next-line import/no-extraneous-dependencies, import/newline-after-import
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import Background from "./components/canvas/background";
import WebSocketStatus from "./components/canvas/ws-status";
import Subtitle from "./components/canvas/subtitle";
import { ModeProvider, useMode } from "./context/mode-context";
import { useIsMobile } from "./hooks/use-is-mobile";
import MobileHeader from "./components/mobile/mobile-header";
import SettingUI from "./components/sidebar/setting/setting-ui";
import { useSidebar } from "./hooks/sidebar/use-sidebar";
import { AudioMuteProvider } from "./context/audio-mute-context";

function AppContent(): JSX.Element {
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(false);
  const { mode } = useMode();
  const isElectron = window.api !== undefined;
  const isMobile = useIsMobile();
  const live2dContainerRef = useRef<HTMLDivElement>(null);
  // 手机端设置抽屉(管理密码/模型/TTS/ASR 等各项参数)
  const {
    settingsOpen: mobileSettingsOpen,
    onSettingsOpen: onMobileSettingsOpen,
    onSettingsClose: onMobileSettingsClose,
  } = useSidebar();

  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

    
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.documentElement.style.position = 'fixed';
  document.body.style.position = 'fixed';
  document.documentElement.style.width = '100%';
  document.body.style.width = '100%';

  // Define base style properties shared across modes/breakpoints
  const live2dBaseStyle = {
    position: "absolute" as const,
    overflow: "hidden",
    transition: "all 0.3s ease-in-out", // Optional transition
    pointerEvents: "auto" as const,
  };

  // Define styles specifically for the "window" mode, using responsive syntax
  const getResponsiveLive2DWindowStyle = (sidebarVisible: boolean) => ({
    ...live2dBaseStyle,
    top: isElectron ? "30px" : "0px",
    height: `calc(100% - ${isElectron ? "30px" : "0px"})`,
    zIndex: 5, // Ensure it's layered correctly below UI but above background
    left: {
      base: "0px", // Column layout (base): Start from left edge
      md: sidebarVisible ? "440px" : "24px", // Row layout (md+): Offset by sidebar width
    },
    width: {
      base: "100%", // Column layout (base): Full width
      md: `calc(100% - ${sidebarVisible ? "440px" : "24px"})`, // Row layout (md+): Adjust width based on sidebar
    },
  });

  // Define styles specifically for the "pet" mode
  const live2dPetStyle = {
    ...live2dBaseStyle,
    top: 0, // Override position for pet mode
    left: 0,
    width: "100vw", // Full viewport
    height: "100vh",
    zIndex: 15, // Higher zIndex for pet mode overlay
  };

  // 手机端(window 模式):Live2D 全屏铺满
  const live2dMobileStyle = {
    ...live2dBaseStyle,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 5,
  };

  return (
    <>
      <Box
        ref={live2dContainerRef}
        // Apply styles conditionally based on mode
        // Use the function to get dynamic responsive styles for window mode
        {...(mode === "window"
          ? isMobile
            ? live2dMobileStyle
            : getResponsiveLive2DWindowStyle(showSidebar)
          : live2dPetStyle)}
      >
        <Live2D />
      </Box>

      {/* Conditional Rendering of Window UI */}
      {mode === "window" && (
        <>
          {isElectron && <TitleBar />}
          {isMobile ? (
            /* ===== 手机端布局:顶栏 + 全屏模型 + 底部输入,☰ 出设置抽屉 ===== */
            <>
              <Box position="absolute" inset={0} zIndex={1}>
                <Background />
              </Box>
              <MobileHeader onMenuOpen={onMobileSettingsOpen} />
              <Box position="absolute" top="56px" right="12px" zIndex={30}>
                <WebSocketStatus />
              </Box>
              <Box
                position="absolute"
                top="60px"
                left="50%"
                transform="translateX(-50%)"
                zIndex={10}
                width="86%"
              >
                <Subtitle />
              </Box>
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                zIndex={20}
              >
                <Footer isCollapsed={false} onToggle={() => {}} />
              </Box>
              <SettingUI
                open={mobileSettingsOpen}
                onClose={onMobileSettingsClose}
                onToggle={() => {}}
              />
            </>
          ) : (
            <>
              {/* Apply styles by spreading */}
              <Flex {...layoutStyles.appContainer}>
                <Box
                  {...layoutStyles.sidebar}
                  {...(!showSidebar && { width: "24px" })}
                >
                  <Sidebar
                    isCollapsed={!showSidebar}
                    onToggle={() => setShowSidebar(!showSidebar)}
                  />
                </Box>
                <Box {...layoutStyles.mainContent}>
                  <Background />
                  <Box position="absolute" top="20px" left="20px" zIndex={10}>
                    <WebSocketStatus />
                  </Box>
                  <Box
                    position="absolute"
                    bottom={isFooterCollapsed ? "39px" : "135px"}
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex={10}
                    width="60%"
                  >
                    <Subtitle />
                  </Box>
                  <Box
                    {...layoutStyles.footer}
                    zIndex={10}
                    {...(isFooterCollapsed && layoutStyles.collapsedFooter)}
                  >
                    <Footer
                      isCollapsed={isFooterCollapsed}
                      onToggle={() => setIsFooterCollapsed(!isFooterCollapsed)}
                    />
                  </Box>
                </Box>
              </Flex>
            </>
          )}
        </>
      )}

      {/* Conditional Rendering of Pet Mode UI */}
      {mode === "pet" && <InputSubtitle />}
    </>
  );
}

function App(): JSX.Element {
  return (
    <ChakraProvider value={defaultSystem}>
      {/* ModeProvider needs to wrap AppContent to provide mode to getGlobalStyles */}
      <ModeProvider>
        <AppWithGlobalStyles />
      </ModeProvider>
    </ChakraProvider>
  );
}

// New component to access mode for global styles
function AppWithGlobalStyles(): JSX.Element {
  return (
    <>
      <CameraProvider>
        <ScreenCaptureProvider>
          <CharacterConfigProvider>
            <ChatHistoryProvider>
              <AiStateProvider>
                <ProactiveSpeakProvider>
                  <Live2DConfigProvider>
                    <SubtitleProvider>
                      <VADProvider>
                        <BgUrlProvider>
                          <GroupProvider>
                            <BrowserProvider>
                              <AudioMuteProvider>
                                <WebSocketHandler>
                                  <Toaster />
                                  <AppContent />
                                </WebSocketHandler>
                              </AudioMuteProvider>
                            </BrowserProvider>
                          </GroupProvider>
                        </BgUrlProvider>
                      </VADProvider>
                    </SubtitleProvider>
                  </Live2DConfigProvider>
                </ProactiveSpeakProvider>
              </AiStateProvider>
            </ChatHistoryProvider>
          </CharacterConfigProvider>
        </ScreenCaptureProvider>
      </CameraProvider>
    </>
  );
}

export default App;
