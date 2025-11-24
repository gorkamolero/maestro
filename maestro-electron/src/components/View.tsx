import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import Yoga from 'yoga-layout';

interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewContextValue {
  node: Yoga.YogaNode;
  bounds: ViewBounds | null;
  layoutReady: boolean;
  backdrop?: boolean;
}

export const ViewContext = createContext<ViewContextValue | null>(null);

export function useViewBounds(): ViewBounds | null {
  const context = useContext(ViewContext);
  if (!context || !context.layoutReady) return null;
  return context.bounds;
}

interface ViewProps {
  children: ReactNode;
  backdrop?: boolean;
  style?: {
    flex?: number;
    flexDirection?: 'row' | 'column';
    width?: number | string;
    height?: number | string;
    padding?: number;
    gap?: number;
    position?: string;
    inset?: number;
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  };
}

export function View({ children, backdrop = false, style = {} }: ViewProps) {
  const parentContext = useContext(ViewContext);
  const [layoutReady, setLayoutReady] = useState(false);
  const nodeRef = useRef<Yoga.YogaNode>();

  console.log('[View] Rendering, backdrop:', backdrop, 'style:', style);

  // Create yoga node once
  if (!nodeRef.current) {
    nodeRef.current = Yoga.Node.create();
  }
  const node = nodeRef.current;

  // Apply styles to yoga node
  useEffect(() => {
    if (style.flex !== undefined) {
      node.setFlexGrow(style.flex);
    }

    if (style.flexDirection) {
      node.setFlexDirection(
        style.flexDirection === 'row' ? Yoga.FLEX_DIRECTION_ROW : Yoga.FLEX_DIRECTION_COLUMN
      );
    }

    if (style.alignItems) {
      const alignMap = {
        'flex-start': Yoga.ALIGN_FLEX_START,
        center: Yoga.ALIGN_CENTER,
        'flex-end': Yoga.ALIGN_FLEX_END,
        stretch: Yoga.ALIGN_STRETCH,
      };
      node.setAlignItems(alignMap[style.alignItems]);
    }

    if (style.justifyContent) {
      const justifyMap = {
        'flex-start': Yoga.JUSTIFY_FLEX_START,
        center: Yoga.JUSTIFY_CENTER,
        'flex-end': Yoga.JUSTIFY_FLEX_END,
        'space-between': Yoga.JUSTIFY_SPACE_BETWEEN,
        'space-around': Yoga.JUSTIFY_SPACE_AROUND,
      };
      node.setJustifyContent(justifyMap[style.justifyContent]);
    }

    if (style.width) {
      if (typeof style.width === 'number') {
        node.setWidth(style.width);
      } else if (style.width === '100%') {
        node.setWidthPercent(100);
      }
    }

    if (style.height) {
      if (typeof style.height === 'number') {
        node.setHeight(style.height);
      } else if (style.height === '100%') {
        node.setHeightPercent(100);
      } else if (style.height === 'auto') {
        node.setHeightAuto();
      }
    }

    if (style.padding) {
      node.setPadding(Yoga.EDGE_ALL, style.padding);
    }

    if (style.gap) {
      node.setGap(Yoga.GUTTER_ALL, style.gap);
    }

    // Add this node as child of parent
    if (parentContext) {
      const childCount = parentContext.node.getChildCount();
      parentContext.node.insertChild(node, childCount);
    }

    // Calculate layout (only for root nodes)
    if (!parentContext) {
      // Use the node's configured dimensions, not window dimensions
      const width =
        style.width && typeof style.width === 'number' ? style.width : window.innerWidth;
      const height =
        style.height && typeof style.height === 'number' ? style.height : window.innerHeight;
      node.calculateLayout(width, height, Yoga.DIRECTION_LTR);
    }

    // Mark layout as ready (schedule for next render to avoid cascading renders)
    queueMicrotask(() => setLayoutReady(true));

    return () => {
      if (parentContext) {
        parentContext.node.removeChild(node);
      }
    };
  }, [node, parentContext, style]);

  const bounds = useMemo((): ViewBounds | null => {
    if (!layoutReady) return null;

    const layout = node.getComputedLayout();

    let x = layout.left;
    let y = layout.top;

    // Add parent offset
    if (parentContext && parentContext.bounds) {
      x += parentContext.bounds.x;
      y += parentContext.bounds.y;
    }

    const computedBounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(layout.width),
      height: Math.round(layout.height),
    };

    console.log('[View] Computed bounds:', computedBounds, 'backdrop:', backdrop);

    return computedBounds;
  }, [layoutReady, node, parentContext, backdrop]);

  const contextValue: ViewContextValue = {
    node,
    bounds,
    layoutReady,
    backdrop,
  };

  return <ViewContext.Provider value={contextValue}>{children}</ViewContext.Provider>;
}
