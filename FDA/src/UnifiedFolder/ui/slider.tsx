"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

// Define the variants
type SliderVariant = "default" | "receiver" | "volunteer";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  variant = "default",
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  variant?: SliderVariant;
}) {
  // FIX: Use state to track internal value and avoid pointer capture issues
  const [internalValue, setInternalValue] = React.useState<number[]>(
    Array.isArray(value) && value.length > 0 ? value : 
    Array.isArray(defaultValue) && defaultValue.length > 0 ? defaultValue : 
    [min]
  );

  // Update internal value when prop changes
  React.useEffect(() => {
    if (Array.isArray(value) && value.length > 0) {
      setInternalValue(value);
    }
  }, [value]);

  const getVariantColors = () => {
    switch (variant) {
      case "receiver":
        return {
          track: "bg-orange-200",
          range: "bg-orange-500", 
          thumb: "border-orange-500 bg-orange-500 focus:ring-orange-200",
        };
      case "volunteer":
        return {
          track: "bg-green-200",
          range: "bg-green-500",
          thumb: "border-green-500 bg-green-500 focus:ring-green-200",
        };
      default:
        return {
          track: "bg-gray-200",
          range: "bg-blue-500",
          thumb: "border-blue-500 bg-blue-500 focus:ring-blue-200",
        };
    }
  };

  const colors = getVariantColors();

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={internalValue}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      onValueChange={(newValue) => {
        setInternalValue(newValue);
        props.onValueChange?.(newValue);
      }}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
          colors.track
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn("absolute h-full rounded-full", colors.range)}
        />
      </SliderPrimitive.Track>
      {internalValue.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "block h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-lg",
            "transition-all duration-200 focus-visible:outline-none focus-visible:ring-4",
            "disabled:pointer-events-none disabled:opacity-50",
            colors.thumb
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };