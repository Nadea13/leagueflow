"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    className?: string;
    autoFocus?: boolean;
}

export function OtpInput({
    value = "",
    onChange,
    length = 6,
    disabled = false,
    className,
    autoFocus = true,
}: OtpInputProps) {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Ensure array of values matching length
    const digits = React.useMemo(() => {
        const chars = value.split("").slice(0, length);
        while (chars.length < length) {
            chars.push("");
        }
        return chars;
    }, [value, length]);

    React.useEffect(() => {
        if (autoFocus && inputRefs.current[0] && !disabled) {
            inputRefs.current[0].focus();
        }
    }, [autoFocus, disabled]);

    const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Keep only digits
        const numericVal = val.replace(/\D/g, "");

        if (!numericVal) {
            const newDigits = [...digits];
            newDigits[index] = "";
            onChange(newDigits.join(""));
            return;
        }

        // If multiple digits pasted or typed (e.g. from autocomplete)
        if (numericVal.length > 1) {
            const pastedDigits = numericVal.slice(0, length).split("");
            const newDigits = [...digits];
            for (let i = 0; i < length; i++) {
                if (i >= index && pastedDigits[i - index] !== undefined) {
                    newDigits[i] = pastedDigits[i - index];
                }
            }
            const nextVal = newDigits.join("");
            onChange(nextVal);

            // Focus next empty or last input
            const nextFocusIndex = Math.min(index + numericVal.length, length - 1);
            inputRefs.current[nextFocusIndex]?.focus();
            return;
        }

        // Single digit entered
        const newDigits = [...digits];
        newDigits[index] = numericVal.charAt(numericVal.length - 1);
        onChange(newDigits.join(""));

        // Move to next input
        if (index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (!digits[index] && index > 0) {
                // If current input is empty, focus and clear previous
                inputRefs.current[index - 1]?.focus();
                const newDigits = [...digits];
                newDigits[index - 1] = "";
                onChange(newDigits.join(""));
            } else {
                const newDigits = [...digits];
                newDigits[index] = "";
                onChange(newDigits.join(""));
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < length - 1) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "");
        if (!pastedData) return;

        const pastedChars = pastedData.slice(0, length).split("");
        const newDigits = [...digits];
        for (let i = 0; i < length; i++) {
            if (pastedChars[i] !== undefined) {
                newDigits[i] = pastedChars[i];
            }
        }
        onChange(newDigits.join(""));
        const focusIdx = Math.min(pastedChars.length, length - 1);
        inputRefs.current[focusIdx]?.focus();
    };

    return (
        <div className={cn("flex items-center justify-center gap-1 sm:gap-2", className)}>
            {Array.from({ length }).map((_, idx) => (
                <input
                    key={idx}
                    ref={(el) => {
                        inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d*"
                    maxLength={length}
                    value={digits[idx] || ""}
                    disabled={disabled}
                    onChange={(e) => handleInputChange(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className={cn(
                        "w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-sm border border-input text-foreground shadow-sm transition-all outline-none",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        digits[idx] ? "border-primary/50 bg-primary/10" : ""
                    )}
                />
            ))}
        </div>
    );
}
