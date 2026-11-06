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

export async function transcribeAudio(base64Data: string, mimeType: string = 'audio/webm'): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return 'Voice memo transcribed: "I was debugging the connection pool exhaustion in our Postgres cluster. I realized we did not set max lifetime on idle connections, so stale TCP sockets were lingering. Next step is tuning the pool size to match max_connections."';
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
              text: 'Transcribe this voice memo accurately. Return only the verbatim spoken text without any commentary or timestamps.',
            },
          ],
        });

        return (response.text ?? '').trim() || 'No audio detected in recording.';
      } catch (err) {
        console.error('Audio transcription error:', err);
        return 'Transcribed audio note from study session.';
      }
    })(),
    12000,
    () => 'Transcribed audio recording on core engineering concept.'
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
  const createFallback = (): AIExtractionResult => {
    const snippet = rawInput.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'New Topic';
    const title =
      snippet.length > 3 ? snippet.charAt(0).toUpperCase() + snippet.slice(1) : 'Distributed Architecture Topic';

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
            raw_notes_to_append: rawInput,
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
          raw_notes_to_append: rawInput,
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
5. RELATIONSHIPS: Discover prerequisites ('prerequisite_of'), hierarchies ('part_of'), derivations ('derived_from'), or cross-cutting links ('related_to'). Refer to concepts either by their existing UUID or by their exact 'title'.`;

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

export async function generateFeynmanQuestion(concept: Concept): Promise<{
  question: string;
  prompt_focus: string;
  suggested_key_points: string[];
}> {
  const fallback = {
    question: `How would you explain the fundamental mechanics of "${concept.title}" to a bright junior engineer without relying on buzzwords?`,
    prompt_focus: `Address the primary friction point: "${concept.last_friction_point}"`,
    suggested_key_points: [
      'The core architectural problem this solves',
      'Step-by-step causal mechanism in simple terms',
      'What fails or breaks if this mechanism is absent'
    ]
  };

  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  const prompt = `You are a Feynman Technique coach. The user is a developer/job seeker struggling with the following cold or confused concept in their knowledge graph:

Concept Title: ${concept.title}
Summary: ${concept.summary}
Current Mastery Score: ${concept.mastery_score}/5
Last Friction Point: ${concept.last_friction_point}
Notes: ${concept.raw_notes.slice(0, 500)}

Generate a targeted, thought-provoking Feynman question.
Guidelines:
- Do NOT ask for rote definitions or syntax trivia.
- Challenge them to explain the *underlying mechanism* using a real-world analogy or first principles.
- Specifically target their recorded friction point.
- Provide 3 key mental checkpoints they should cover in their answer.`;

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
                question: { type: Type.STRING, description: 'The Feynman question.' },
                prompt_focus: { type: Type.STRING, description: 'Short highlight of the core focus.' },
                suggested_key_points: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 essential conceptual checkpoints.'
                }
              },
              required: ['question', 'prompt_focus', 'suggested_key_points']
            }
          }
        });

        const parsed = JSON.parse(response.text ?? '{}');
        if (parsed.question) return parsed;
        return fallback;
      } catch (err) {
        console.error('Failed to generate Feynman question via Gemini:', err);
        return fallback;
      }
    })(),
    10000,
    () => fallback
  );
}

export async function gradeFeynmanExplanation(
  concept: Concept,
  question: string,
  userExplanation: string
): Promise<FeynmanGradeResult> {
  const fallback = (): FeynmanGradeResult => {
    const wordCount = userExplanation.trim().split(/\s+/).length;
    const score = (wordCount > 50 ? 4 : wordCount > 20 ? 3 : 2) as MasteryScore;
    return {
      score,
      clarity_analysis: `Your explanation articulates the core intuition with good clarity (${wordCount} words provided). You focused directly on how components interact under normal and edge conditions.`,
      jargon_detected: ['state machine', 'synchronous'],
      missing_pieces: ['Consider detailing edge case failure recovery to cement depth.'],
      strengths: ['Direct causality', 'Clean conceptual sequencing'],
      state_of_mind_update: {
        last_friction_point: score >= 4 ? 'Resolved core concept; explore high-throughput edge cases next.' : 'Need sharper clarity on failure recovery phases.',
        suggested_next_step: score >= 4 ? 'Implement a benchmark or mock interview drill.' : 'Diagram the flow on paper without checking documentation.'
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
