// Browser speech input/output helpers. Uses window APIs only, no dependencies; safe to import on the server.
import { speechLang } from "./intents";

type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionErrorEvent = { error?: string };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis ?? null;
}

/** True when the browser exposes SpeechRecognition (or the webkit-prefixed version). */
export function isSpeechInputSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/**
 * Listens for a single utterance. Calls onResult with the transcript, or onError with a reason.
 * Returns a stop function; on unsupported browsers it reports "unsupported" and returns a no-op.
 */
export function listenOnce(
  lang: "en" | "kn",
  onResult: (text: string) => void,
  onError: (reason: "unsupported" | "error" | "no_speech") => void,
): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError("unsupported");
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = speechLang(lang);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let finished = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
    finished = true;
    if (transcript) onResult(transcript);
    else onError("no_speech");
  };
  recognition.onerror = (event) => {
    finished = true;
    onError(event.error === "no-speech" ? "no_speech" : "error");
  };
  recognition.onend = () => {
    if (!finished) onError("no_speech");
  };

  try {
    recognition.start();
  } catch {
    onError("error");
    return () => {};
  }

  return () => {
    try {
      recognition.stop();
    } catch {
      // Already stopped; nothing to do.
    }
  };
}

/**
 * Speaks text in the given language. Cancels any previous utterance.
 * Returns false when speech synthesis is unavailable, so the caller can show the text instead.
 */
export function speak(text: string, lang: "en" | "kn"): boolean {
  const synth = getSynth();
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;

  const tag = speechLang(lang);
  const prefix = tag.split("-")[0];
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = tag;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
  return true;
}

/** Short hint shown when voice input or output is unavailable. */
export function typedFallbackHint(lang: "en" | "kn"): string {
  return lang === "kn"
    ? "ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ."
    : "Voice is unavailable. Type your question instead.";
}
