/* eslint-disable no-underscore-dangle */
/* Live2D 触摸手势:单指在模型上拖动移动,双指捏合缩放(0.1~5),缩放结果按模型名持久化。
   桌面端已有的滚轮缩放/鼠标拖动不受影响。 */
import { useRef, useCallback } from 'react';
import { LAppDelegate } from '../../../WebSDK/src/lappdelegate';
import {
  saveScaleForModel, getAppliedScale, scaleModelBy, getActiveModelName,
} from '@/utils/live2d-control';

const TAP_MOVE_TOLERANCE = 8; // px,小于该位移视为点按(让点击触发动作的旧逻辑接管)

interface Pt { x: number; y: number }

export const useLive2DTouch = () => {
  const pointers = useRef(new Map<number, Pt>());
  const drag = useRef<{
    active: boolean;
    start: Pt;            // 触点起始(屏幕坐标)
    modelOrigin: Pt;      // 模型矩阵起始位置
    modelStart: Pt;       // 触点起始对应的模型坐标
    moved: boolean;
  } | null>(null);
  const pinch = useRef<{ startDist: number; startScale: number } | null>(null);

  const getView = useCallback(() => LAppDelegate.getInstance().getView(), []);

  const screenToCanvas = useCallback((clientX: number, clientY: number): Pt | null => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / canvas.clientWidth;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  }, []);

  const toModelCoord = useCallback((cx: number, cy: number): Pt | null => {
    const view = getView();
    if (!view?._deviceToScreen) return null;
    return {
      x: view._deviceToScreen.transformX(cx),
      y: view._deviceToScreen.transformY(cy),
    };
  }, [getView]);

  const dist = (a: Pt, b: Pt): number =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const model = (window as any).getLAppAdapter?.()?.getModel?.();
    if (!model) return;
    const view = getView();
    if (!view) return;

    for (const t of Array.from(e.changedTouches)) {
      pointers.current.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (pointers.current.size === 1) {
      const t = e.changedTouches[0];
      const cc = screenToCanvas(t.clientX, t.clientY);
      const mc = cc && toModelCoord(cc.x, cc.y);
      const matrix = model._modelMatrix?.getArray?.();
      const hit = mc && (model.anyhitTest(mc.x, mc.y) !== null || model.isHitOnModel(mc.x, mc.y));
      drag.current = hit && mc && matrix ? {
        active: true,
        start: { x: t.clientX, y: t.clientY },
        modelOrigin: { x: matrix[12], y: matrix[13] },
        modelStart: mc,
        moved: false,
      } : null;
    } else if (pointers.current.size === 2) {
      // 进入捏合,取消拖动
      drag.current = null;
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { startDist: Math.max(dist(a, b), 1), startScale: getAppliedScale() };
    }
  }, [screenToCanvas, toModelCoord, getView]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      const p = pointers.current.get(t.identifier);
      if (p) { p.x = t.clientX; p.y = t.clientY; }
    }

    // 双指捏合缩放
    if (pointers.current.size === 2 && pinch.current) {
      e.preventDefault();
      const [a, b] = Array.from(pointers.current.values());
      const ratio = dist(a, b) / pinch.current.startDist;
      // 经统一入口调整:大画布模型走 manager.setUserScale,小画布模型直接改矩阵
      scaleModelBy(ratio);
      return;
    }

    // 单指拖动模型
    if (pointers.current.size === 1 && drag.current?.active) {
      const t = e.changedTouches[0];
      const dx = t.clientX - drag.current.start.x;
      const dy = t.clientY - drag.current.start.y;
      if (Math.abs(dx) + Math.abs(dy) > TAP_MOVE_TOLERANCE) {
        drag.current.moved = true;
        e.preventDefault();
        const cc = screenToCanvas(t.clientX, t.clientY);
        const mc = cc && toModelCoord(cc.x, cc.y);
        const model = (window as any).getLAppAdapter?.()?.getModel?.();
        if (mc && model?._modelMatrix) {
          const newMatrix = [...model._modelMatrix.getArray()];
          newMatrix[12] = drag.current.modelOrigin.x + (mc.x - drag.current.modelStart.x);
          newMatrix[13] = drag.current.modelOrigin.y + (mc.y - drag.current.modelStart.y);
          model._modelMatrix.setMatrix(newMatrix);
        }
      }
    }
  }, [screenToCanvas, toModelCoord]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      pointers.current.delete(t.identifier);
    }
    // 捏合结束:记录该模型的缩放(名字取自活动模型,避免依赖可能滞后的 React 状态)
    if (pinch.current && pointers.current.size < 2) {
      saveScaleForModel(getActiveModelName(), getAppliedScale());
      pinch.current = null;
    }
    if (pointers.current.size === 0) {
      drag.current = null;
    }
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
};
