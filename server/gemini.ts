import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI, Type } from '@google/genai';
import type { Concept, FeynmanGradeResult, MasteryScore, StateOfMindBriefing } from '../src/types.js';

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: () => T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`Gemini call timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallback());
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

export function cleanRawStudyInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/^\[?(voice memo|transcription|voice recording|audio recording|audio memo|speech-to-text|pasted notes & code)\]?:?\s*/gim, '')
    .replace(/^(voice memo|voice recording|audio recording|audio memo|transcription|speech recording)(\s*(memo|recording|transcription))?:?\s*/gim, '')
    .replace(/^voice memo transcribed:?\s*"?/gim, '')
    .replace(/^transcribed audio (note|recording)( from study session)?\.?:?\s*/gim, '')
    .replace(/^(i was reading about|reading notes on|studying|notes on)\s+/gim, '')
    .trim();
}

export async function transcribeAudio(base64Data: string, mimeType: string = 'audio/webm'): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return 'I was debugging the connection pool exhaustion in our Postgres cluster. I realized we did not set max lifetime on idle connections, so stale TCP sockets were lingering. Next step is tuning the pool size to match max_connections.';
  }

  return withTimeout(
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: base64Data,
              },
            },
            {
              text: 'Transcribe this audio recording accurately. Return only the verbatim spoken subject matter words without any commentary, prefixes, labels, or timestamps.',
            },
          ],
        });

        const raw = (response.text ?? '').trim();
        return cleanRawStudyInput(raw);
      } catch (err) {
        console.error('Audio transcription error:', err);
        return '';
      }
    })(),
    12000,
    () => ''
  );
}

export interface AIExtractionResult {
  session_summary: string;
  concepts_to_merge_or_create: Array<{
    existing_concept_id?: string | null;
    title: string;
    summary: string;
    raw_notes_to_append: string;
    mastery_score: MasteryScore;
    last_friction_point: string;
    suggested_next_step: string;
    tags: string[];
  }>;
  relationships: Array<{
    source_title_or_id: string;
    target_title_or_id: string;
    relationship_type: 'prerequisite_of' | 'part_of' | 'related_to' | 'derived_from';
    label: string;
  }>;
}

export async function extractAndMergeConcepts(
  rawInput: string,
  existingConcepts: Concept[]
): Promise<AIExtractionResult> {
  const cleanedInput = cleanRawStudyInput(rawInput);

  const createFallback = (): AIExtractionResult => {
    const firstSentence = cleanedInput.split(/[.\n]/)[0] || '';
    const cleanWords = firstSentence.replace(/[^a-zA-Z0-9 -]/g, ' ').trim();
    const words = cleanWords.split(/\s+/).slice(0, 5).join(' ');
    const title = words.length >= 3 ? words.charAt(0).toUpperCase() + words.slice(1) : 'Distributed Architecture Topic';

    // Check if matches existing concept
    const existingMatch = existingConcepts.find(
      (c) => c.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(c.title.toLowerCase())
    );

    if (existingMatch) {
      return {
        session_summary: `Synthesized continuous study update on "${existingMatch.title}". Auto-merged notes and updated friction point.`,
        concepts_to_merge_or_create: [
          {
            existing_concept_id: existingMatch.id,
            title: existingMatch.title,
            summary: existingMatch.summary,
            raw_notes_to_append: cleanedInput,
            mastery_score: Math.min(5, existingMatch.mastery_score + 1) as MasteryScore,
            last_friction_point: 'Synthesizing edge case behaviors under failure conditions.',
            suggested_next_step: 'Conduct a quick Feynman warm-up explanation.',
            tags: existingMatch.tags || ['engineering']
          }
        ],
        relationships: []
      };
    }

    return {
      session_summary: `Processed study notes on "${title}". Extracted macro-architecture principles and learning targets.`,
      concepts_to_merge_or_create: [
        {
          existing_concept_id: null,
          title: title,
          summary: `System overview and operational principles of ${title}. Addresses design tradeoffs, concurrency, and reliability invariants.`,
          raw_notes_to_append: cleanedInput,
          mastery_score: 2,
          last_friction_point: 'Synthesizing edge case behaviors and boundary conditions under failure.',
          suggested_next_step: 'Conduct a quick Feynman warm-up explanation and diagram component lifecycle.',
          tags: ['engineering', 'systems-design']
        }
      ],
      relationships: existingConcepts.length > 0 ? [
        {
          source_title_or_id: existingConcepts[0].id,
          target_title_or_id: title,
          relationship_type: 'related_to',
          label: `Relates conceptually to ${existingConcepts[0].title}`
        }
      ] : []
    };
  };

  const ai = getAiClient();
  if (!ai) {
    return createFallback();
  }

  const existingConceptsContext = existingConcepts.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    last_friction_point: c.last_friction_point,
    tags: c.tags || []
  }));

  const systemPrompt = `You are the AI engine of LoopTracker, a visual concept and learning loop tracker designed to rescue job seekers and engineers from tutorial hell.
Your task is to take raw study dumps, error logs, code snippets, or voice transcriptions, analyze them, and integrate them into a continuous concept graph.

CRITICAL RULES:
1. ANTI-EXPLOSION RULE: Extract MACRO-CONCEPTS only. Do NOT create separate micro-nodes for single syntax methods, variables, or error lines. Instead, synthesize them into the summary, friction point, and raw notes of the parent macro-concept.
2. AUTO-MERGING: Review the list of "Existing Concepts" provided. If the user's input is a continuation, bugfix, or deeper dive into an already existing concept, DO NOT create a new duplicate node. Instead, set 'existing_concept_id' to that concept's ID and provide updated summary, friction point, and notes to append.
3. CONTEXT-RESUMPTION ("State of Mind"): Every concept MUST identify:
   - 'last_friction_point': The exact conceptual hurdle, bug, or confusion hit.
   - 'suggested_next_step': A concrete, non-trivial next action to unblock them when resuming.
4. ESTIMATE MASTERY SCORE (1 to 5):
   - 1: Utterly confused / broken / zero mental model
   - 2: Shaky / hit significant friction / bug unresolved
   - 3: Functional understanding / working code but fuzzy edge cases
   - 4: Solid intuition / can articulate mechanics & trade-offs
   - 5: True mastery / can teach simply without buzzwords
5. RELATIONSHIPS: Discover prerequisites ('prerequisite_of'), hierarchies ('part_of'), derivations ('derived_from'), or cross-cutting links ('related_to'). Refer to concepts either by their existing UUID or by their exact 'title'.
6. STRICT DOMAIN PURITY (NO TRANSCRIPTION/RECORDING CONCEPTS):
   - The user may be dictating using voice recording or pasted notes.
   - NEVER create a concept, summary, friction point, or tag regarding "voice memo", "transcription", "audio", "recording", "voice mask", or speech recognition.
   - Focus exclusively on the academic, software engineering, or technical subject matter being learned (e.g. database connection pooling, Raft consensus, React reconciliation).`;

  return withTimeout(
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              text: `${systemPrompt}

Existing User Concepts in Graph:
${JSON.stringify(existingConceptsContext, null, 2)}

User's Raw Input (Text, Code Snippet, or Voice Transcription):
${rawInput}
`
            }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                session_summary: {
                  type: Type.STRING,
                  description: 'High-level synthesis of this study dump in 1-2 punchy sentences.'
                },
                concepts_to_merge_or_create: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      existing_concept_id: {
                        type: Type.STRING,
                        description: 'The UUID of an existing concept to merge with, or null/empty if this is a genuinely new macro-concept.'
                      },
                      title: {
                        type: Type.STRING,
                        description: 'Clear, authoritative concept title (3-6 words).'
                      },
                      summary: {
                        type: Type.STRING,
                        description: 'Crisp 2-3 sentence conceptual explanation focusing on mechanics and architecture.'
                      },
                      raw_notes_to_append: {
                        type: Type.STRING,
                        description: 'Structured notes, bullet points, and code excerpts extracted from the input.'
                      },
                      mastery_score: {
                        type: Type.INTEGER,
                        description: 'Integer from 1 to 5 based on user comprehension.'
                      },
                      last_friction_point: {
                        type: Type.STRING,
                        description: 'The specific stumbling block or question the user faced.'
                      },
                      suggested_next_step: {
                        type: Type.STRING,
                        description: 'Actionable next exercise or inquiry to breakthrough.'
                      },
                      tags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: '2-4 lowercase domain tags, e.g. ["distributed-systems", "raft"]'
                      }
                    },
                    required: ['title', 'summary', 'raw_notes_to_append', 'mastery_score', 'last_friction_point', 'suggested_next_step', 'tags']
                  }
                },
                relationships: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source_title_or_id: { type: Type.STRING },
                      target_title_or_id: { type: Type.STRING },
                      relationship_type: {
                        type: Type.STRING,
                        description: 'Must be one of: prerequisite_of, part_of, related_to, derived_from'
                      },
                      label: { type: Type.STRING, description: 'Short explanatory label for the edge.' }
                    },
                    required: ['source_title_or_id', 'target_title_or_id', 'relationship_type', 'label']
                  }
                }
              },
              required: ['session_summary', 'concepts_to_merge_or_create', 'relationships']
            }
          }
        });

        const parsed = JSON.parse(response.text ?? '{}') as AIExtractionResult;
        return parsed;
      } catch (err) {
        console.error('Error during AI extraction and merge:', err);
        return createFallback();
      }
    })(),
    15000,
    createFallback
  );
}

export function generateDynamicGroundedQuestion(
  concept: Concept,
  selectedAngle: string,
  previousQuestions: string[] = []
): {
  topic: string;
  angle: string;
  question: string;
  prompt_focus: string;
  suggested_key_points: string[];
} {
  const cleanTitle = cleanRawStudyInput(concept.title)
    .replace(/\b(voice memo|transcription|voice mask|audio recording|speech-to-text)\b/gi, '')
    .trim() || concept.title;

  const cleanFriction = cleanRawStudyInput(concept.last_friction_point || '')
    .replace(/\b(voice memo|transcription|voice mask|audio recording|speech-to-text)\b/gi, '')
    .trim();

  const cleanNotes = cleanRawStudyInput(concept.raw_notes || '')
    .replace(/\b(voice memo|transcription|voice mask|audio recording|speech-to-text)\b/gi, '')
    .trim();

  const tags = (concept.tags || []).filter(
    (t) => !/voice|memo|transcription|audio|record|mask/i.test(t)
  );

  // Extract key phrases or concepts from user's notes and friction point
  const notesSnippet = cleanNotes.split(/[.\n]/).filter(s => s.trim().length > 15)[0] || cleanNotes.slice(0, 80);
  const frictionPhrase = cleanFriction && cleanFriction.length > 8 ? cleanFriction : `handling unexpected state in ${cleanTitle}`;
  const relatedTopic = tags.length > 0 ? tags[0] : 'synchronous execution';

  // Determine angle key a-g from selectedAngle string
  let angleKey = 'a';
  if (/under the hood|internals|lifecycle/i.test(selectedAngle)) angleKey = 'b';
  else if (/predict|outcome|scenario/i.test(selectedAngle) && !/real-world/i.test(selectedAngle)) angleKey = 'c';
  else if (/find the bug|buggy|defect|error/i.test(selectedAngle)) angleKey = 'd';
  else if (/compare|vs|versus|difference/i.test(selectedAngle)) angleKey = 'e';
  else if (/breaks|remove|alter|change/i.test(selectedAngle)) angleKey = 'f';
  else if (/real-world|practice|production|deploy/i.test(selectedAngle)) angleKey = 'g';

  const candidates: Array<{
    question: string;
    prompt_focus: string;
    suggested_key_points: string[];
  }> = [];

  switch (angleKey) {
    case 'a': // Beginner explanation
      candidates.push({
        question: `How would you explain the intuitive mechanism of "${cleanTitle}" to a complete beginner using a physical real-world analogy (e.g., a restaurant kitchen, post office, or traffic controller) without relying on technical jargon?`,
        prompt_focus: `Beginner-friendly real-world analogy for "${cleanTitle}"`,
        suggested_key_points: [
          'A concrete physical analogy that maps cleanly to the concept',
          'Why the system cannot simply process everything synchronously',
          'How the caller knows when work is finished'
        ]
      });
      candidates.push({
        question: `If you had to teach "${cleanTitle}" to a student on day one in 3 simple chronological steps, how would you describe what happens from the moment it is called until completion?`,
        prompt_focus: `Three-step intuitive progression of "${cleanTitle}"`,
        suggested_key_points: [
          'Step 1: The trigger and initial dispatch',
          'Step 2: What happens while waiting in the background',
          'Step 3: How the final result or error is returned'
        ]
      });
      break;

    case 'b': // Under the hood
      candidates.push({
        question: `Under the hood in the runtime engine, trace the exact execution pipeline when "${cleanTitle}" runs: what specific internal queues, memory frames, or scheduling transitions occur step by step?`,
        prompt_focus: `Internal runtime queue transitions and data structures in "${cleanTitle}"`,
        suggested_key_points: [
          'Call stack vs event/microtask queues coordination',
          'Exact scheduling order and priority between tasks',
          'Context preservation and suspension mechanics'
        ]
      });
      candidates.push({
        question: `When executing "${cleanTitle}", where does state live in memory while an operation is paused or pending, and what exact trigger wakes the execution context back up?`,
        prompt_focus: `Memory layout and resumption triggers in "${cleanTitle}"`,
        suggested_key_points: [
          'Heap allocations for pending contexts/closures',
          'The signal or callback mechanism that enqueues continuation',
          'How stack frames are restored without corrupting state'
        ]
      });
      break;

    case 'c': // Predict the outcome
      candidates.push({
        question: `Predict the outcome: in a scenario where "${frictionPhrase}", what exact sequence of operations unfolds, and what output or side effect occurs first?`,
        prompt_focus: `Outcome prediction under "${frictionPhrase}"`,
        suggested_key_points: [
          'The causal order of execution steps',
          'Intermediate state changes before resolution',
          'Final observable behavior or error thrown'
        ]
      });
      candidates.push({
        question: `Predict the execution order: if code triggers three separate operations involving "${cleanTitle}" (one immediate, one scheduled with zero delay, and one chained), which callback executes first and why?`,
        prompt_focus: `Execution order and priority resolution in "${cleanTitle}"`,
        suggested_key_points: [
          'Queue priority rules (e.g. synchronous vs microtasks vs macrotasks)',
          'Starvation or blocking hazards',
          'The deterministic order of callbacks'
        ]
      });
      break;

    case 'd': // Find the bug
      candidates.push({
        question: `Find the bug: an engineer working on "${cleanTitle}" reports "${frictionPhrase}". What faulty mental model or logical mistake in their code created this issue, and how do you fix it?`,
        prompt_focus: `Root-cause analysis and fix for "${frictionPhrase}"`,
        suggested_key_points: [
          'The specific flaw in how the operation was invoked or handled',
          'Why the bug manifests silently or unexpectedly',
          'The defensive code pattern that permanently resolves it'
        ]
      });
      candidates.push({
        question: `Find the bug: an application leveraging "${cleanTitle}" suffers from an unhandled rejection and blocked execution under rapid load. Where did the author make an incorrect assumption about timing?`,
        prompt_focus: `Concurrency race and error-handling bugs in "${cleanTitle}"`,
        suggested_key_points: [
          'Missing error boundaries or uncaught exception paths',
          'Race conditions between concurrent invocations',
          'Structured concurrency and cleanup safeguards'
        ]
      });
      break;

    case 'e': // Compare vs related concept
      candidates.push({
        question: `Compare "${cleanTitle}" vs "${relatedTopic}" — what are the fundamental architectural differences, and under what specific workload or constraint should you choose one over the other?`,
        prompt_focus: `Architectural comparison: "${cleanTitle}" vs "${relatedTopic}"`,
        suggested_key_points: [
          'Core architectural trade-offs (memory, throughput, complexity)',
          'Scenarios where each approach excels',
          'Common pitfalls when migrating between them'
        ]
      });
      candidates.push({
        question: `How does the concurrency and scheduling model of "${cleanTitle}" compare to traditional multi-threaded worker pools in terms of memory overhead and I/O scalability?`,
        prompt_focus: `Concurrency trade-offs in "${cleanTitle}" vs thread pools`,
        suggested_key_points: [
          'Thread switching overhead vs cooperative event loop dispatch',
          'CPU-bound vs I/O-bound performance characteristics',
          'Data synchronization and lock-free benefits'
        ]
      });
      break;

    case 'f': // What breaks if removed
      candidates.push({
        question: `What breaks if the runtime engine removes or alters the core ordering and queueing guarantees of "${cleanTitle}"? Describe the exact failure mode or corruption that occurs.`,
        prompt_focus: `Failure mode analysis if core guarantees of "${cleanTitle}" are removed`,
        suggested_key_points: [
          'The specific invariant that was violated',
          'How downstream consumers or UI rendering would be disrupted',
          'Data race or deadlock consequences'
        ]
      });
      candidates.push({
        question: `What breaks in "${cleanTitle}" if an upstream dependency takes 10 seconds to respond while synchronous computation is simultaneously executing on the main thread?`,
        prompt_focus: `System responsiveness under latency and main thread pressure in "${cleanTitle}"`,
        suggested_key_points: [
          'Event loop delay and starvation of timer/I/O events',
          'Cascading timeout failures across callers',
          'Decoupling heavy CPU work from asynchronous dispatch'
        ]
      });
      break;

    case 'g': // Real-world scenario
    default:
      candidates.push({
        question: `Real-world scenario: you are deploying a production service reliant on "${cleanTitle}" that experiences sudden 10x traffic spikes. What specific metrics would you monitor, and how would you prevent starvation or latency degradation?`,
        prompt_focus: `Production monitoring and scalability safeguards for "${cleanTitle}"`,
        suggested_key_points: [
          'Key telemetry to track (queue depth, loop lag, p99 latency)',
          'Backpressure and rate-limiting patterns',
          'Graceful degradation when limits are exceeded'
        ]
      });
      candidates.push({
        question: `Real-world scenario: how would you architect a fault-tolerant retry and cancellation mechanism around "${cleanTitle}" to prevent hanging operations from exhausting system resources?`,
        prompt_focus: `Cancellation and timeout architecture in "${cleanTitle}"`,
        suggested_key_points: [
          'AbortController or cancellation token propagation',
          'Exponential backoff with jitter to protect downstream services',
          'Cleanup of lingering handles and open sockets'
        ]
      });
      break;
  }

  // Filter candidates so we never repeat a question already seen in previousQuestions
  const nonRepeated = candidates.filter(
    (c) => !previousQuestions.some((pq) => pq.toLowerCase().includes(c.question.slice(0, 35).toLowerCase()))
  );

  const selected = nonRepeated.length > 0
    ? nonRepeated[Math.floor(Math.random() * nonRepeated.length)]
    : candidates[0];

  return {
    topic: cleanTitle,
    angle: angleKey,
    question: selected.question,
    prompt_focus: selected.prompt_focus,
    suggested_key_points: selected.suggested_key_points
  };
}

export async function generateFeynmanQuestion(
  concept: Concept,
  angle?: string,
  previousQuestions: string[] = []
): Promise<{
  topic?: string;
  angle?: string;
  question: string;
  prompt_focus: string;
  suggested_key_points: string[];
}> {
  const selectedAngle = angle || 'Explain this concept in simple words as if to a beginner';

  const cleanTitle = cleanRawStudyInput(concept.title)
    .replace(/\b(voice memo|transcription|voice mask|audio recording|speech-to-text)\b/gi, '')
    .trim() || concept.title;

  const cleanFriction = cleanRawStudyInput(concept.last_friction_point || '')
    .replace(/\b(voice memo|transcription|voice mask|audio recording|speech-to-text)\b/gi, '')
    .trim();

  const cleanNotes = cleanRawStudyInput(concept.raw_notes || '')
    .replace(/\b(voice memo|transcription|voice mask|audio recording|speech-to-text)\b/gi, '')
    .trim()
    .slice(0, 500);

  const cleanTags = (concept.tags || []).filter(
    (t) => !/voice|memo|transcription|audio|record|mask/i.test(t)
  );

  // Generate dynamic, angle-grounded fallback with zero repetition
  const dynamicResult = generateDynamicGroundedQuestion(concept, selectedAngle, previousQuestions);

  const ai = getAiClient();
  if (!ai) {
    return dynamicResult;
  }

  const deduplicationBlock = previousQuestions.length > 0
    ? `Do NOT generate a question similar to these:\n${previousQuestions.slice(-5).map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n`
    : '';

  const prompt = `YOUR JOB:
Given a NOTE written by the user, generate exactly ONE question that tests whether the user truly understands THE TOPIC WRITTEN IN THAT NOTE.

HARD RULES (never break these):
1. GROUND THE QUESTION IN THE NOTE
   - Read the note's title, friction point, and tags FIRST.
   - Identify the CORE CONCEPT (e.g. "Raft leader election", "B+ tree range scan", "OAuth PKCE code interception", "Event loop microtasks").
   - The question must test THAT concept — not a generic question.
2. RANDOM ANGLE (rotate every time)
   Selected Angle: "${selectedAngle}"
   (a) Explain [core concept from note] in simple words to a beginner.
   (b) What happens under the hood when [core concept] runs?
   (c) Predict the outcome: [scenario built from the note's friction point].
   (d) Find the bug: [buggy scenario built from the note's friction point].
   (e) Compare [core concept] vs [a closely related concept mentioned or implied in the note] — when to use which?
   (f) What breaks if we remove/change [a specific part of the concept described in the note]?
   (g) Real-world scenario: how would you apply [core concept] in practice?
3. NO REPETITION
   ${deduplicationBlock}
   - Generate a question that is semantically distinct from all previous questions in this session. Do not reuse the same core concept, scenario, angle, or phrasing. Each question must test a different sub-aspect of the note.
4. STAY INSIDE THE NOTE
   - Use the note's own vocabulary so the user recognizes the topic.
5. EDGE CASES
   - If note is empty or under 20 characters, return: "Note too short to generate a meaningful question. Add more detail."
6. STRICT DOMAIN PURITY (ZERO AUDIO/TRANSCRIPTION META-QUESTIONS):
   - The question MUST test the substantive academic, technical, or engineering concept itself (e.g. distributed systems, database indexes, async runtime, data structures).
   - NEVER ask questions about voice recording, microphones, voice masking, speech recognition, audio capture, or how notes were recorded or transcribed.
   - Completely ignore any references to the recording medium or dictation.

NOTE_TITLE: ${cleanTitle}
NOTE_FRICTION_POINT: ${cleanFriction || 'None recorded'}
NOTE_TAGS: ${cleanTags.join(', ')}
NOTE_NOTES: ${cleanNotes}`;

  return withTimeout(
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING, description: 'The core concept identified from the note.' },
                angle: { type: Type.STRING, description: 'The angle key a-g used.' },
                question: { type: Type.STRING, description: 'The single targeted Feynman question.' },
                prompt_focus: { type: Type.STRING, description: 'Short highlight of the core focus.' },
                suggested_key_points: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 essential conceptual checkpoints.'
                }
              },
              required: ['topic', 'question']
            }
          }
        });

        const parsed = JSON.parse(response.text ?? '{}');
        if (parsed.question && !previousQuestions.some(pq => pq.trim().toLowerCase() === parsed.question.trim().toLowerCase())) {
          return {
            ...parsed,
            prompt_focus: parsed.prompt_focus || dynamicResult.prompt_focus,
            suggested_key_points: parsed.suggested_key_points || dynamicResult.suggested_key_points
          };
        }
        return dynamicResult;
      } catch (err) {
        console.warn('Gemini call failed or timed out, using dynamic note-grounded question:', err);
        return dynamicResult;
      }
    })(),
    10000,
    () => dynamicResult
  );
}

export async function gradeFeynmanExplanation(
  concept: Concept,
  question: string,
  userExplanation: string
): Promise<FeynmanGradeResult> {
  const fallback = (): FeynmanGradeResult => {
    const cleanTitle = cleanRawStudyInput(concept.title);
    const words = userExplanation.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Detect actual jargon or technical terms used in the explanation
    const knownJargon = [
      'synchronous', 'asynchronous', 'concurrency', 'state machine', 'thread',
      'under the hood', 'callback', 'microtask', 'macrotask', 'event loop',
      'promise', 'async', 'await', 'runtime', 'stack frame', 'heap'
    ];
    const detectedJargon = knownJargon.filter((j) =>
      new RegExp(`\\b${j}\\b`, 'i').test(userExplanation)
    );

    let score: MasteryScore = 2;
    if (wordCount >= 60 && detectedJargon.length <= 4) score = 4;
    else if (wordCount >= 35) score = 3;
    else if (wordCount >= 15) score = 2;
    else score = 1;

    const topicFriction =
      score >= 4
        ? `Solidified foundational model of ${cleanTitle}; ready to explore high-throughput concurrency and boundary conditions.`
        : `Deepen intuition on causal state transitions and failure edge cases in ${cleanTitle}.`;

    const topicNextStep =
      score >= 4
        ? `Construct a mock edge-case scenario or write a small test harness for ${cleanTitle}.`
        : `Trace the chronological execution diagram of ${cleanTitle} step by step without checking reference docs.`;

    return {
      score,
      clarity_analysis: `Your explanation articulates the mechanics with ${score >= 4 ? 'strong' : 'developing'} clarity (${wordCount} words). You explained the core behavior of ${cleanTitle} using causal reasoning.`,
      jargon_detected: detectedJargon.slice(0, 3),
      missing_pieces: [
        `Consider clarifying how ${cleanTitle} behaves under unexpected error states or heavy concurrency.`
      ],
      strengths: [
        `Clear causal connection in explanation`,
        `Directly addressed the question's target scenario`
      ],
      state_of_mind_update: {
        last_friction_point: topicFriction,
        suggested_next_step: topicNextStep
      }
    };
  };

  const ai = getAiClient();
  if (!ai) {
    return fallback();
  }

  const prompt = `You are Richard Feynman grading a software engineer's intuitive explanation of a technical concept.

Concept: ${concept.title}
Feynman Question: ${question}
User's Previous Mastery Score: ${concept.mastery_score}/5
Previous Friction Point: ${concept.last_friction_point}

User's Explanation:
"${userExplanation}"

Grading Criteria:
1. Clarity & Simplicity: Did they explain it in plain language, or did they hide behind buzzwords/jargon they can't define?
2. Accuracy: Is their underlying mental model factually and architecturally sound?
3. Addressing Friction: Did they successfully untangle the previous friction point?
4. Assign Mastery Score (1 to 5):
   - 1: Factually wrong or pure superficial buzzwords.
   - 2: Partially correct but heavily dependent on buzzwords without explaining *how* it works.
   - 3: Decent high-level intuition, but missed critical mechanics or edge cases.
   - 4: Strong, lucid explanation with valid analogies and clear causality.
   - 5: Flawless Feynman mastery—simple, crystal-clear, intuitive, and mechanically exact.`;

  return withTimeout(
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER, description: 'Mastery score 1 to 5' },
                clarity_analysis: { type: Type.STRING, description: 'Evaluation of explanation clarity and depth' },
                jargon_detected: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Buzzwords or technical terms used as crutches without explanation'
                },
                missing_pieces: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Critical mechanical elements omitted or misunderstood'
                },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'What the user articulated especially well'
                },
                state_of_mind_update: {
                  type: Type.OBJECT,
                  properties: {
                    last_friction_point: { type: Type.STRING },
                    suggested_next_step: { type: Type.STRING }
                  },
                  required: ['last_friction_point', 'suggested_next_step']
                }
              },
              required: ['score', 'clarity_analysis', 'jargon_detected', 'missing_pieces', 'strengths', 'state_of_mind_update']
            }
          }
        });

        const parsed = JSON.parse(response.text ?? '{}') as FeynmanGradeResult;
        const clampedScore = Math.max(1, Math.min(5, Math.round(parsed.score || 3))) as MasteryScore;
        parsed.score = clampedScore;
        return parsed;
      } catch (err) {
        console.error('Error grading Feynman explanation:', err);
        return fallback();
      }
    })(),
    12000,
    fallback
  );
}

export async function generateStateOfMindBriefing(
  concept: Concept,
  relatedConcepts: Concept[]
): Promise<StateOfMindBriefing> {
  const fallback: StateOfMindBriefing = {
    where_you_left_off: `You were examining ${concept.title} and analyzing its implementation in production scenarios.`,
    exact_friction_point: concept.last_friction_point || 'Resolving concurrency and boundary conditions.',
    suggested_next_step: concept.suggested_next_step || 'Draft a quick 3-node diagram or conduct a Feynman test.',
    related_concepts: relatedConcepts.map((c) => c.title),
    confidence_rating:
      concept.mastery_score >= 4
        ? 'High confidence - ready for interview drills'
        : concept.mastery_score === 3
        ? 'Medium - needs active recall practice'
        : 'Cold / High friction - review urgently'
  };

  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  const prompt = `Synthesize a concise "State of Mind Briefing" for a developer returning to this concept after a break.

Concept: ${concept.title}
Current Mastery Score: ${concept.mastery_score}/5
Summary: ${concept.summary}
Raw Notes: ${concept.raw_notes}
Last Known Friction Point: ${concept.last_friction_point}
Suggested Next Step: ${concept.suggested_next_step}
Connected Graph Nodes: ${relatedConcepts.map((c) => c.title).join(', ') || 'None yet'}

Provide:
1. 'where_you_left_off': Exactly what they were investigating or building when they stopped.
2. 'exact_friction_point': The specific question or wall they hit.
3. 'suggested_next_step': The highest-leverage single action to take right now to resume without friction.
4. 'confidence_rating': e.g. "Low (Cold Node)" / "Moderate" / "Solid Mastery"`;

  return withTimeout(
    (async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                where_you_left_off: { type: Type.STRING },
                exact_friction_point: { type: Type.STRING },
                suggested_next_step: { type: Type.STRING },
                confidence_rating: { type: Type.STRING }
              },
              required: ['where_you_left_off', 'exact_friction_point', 'suggested_next_step', 'confidence_rating']
            }
          }
        });

        const parsed = JSON.parse(response.text ?? '{}');
        return {
          ...parsed,
          related_concepts: relatedConcepts.map((c) => c.title)
        };
      } catch (err) {
        console.error('State of mind generation error:', err);
        return fallback;
      }
    })(),
    10000,
    () => fallback
  );
}
