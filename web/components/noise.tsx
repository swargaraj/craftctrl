"use client";
import React, {
  useRef,
  useId,
  useEffect,
  CSSProperties,
  useCallback,
} from "react";
import {
  animate,
  useMotionValue,
  AnimationPlaybackControls,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ResponsiveImage {
  src: string;
  alt?: string;
  srcSet?: string;
}
interface AnimationConfig {
  preview?: boolean;
  scale: number;
  speed: number;
}
interface NoiseConfig {
  opacity: number;
  scale: number;
}
export interface EtheralShadowProps {
  type?: "preset" | "custom";
  presetIndex?: number;
  customImage?: ResponsiveImage;
  sizing?: "fill" | "stretch";
  color?: string;
  animation?: AnimationConfig;
  noise?: NoiseConfig;
  style?: CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

const mapRange = (
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number
): number => {
  if (fromLow === fromHigh) return toLow;
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
};

const useInstanceId = (): string => {
  const id = useId();
  const cleanId = id.replace(/:/g, "");
  return `shadowoverlay-${cleanId}`;
};

const PRECALCULATED_VALUES = {
  displacement: {
    min: 20,
    max: 100,
  },
  duration: {
    min: 5000,
    max: 30000,
  },
  frequency: {
    x: { min: 0.001, max: 0.0005 },
    y: { min: 0.004, max: 0.002 },
  },
};

export function EtheralShadow({
  sizing = "fill",
  color = "rgba(96, 96, 96, 1)",
  animation,
  noise,
  style,
  className,
  children,
}: EtheralShadowProps) {
  const id = useInstanceId();

  const animationEnabled = animation && animation.scale > 0;

  const { displacementScale, animationDuration, baseFrequencies } =
    React.useMemo(() => {
      if (!animation) {
        return {
          displacementScale: 0,
          animationDuration: 1,
          baseFrequencies: { x: 0, y: 0 },
        };
      }

      return {
        displacementScale: mapRange(
          animation.scale,
          1,
          100,
          PRECALCULATED_VALUES.displacement.min,
          PRECALCULATED_VALUES.displacement.max
        ),
        animationDuration: mapRange(
          animation.speed,
          1,
          100,
          PRECALCULATED_VALUES.duration.max,
          PRECALCULATED_VALUES.duration.min
        ),
        baseFrequencies: {
          x: mapRange(
            animation.scale,
            0,
            100,
            PRECALCULATED_VALUES.frequency.x.min,
            PRECALCULATED_VALUES.frequency.x.max
          ),
          y: mapRange(
            animation.scale,
            0,
            100,
            PRECALCULATED_VALUES.frequency.y.min,
            PRECALCULATED_VALUES.frequency.y.max
          ),
        },
      };
    }, [animation?.scale, animation?.speed]);

  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
  const hueRotateMotionValue = useMotionValue(180);
  const hueRotateAnimation = useRef<AnimationPlaybackControls | null>(null);
  const rafId = useRef<number>(0);

  const updateAnimation = useCallback((value: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      if (feColorMatrixRef.current) {
        feColorMatrixRef.current.setAttribute("values", String(value));
      }
    });
  }, []);

  useEffect(() => {
    if (!animationEnabled || !feColorMatrixRef.current) return;

    let isMounted = true;

    const startAnimation = () => {
      if (!isMounted) return;

      if (hueRotateAnimation.current) {
        hueRotateAnimation.current.stop();
      }

      hueRotateMotionValue.set(0);

      hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
        duration: animationDuration / 1000,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
        onUpdate: updateAnimation,
      });
    };

    const timeoutId = setTimeout(startAnimation, 16);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      if (hueRotateAnimation.current) {
        hueRotateAnimation.current.stop();
      }
    };
  }, [
    animationEnabled,
    animationDuration,
    hueRotateMotionValue,
    updateAnimation,
  ]);

  const filterStyle = React.useMemo(
    () => (animationEnabled ? `url(#${id}) blur(4px)` : "none"),
    [animationEnabled, id]
  );

  const containerStyle = React.useMemo(
    () => ({
      position: "absolute" as const,
      inset: -displacementScale,
      filter: filterStyle,
      transform: "translateZ(0)",
      backfaceVisibility: "hidden" as const,
      perspective: 1000,
      height: "100svh",
      willChange: animationEnabled ? "filter" : "auto",
    }),
    [displacementScale, filterStyle, animationEnabled]
  );

  const maskStyle = React.useMemo(
    () => ({
      backgroundColor: color,
      maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
      maskSize: sizing === "stretch" ? "100% 100%" : "cover",
      maskRepeat: "no-repeat" as const,
      maskPosition: "center" as const,
      width: "100%",
      height: "110svh",
      transform: "translateZ(0)",
      backfaceVisibility: "hidden" as const,
    }),
    [color, sizing]
  );

  const noiseStyle = React.useMemo(
    () =>
      noise && noise.opacity > 0
        ? {
            position: "absolute" as const,
            inset: 0,
            backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: "repeat" as const,
            opacity: noise.opacity / 2,
            pointerEvents: "none" as const,
            transform: "translateZ(0)",
          }
        : null,
    [noise?.opacity, noise?.scale]
  );

  return (
    <div
      className={cn("relative overflow-x-hidden w-full min-h-svh", className)}
      style={{
        ...style,
        transform: "translateZ(0)",
        isolation: "isolate",
      }}
    >
      <div style={containerStyle}>
        {animationEnabled && (
          <svg style={{ position: "absolute", pointerEvents: "none" }}>
            <defs>
              <filter id={id}>
                <feTurbulence
                  result="undulation"
                  numOctaves="2"
                  baseFrequency={`${baseFrequencies.x},${baseFrequencies.y}`}
                  seed="0"
                  type="turbulence"
                />
                <feColorMatrix
                  ref={feColorMatrixRef}
                  in="undulation"
                  type="hueRotate"
                  values="180"
                />
                <feColorMatrix
                  in="dist"
                  result="circulation"
                  type="matrix"
                  values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="circulation"
                  scale={displacementScale}
                  result="dist"
                />
                <feDisplacementMap
                  in="dist"
                  in2="undulation"
                  scale={displacementScale}
                  result="output"
                />
              </filter>
            </defs>
          </svg>
        )}
        <div style={maskStyle} />
      </div>

      {children && (
        <div className="absolute w-full text-center z-10">
          {children}
        </div>
      )}

      {noiseStyle && <div style={noiseStyle} />}
    </div>
  );
}
