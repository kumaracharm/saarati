'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { answerFor, type Intent, type Topic } from '../lib/intents';
import { isSpeechInputSupported, listenOnce, speak } from '../lib/voice';
import { safeOfficialLinks } from '../lib/verification';
import { generateFullCatalogue } from '../lib/schemeCatalogue';
import type { Scheme } from '../lib/schemeTypes';

type Lang = 'en' | 'kn';

export interface ProfileHint {
  field: string;
  value: string;
}

export interface SaarthiAssistantProps {
  onProfileHint?: (hint: ProfileHint) => void;
}

const noopSubscribe = (): (() => void) => () => undefined;

function findKannadaVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === 'kn-in') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('kn')) ??
    null
  );
}

function subscribeVoices(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => undefined;
  }
  const synth = window.speechSynthesis;
  synth.addEventListener('voiceschanged', onChange);
  return () => synth.removeEventListener('voiceschanged', onChange);
}

const SENSITIVE_DIGITS_RE = /\d(?:[\s-]?\d){3,}/;
const SENSITIVE_WORDS_RE =
  /aadhaar|aadhar|otp|\bpin\b|password|account number|ifsc|upi|ಆಧಾರ್|ಒಟಿಪಿ|ಖಾತೆ/i;

function isSensitive(text: string): boolean {
  return SENSITIVE_DIGITS_RE.test(text) || SENSITIVE_WORDS_RE.test(text);
}

const SAMPLE_QUERY: Record<Lang, string> = {
  en: 'farmer scheme documents',
  kn: 'ರೈತ ಯೋಜನೆ ದಾಖಲೆಗಳು',
};

const SAFE_ACTION_CHIPS: { label: string; hint: ProfileHint; topic: string }[] = [
  { label: '🌾 Farmer profile', hint: { field: 'occupation', value: 'farmer' }, topic: 'farmer' },
  { label: '🎓 Student / 70%+', hint: { field: 'marks_percent', value: '75' }, topic: 'education' },
  { label: '🏠 Hostel resident', hint: { field: 'is_hostel_resident', value: 'true' }, topic: 'housing' },
  { label: '💼 Income ₹2.5 Lakh', hint: { field: 'annual_family_income_inr', value: '250000' }, topic: 'income' },
];

const UI: Record<
  Lang,
  {
    title: string;
    open: string;
    close: string;
    privacy: string;
    placeholder: string;
    submit: string;
    voice: string;
    listening: string;
    sample: string;
    readAloud: string;
    languageLabel: string;
    voiceUnsupported: string;
    voicePermission: string;
    voiceError: string;
    notice: string;
    none: string;
    documents: string;
    portal: string;
    checkPortal: string;
    knVoiceMissing: string;
    hint: string;
    appliedChip: string;
  }
> = {
  en: {
    title: 'Saarthi Assistant',
    open: 'Open Saarthi assistant',
    close: 'Close',
    privacy:
      'The assistant never asks for Aadhaar, OTP, bank, card, UPI or PIN details.',
    placeholder: 'Ask in English or ಕನ್ನಡ (e.g. farmer, housing, education)',
    submit: 'Ask',
    voice: 'Voice Input',
    listening: 'Listening…',
    sample: 'One-click sample query',
    readAloud: 'Read aloud',
    languageLabel: 'Response language',
    voiceUnsupported:
      'Web Speech API voice input is not available in this browser. Use the sample query instead.',
    voicePermission:
      'Microphone permission was denied. Allow microphone access or use the sample query.',
    voiceError:
      'Voice input failed. Please try again or use the sample query.',
    notice:
      'For your safety, please do not share Aadhaar, OTP, bank, card, UPI, PIN or password details here. Verify and complete applications only on official government portals.',
    none: 'No matching scheme found. Try topics like farmer, health, housing, scholarship or loan.',
    documents: 'Documents usually needed',
    portal: 'Official portal',
    checkPortal: 'Check official portal',
    knVoiceMissing:
      'Kannada (kn-IN) voice is not detected on this browser/OS. Output displayed as text.',
    hint: 'Profile suggestion',
    appliedChip: 'Applied to profile state',
  },
  kn: {
    title: 'ಸಾರಥಿ ಸಹಾಯಕ',
    open: 'ಸಾರಥಿ ಸಹಾಯಕವನ್ನು ತೆರೆಯಿರಿ',
    close: 'ಮುಚ್ಚಿ',
    privacy:
      'ಸಹಾಯಕ ಎಂದಿಗೂ ಆಧಾರ್, ಒಟಿಪಿ, ಬ್ಯಾಂಕ್ ವಿವರ ಅಥವಾ ಪಿನ್ ಸಂಖ್ಯೆಗಳನ್ನು ಕೇಳುವುದಿಲ್ಲ.',
    placeholder: 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಕೇಳಿ (ಉದಾ: ರೈತ, ಮನೆ, ಶಿಕ್ಷಣ)',
    submit: 'ಕೇಳಿ',
    voice: 'ಧ್ವನಿ ಇನ್‌ಪುಟ್',
    listening: 'ಆಲಿಸಲಾಗುತ್ತಿದೆ…',
    sample: 'ಮಾದರಿ ಧ್ವನಿ ಪ್ರಶ್ನೆ',
    readAloud: 'ಗಟ್ಟಿಯಾಗಿ ಓದಿ',
    languageLabel: 'ಉತ್ತರದ ಭಾಷೆ',
    voiceUnsupported:
      'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಲಭ್ಯವಿಲ್ಲ. ಬದಲಿಗೆ ಮಾದರಿ ಪ್ರಶ್ನೆ ಬಳಸಿ.',
    voicePermission:
      'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿಸಿ ಅಥವಾ ಮಾದರಿ ಪ್ರಶ್ನೆ ಬಳಸಿ.',
    voiceError:
      'ಧ್ವನಿ ಇನ್‌ಪುಟ್ ವಿಫಲವಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಮಾದರಿ ಪ್ರಶ್ನೆ ಬಳಸಿ.',
    notice:
      'ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ಆಧಾರ್, ಒಟಿಪಿ, ಬ್ಯಾಂಕ್ ಅಥವಾ ಪಿನ್ ವಿವರಗಳನ್ನು ಇಲ್ಲಿ ನಮೂದಿಸಬೇಡಿ. ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳಲ್ಲಿ ಮಾತ್ರ ಹಂತಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.',
    none: 'ಯಾವುದೇ ಯೋಜನೆ ಕಂಡುಬಂದಿಲ್ಲ. ರೈತ, ಆರೋಗ್ಯ, ಮನೆ, ಸ್ಕಾಲರ್‌ಶಿಪ್ ಅಥವಾ ಸಾಲ ಮುಂತಾದ ಪದಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ.',
    documents: 'ಬೇಕಾಗುವ ದಾಖಲೆಗಳು',
    portal: 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್',
    hint: 'ಪ್ರೊಫೈಲ್ ಸಲಹೆ',
    checkPortal: 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ',
    knVoiceMissing:
      'ಕನ್ನಡ (kn-IN) ಧ್ವನಿ ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ. ಪಠ್ಯದ ಮೂಲಕ ಉತ್ತರ ತೋರಿಸಲಾಗಿದೆ.',
    appliedChip: 'ಪ್ರೊಫೈಲ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ',
  },
};

interface AssistantResult {
  kind: 'notice' | 'answer';
  intents: Intent[];
  topics: Topic[];
  matches: Scheme[];
  lines: { en: string; kn: string }[];
  links: { label: string; url: string }[];
}

export default function SaarthiAssistant({
  onProfileHint,
}: SaarthiAssistantProps = {}) {
  const [open, setOpen] = useState(false);
  const [uiLang, setUiLang] = useState<Lang>('en');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [readAloud, setReadAloud] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const stopListenRef = useRef<(() => void) | null>(null);

  const fullCatalogue = useRef(generateFullCatalogue());

  const speechSupported = useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    () => false,
  );

  const kannadaVoiceAvailable = useSyncExternalStore(
    subscribeVoices,
    () => findKannadaVoice() !== null,
    () => true,
  );

  const t = UI[uiLang];

  const handleQuery = useCallback(
    (raw: string) => {
      const text = raw.trim();
      setQuery('');
      setAppliedNotice(null);
      if (!text) return;

      if (isSensitive(text)) {
        setResult({
          kind: 'notice',
          intents: [],
          topics: [],
          matches: [],
          lines: [{ en: UI.en.notice, kn: UI.kn.notice }],
          links: [],
        });
        return;
      }

      const ans = answerFor(text, fullCatalogue.current);

      const allLinks: { label: string; url: string }[] = [];
      ans.matches.forEach((s) => {
        allLinks.push(...safeOfficialLinks(s));
      });

      setResult({
        kind: 'answer',
        intents: ans.intents,
        topics: ans.topics,
        matches: ans.matches,
        lines: ans.lines,
        links: allLinks,
      });

      if (onProfileHint && ans.topics.length > 0) {
        const top = ans.topics[0];
        if (top === 'farmer') onProfileHint({ field: 'occupation', value: 'farmer' });
        else if (top === 'education') onProfileHint({ field: 'education_level', value: 'student' });
        else if (top === 'housing') onProfileHint({ field: 'is_hostel_resident', value: 'true' });
      }
    },
    [onProfileHint],
  );

  const handleQueryRef = useRef(handleQuery);
  useEffect(() => {
    handleQueryRef.current = handleQuery;
  }, [handleQuery]);

  useEffect(() => {
    return () => {
      stopListenRef.current?.();
      stopListenRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!readAloud || !result || !speechSupported) return;
    if (result.kind === 'notice') {
      speak(UI[uiLang].notice, uiLang);
      return;
    }

    const textToSpeak = result.lines
      .map((l) => (uiLang === 'kn' ? l.kn : l.en))
      .slice(0, 3)
      .join('. ');

    if (!textToSpeak) return;

    if (uiLang === 'kn' && !findKannadaVoice()) {
      return;
    }

    speak(textToSpeak, uiLang);

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [result, readAloud, uiLang, speechSupported]);

  const startVoice = () => {
    if (!isSpeechInputSupported()) {
      setVoiceMessage(t.voiceUnsupported);
      return;
    }
    stopListenRef.current?.();
    setVoiceMessage(null);
    setListening(true);

    const stop = listenOnce(
      uiLang,
      (transcript) => {
        setListening(false);
        setVoiceMessage(null);
        if (transcript) handleQueryRef.current(transcript);
      },
      (reason) => {
        setListening(false);
        if (reason === 'unsupported') setVoiceMessage(t.voiceUnsupported);
        else if (reason === 'no_speech') setVoiceMessage(null);
        else setVoiceMessage(t.voiceError);
      },
    );
    stopListenRef.current = stop;
  };

  function applyActionChip(chip: (typeof SAFE_ACTION_CHIPS)[0]) {
    if (onProfileHint) {
      onProfileHint(chip.hint);
      setAppliedNotice(`${chip.label}: ${t.appliedChip}`);
    }
    handleQuery(chip.topic);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <section
          id="saarthi-panel"
          aria-label={t.title}
          className="flex max-h-[75vh] w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm text-[#111827] shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
            <h2 className="text-base font-bold text-gray-900">{t.title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="rounded-md px-2 py-1 text-xs font-semibold text-[#7f1d1d] underline hover:text-[#881337]"
            >
              {t.close}
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-tight">{t.privacy}</p>

          {/* One-Click Safe Action Chips */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              One-Click Safe Profile &amp; Query Chips:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAFE_ACTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => applyActionChip(chip)}
                  className="rounded-full border border-stone-300 bg-white px-2.5 py-0.5 text-xs text-gray-800 hover:border-[#7f1d1d] hover:bg-rose-50/50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {appliedNotice && (
              <p className="text-[11px] text-[#7f1d1d] font-semibold">✓ {appliedNotice}</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuery(query);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.placeholder}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-[#111827] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7f1d1d]"
            />
            <button
              type="submit"
              className="rounded-md bg-[#7f1d1d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#881337]"
            >
              {t.submit}
            </button>
          </form>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={startVoice}
              disabled={listening}
              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-gray-800 hover:border-[#7f1d1d] disabled:opacity-50"
            >
              {listening ? t.listening : `🎤 ${t.voice}`}
            </button>
            <button
              type="button"
              onClick={() => handleQuery(SAMPLE_QUERY[uiLang])}
              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-gray-800 hover:border-[#7f1d1d]"
            >
              ⚡ {t.sample}
            </button>
            {speechSupported && (
              <button
                type="button"
                aria-pressed={readAloud}
                onClick={() => setReadAloud((v) => !v)}
                className={`rounded-md border px-2.5 py-1 ${
                  readAloud
                    ? 'border-[#7f1d1d] bg-rose-50 text-[#7f1d1d] font-semibold'
                    : 'border-stone-300 bg-white text-gray-800'
                }`}
              >
                🔊 {t.readAloud}: {readAloud ? 'On' : 'Off'}
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label={t.languageLabel}
            className="flex gap-2 text-xs"
          >
            {(['en', 'kn'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={uiLang === l}
                onClick={() => setUiLang(l)}
                className={`rounded-full px-3 py-0.5 font-medium ${
                  uiLang === l
                    ? 'bg-[#7f1d1d] text-white shadow-xs'
                    : 'border border-stone-300 bg-white text-gray-700'
                }`}
              >
                {l === 'en' ? 'EN' : 'ಕನ್ನಡ'}
              </button>
            ))}
          </div>

          {voiceMessage && (
            <p role="status" className="rounded bg-stone-50 p-1.5 text-xs text-stone-700">
              {voiceMessage}
            </p>
          )}

          {readAloud && speechSupported && uiLang === 'kn' && !kannadaVoiceAvailable && (
            <p role="status" className="rounded-md border border-stone-200 bg-stone-50 p-2 text-xs text-[#881337]">
              {t.knVoiceMissing}
            </p>
          )}

          {result && result.kind === 'notice' && (
            <div role="alert" className="rounded-md border border-[#7f1d1d] bg-rose-50 p-2.5 text-xs text-[#7f1d1d] font-medium leading-relaxed">
              {uiLang === 'kn' ? result.lines[0]?.kn : result.lines[0]?.en}
            </div>
          )}

          {result && result.kind === 'answer' && (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-col gap-2">
                {result.lines.map((line, idx) => (
                  <li
                    key={idx}
                    className="rounded-md border border-stone-200 bg-white p-2.5 text-xs text-gray-800 shadow-2xs"
                  >
                    {uiLang === 'kn' ? line.kn : line.en}
                  </li>
                ))}
              </ul>

              {result.links.length > 0 && (
                <div className="rounded-md border border-stone-100 bg-stone-50 p-2 text-xs">
                  <span className="font-semibold text-gray-800">Official Portal Links:</span>
                  <ul className="mt-1 space-y-1">
                    {result.links.slice(0, 3).map((link, idx) => (
                      <li key={idx}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7f1d1d] underline hover:text-[#881337] break-all"
                        >
                          {link.label}: {link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="saarthi-panel"
        aria-label={t.open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-[#7f1d1d] px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#881337] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7f1d1d] focus-visible:ring-offset-2"
      >
        💬 {t.title}
      </button>
    </div>
  );
}
