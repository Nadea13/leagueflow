"use client";

import React from "react";
import { BroadcastEditor } from "@/features/broadcast";

export default function OverlayPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <BroadcastEditor active={true} standalone={true} />
    </div>
  );
}
