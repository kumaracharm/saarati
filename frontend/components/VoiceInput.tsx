"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

function getSpeechConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const speechWindow = window as Window & SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const { lang } = useLanguage();
  // null until mounted, so server and first client render match.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SpeechRecognition exists only in the browser; detecting it on mount keeps SSR/hydration matching (null until mounted).
    setSupported(getSpeechConstructor() !== null);
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition !== null) {
        try {
          recognition.abort();
        } catch {
          // Already stopped; nothing to clean up.
        }
      }
    };
  }, []);

  function handleSpeak() {
    if (recognitionRef.current !== null) {
      return;
    }
    const Constructor = getSpeechConstructor();
    if (Constructor === null) {
      setSupported(false);
      return;
    }

    setError(null);
    const recognition = new Constructor();
    recognition.lang = lang === "kn" ? "kn-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const first = event.results.length > 0 ? event.results[0][0] : undefined;
      if (first !== undefined) {
        onTranscript(first.transcript);
      }
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setListening(false);
      if (event.error === "aborted") {
        return;
      }
      // Kannada text: review by a Kannada speaker before release.
      setError(
        lang === "kn"
          ? "ಮೈಕ್ರೋಫೋನ್ ಲಭ್ಯವಿಲ್ಲ. ಬದಲಿಗೆ ಟೈಪ್ ಮಾಡಿ."
          : "Microphone not available. Type instead.",
      );
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      // Kannada text: review by a Kannada speaker before release.
      setError(
        lang === "kn"
          ? "ಮೈಕ್ರೋಫೋನ್ ಲಭ್ಯವಿಲ್ಲ. ಬದಲಿಗೆ ಟೈಪ್ ಮಾಡಿ."
          : "Microphone not available. Type instead.",
      );
    }
  }

  function handleStop() {
    const recognition = recognitionRef.current;
    if (recognition === null) {
      return;
    }
    try {
      recognition.stop();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }

  if (supported === null) {
    return null;
  }

  if (!supported) {
    return (
      <p role="note" className="text-sm text-[var(--muted)]">
        Voice not available in this browser — type your situation below / ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ — ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ
      </p>
    );
  }

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSpeak}
          disabled={disabled || listening}
          aria-pressed={listening}
          className={buttonClass}
        >
          Speak / ಮಾತನಾಡಿ
        </button>
        <button
          type="button"
          onClick={handleStop}
          disabled={disabled || !listening}
          className={buttonClass}
        >
          Stop / ನಿಲ್ಲಿಸಿ
        </button>
      </div>
      {listening ? (
        <p role="status" className="text-sm text-[var(--muted)]">
          Listening… / ಆಲಿಸಲಾಗುತ್ತಿದೆ…
        </p>
      ) : null}
      <div aria-live="polite" className="text-sm text-red-700">
        {error ?? ""}
      </div>
    </div>
  );
}
