"use client";
import React from "react";

const backgroundImage = "/Background.png";

export function BackgroundLayer() {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden">
      <img
        src={backgroundImage}
        alt="Background"
        className="w-full h-full object-cover"
        style={{ objectPosition: "center bottom" }}
      />
      <div
        className="absolute inset-0 transition-colors duration-300 ease-in-out"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.10) 45%, transparent 100%)"
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-black/0 dark:bg-black/40 transition-colors duration-300 ease-in-out"
      />
    </div>
  );
}
