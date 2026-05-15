/**
 * Shared brand components for splash + login header
 * – ShoppingPattern: teal-on-teal icon grid
 * – AtomLogo: "atom." in bold rounded style + dot
 */
import { Dimensions } from "react-native";
import Svg, {
  Rect, Circle, Line, Path, G, Text as SvgText,
} from "react-native-svg";

const { width: SW } = Dimensions.get("window");

const TEAL = "#2BBFB3";
const ICON_ALPHA = 0.18; // how visible the pattern icons are

// One "shopping bag" icon drawn as SVG path at position x,y with size s
function Bag({ x, y, s = 16 }: { x: number; y: number; s?: number }) {
  return (
    <G opacity={ICON_ALPHA}>
      {/* bag body */}
      <Rect x={x} y={y + s * 0.3} width={s} height={s * 0.7} rx={s * 0.1}
        stroke="white" strokeWidth={1.2} fill="none" />
      {/* handle */}
      <Path
        d={`M${x + s * 0.25},${y + s * 0.3} Q${x + s * 0.25},${y} ${x + s * 0.5},${y} Q${x + s * 0.75},${y} ${x + s * 0.75},${y + s * 0.3}`}
        stroke="white" strokeWidth={1.2} fill="none"
      />
    </G>
  );
}

// Tag icon
function Tag({ x, y, s = 14 }: { x: number; y: number; s?: number }) {
  return (
    <G opacity={ICON_ALPHA}>
      <Rect x={x} y={y} width={s} height={s * 0.8} rx={s * 0.15}
        stroke="white" strokeWidth={1.2} fill="none" />
      <Circle cx={x + s * 0.8} cy={y + s * 0.15} r={s * 0.12} fill="white" />
    </G>
  );
}

// Percent circle
function Pct({ x, y, s = 14 }: { x: number; y: number; s?: number }) {
  return (
    <G opacity={ICON_ALPHA}>
      <Circle cx={x + s / 2} cy={y + s / 2} r={s / 2}
        stroke="white" strokeWidth={1.2} fill="none" />
      <Line x1={x + s * 0.25} y1={y + s * 0.75} x2={x + s * 0.75} y2={y + s * 0.25}
        stroke="white" strokeWidth={1} />
      <Circle cx={x + s * 0.3} cy={y + s * 0.3} r={s * 0.1} fill="white" />
      <Circle cx={x + s * 0.7} cy={y + s * 0.7} r={s * 0.1} fill="white" />
    </G>
  );
}

// Receipt
function Receipt({ x, y, s = 14 }: { x: number; y: number; s?: number }) {
  return (
    <G opacity={ICON_ALPHA}>
      <Rect x={x} y={y} width={s} height={s * 1.2} rx={s * 0.1}
        stroke="white" strokeWidth={1.2} fill="none" />
      <Line x1={x + s * 0.2} y1={y + s * 0.35} x2={x + s * 0.8} y2={y + s * 0.35}
        stroke="white" strokeWidth={1} />
      <Line x1={x + s * 0.2} y1={y + s * 0.6} x2={x + s * 0.8} y2={y + s * 0.6}
        stroke="white" strokeWidth={1} />
      <Line x1={x + s * 0.2} y1={y + s * 0.85} x2={x + s * 0.6} y2={y + s * 0.85}
        stroke="white" strokeWidth={1} />
    </G>
  );
}

// Cart
function Cart({ x, y, s = 16 }: { x: number; y: number; s?: number }) {
  return (
    <G opacity={ICON_ALPHA}>
      <Path
        d={`M${x},${y} L${x + s * 0.2},${y} L${x + s * 0.5},${y + s * 0.55} L${x + s * 0.9},${y + s * 0.55} L${x + s},${y + s * 0.2} L${x + s * 0.25},${y + s * 0.2}`}
        stroke="white" strokeWidth={1.2} fill="none" strokeLinejoin="round"
      />
      <Circle cx={x + s * 0.45} cy={y + s * 0.75} r={s * 0.1} fill="white" />
      <Circle cx={x + s * 0.8} cy={y + s * 0.75} r={s * 0.1} fill="white" />
    </G>
  );
}

// "SALE" badge
function Sale({ x, y, s = 14 }: { x: number; y: number; s?: number }) {
  return (
    <G opacity={ICON_ALPHA}>
      <Rect x={x} y={y} width={s} height={s * 0.65} rx={s * 0.12}
        stroke="white" strokeWidth={1.2} fill="none" />
      <SvgText x={x + s * 0.5} y={y + s * 0.48} fontSize={s * 0.38}
        fill="white" textAnchor="middle" fontWeight="bold">
        SALE
      </SvgText>
    </G>
  );
}

// Generates a repeating grid of icons across given width/height
export function ShoppingPattern({ w, h }: { w: number; h: number }) {
  const icons: React.ReactNode[] = [];
  const cols = Math.ceil(w / 52);
  const rows = Math.ceil(h / 52);
  const types = [Bag, Tag, Pct, Receipt, Cart, Sale];

  let key = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const Comp = types[(row * cols + col) % types.length];
      const xOff = col % 2 === 0 ? 0 : 22;
      const x = col * 52 - 4 + xOff;
      const y = row * 52 - 4;
      icons.push(<Comp key={key++} x={x} y={y} />);
    }
  }

  return (
    <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
      {icons}
    </Svg>
  );
}

// The "atom." wordmark — lowercase bold with a large dot
export function AtomWordmark({ size = 72, color = "white" }: { size?: number; color?: string }) {
  const dotR = size * 0.13;
  const textWidth = size * 2.8;
  const h = size * 1.25;
  // text baseline
  const baseline = h * 0.82;

  return (
    <Svg width={textWidth} height={h}>
      {/* "atom" text — centered, leaving room for dot on right */}
      <SvgText
        x={textWidth * 0.38}
        y={baseline}
        fontSize={size}
        fontWeight="900"
        fill={color}
        textAnchor="middle"
        letterSpacing={size * 0.01}
      >
        atom
      </SvgText>
      {/* Bold dot after "m" */}
      <Circle
        cx={textWidth * 0.38 + size * 1.08}
        cy={baseline - dotR * 1.1}
        r={dotR}
        fill={color}
      />
    </Svg>
  );
}
