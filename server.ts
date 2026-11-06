import express, { type Request, type Response } from 'express';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { db } from './server/store.js';
import {
  transcribeAudio,
  extractAndMergeConcepts,
  generateFeynmanQuestion,
  gradeFeynmanExplanation,
  generateStateOfMindBriefing
} from './server/gemini.js';
import type { Concept, ConceptRelationship, MasteryScore } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Live API Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// WebSocket Server for Gemini Live API Voice Coaching
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live API] Client connected to /live');

  if (!process.env.GEMINI_API_KEY) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server' }));
    clientWs.close();
    return;
  }

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are the LoopTracker real-time voice study coach. You speak directly to the software engineer in a warm, knowledgeable, concise mentor tone to break tutorial hell and learning loops. Keep explanations crisp, intuitive, grounded in real systems concepts, and encourage them to explain concepts back in simple terms. Avoid long monologues.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
            if (part.text) {
              clientWs.send(JSON.stringify({ text: part.text }));
            }
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ closed: true }));
          }
        },
        onerror: (err: any) => {
          console.error('[Live API callback error]:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ error: err?.message || 'Live session error' }));
          }
        }
      },
    });

    clientWs.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text) {
          session.sendRealtimeInput({
            text: payload.text
          });
        }
      } catch (err) {
        console.error('[Live API] Error processing client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      try {
        session.close();
      } catch (e) {
        // ignore
      }
    });
  } catch (err: any) {
    console.error('[Live API] Failed to initiate session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err?.message || 'Failed to start Live session' }));
      clientWs.close();
    }
  }
});

// Increase payload limit to support audio memo base64 uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health / Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    user: db.getUser(),
    conceptCount: db.getConcepts().length
  });
});

// Full graph fetch
app.get('/api/graph', (req: Request, res: Response) => {
  res.json({
    user: db.getUser(),
    concepts: db.getConcepts(),
    relationships: db.getRelationships(),
    coldConcepts: db.getColdConcepts(),
    learningStates: db.getLearningStates(),
    sessions: db.getSessions()
  });
});

// Get single concept by ID
app.get('/api/concepts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const concept = db.getConceptById(id);
  if (!concept) {
    res.status(404).json({ error: 'Concept not found' });
    return;
  }
  res.json(concept);
});

// Update concept node drag position
app.put('/api/concepts/:id/position', (req: Request, res: Response) => {
  const { id } = req.params;
  const { position_x, position_y } = req.body;
  if (typeof position_x !== 'number' || typeof position_y !== 'number') {
    res.status(400).json({ error: 'position_x and position_y must be numbers' });
    return;
  }
  const ok = db.updateConceptPosition(id, position_x, position_y);
  if (!ok) {
    res.status(404).json({ error: 'Concept not found' });
    return;
  }
  res.json({ success: true, id, position_x, position_y });
});

// Update concept details
app.put('/api/concepts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = db.updateConcept(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Concept not found' });
    return;
  }
  res.json(updated);
});

// Delete concept
app.delete('/api/concepts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deleteConcept(id);
  res.json({ success: deleted });
});

// Create relationship
app.post('/api/relationships', (req: Request, res: Response) => {
  const { source_concept_id, target_concept_id, relationship_type, label } = req.body;
  if (!source_concept_id || !target_concept_id) {
    res.status(400).json({ error: 'source_concept_id and target_concept_id are required' });
    return;
  }
  const user = db.getUser();
  const rel = db.addRelationship({
    user_id: user.id,
    source_concept_id,
    target_concept_id,
    relationship_type: relationship_type || 'related_to',
    label: label || 'Related concept'
  });
  if (!rel) {
    res.status(400).json({ error: 'Self-loops not allowed or relationship creation failed' });
    return;
  }
  res.json(rel);
});

// Delete relationship
app.delete('/api/relationships/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const ok = db.deleteRelationship(id);
  res.json({ success: ok });
});

// Process Hybrid Input (Voice Memo + Text / Code snippet)
app.post('/api/process-input', async (req: Request, res: Response) => {
  try {
    const rawTextInput = (req.body.rawText || req.body.text || '').trim();
    const audioBase64 = req.body.audioBase64 || req.body.audio || '';
    const mimeType = req.body.mimeType || 'audio/webm';
    const sessionType = req.body.sessionType || 'dump';

    let combinedText = rawTextInput;
    let transcription: string | undefined = undefined;

    if (audioBase64) {
      transcription = await transcribeAudio(audioBase64, mimeType);
      if (combinedText) {
        combinedText = `[Voice Memo Transcription]:\n${transcription}\n\n[Pasted Notes & Code]:\n${combinedText}`;
      } else {
        combinedText = transcription;
      }
    }

    if (!combinedText) {
      res.status(400).json({ error: 'No input provided (neither text nor audio transcription)' });
      return;
    }

    const existingConcepts = db.getConcepts();
    const user = db.getUser();

    // Call Gemini for entity extraction, relationship discovery, and auto-merging
    const aiResult = await extractAndMergeConcepts(combinedText, existingConcepts);

    const updatedConceptsList: Concept[] = [];
    const newConceptsList: Concept[] = [];
    const createdOrUpdatedIds: string[] = [];

    // Process concepts
    for (const item of aiResult.concepts_to_merge_or_create) {
      let targetConcept: Concept | undefined = undefined;

      // 1. Match by explicit existing_concept_id
      if (item.existing_concept_id) {
        targetConcept = db.getConceptById(item.existing_concept_id);
      }

      // 2. Fallback match by exact or substring title containment
      if (!targetConcept) {
        const itemTitle = item.title.toLowerCase().trim();
        targetConcept = existingConcepts.find(c => {
          const cTitle = c.title.toLowerCase().trim();
          return (
            cTitle === itemTitle ||
            cTitle.includes(itemTitle) ||
            itemTitle.includes(cTitle)
          );
        });
      }

      if (targetConcept) {
        // Merge into existing concept (anti-explosion & update loop)
        const updatedRawNotes = targetConcept.raw_notes
          ? `${targetConcept.raw_notes}\n\n--- [Session Update ${new Date().toLocaleDateString()}] ---\n${item.raw_notes_to_append}`
          : item.raw_notes_to_append;

        const updated = db.updateConcept(targetConcept.id, {
          summary: item.summary,
          raw_notes: updatedRawNotes,
          last_friction_point: item.last_friction_point || targetConcept.last_friction_point,
          suggested_next_step: item.suggested_next_step || targetConcept.suggested_next_step,
          mastery_score: item.mastery_score,
          tags: Array.from(new Set([...(targetConcept.tags || []), ...item.tags]))
        });

        if (updated) {
          updatedConceptsList.push(updated);
          createdOrUpdatedIds.push(updated.id);
        }
      } else {
        // Create new concept node with calculated position
        const existingCount = db.getConcepts().length;
        const col = existingCount % 4;
        const row = Math.floor(existingCount / 4);
        const position_x = 100 + col * 480 + (Math.random() * 40 - 20);
        const position_y = 100 + row * 320 + (Math.random() * 40 - 20);

        const colorMap: Record<number, string> = {
          1: '#ef4444',
          2: '#f97316',
          3: '#eab308',
          4: '#22c55e',
          5: '#10b981'
        };

        const newConcept = db.addConcept({
          user_id: user.id,
          title: item.title,
          summary: item.summary,
          raw_notes: item.raw_notes_to_append,
          mastery_score: item.mastery_score,
          position_x,
          position_y,
          color_code: colorMap[item.mastery_score] || '#f97316',
          last_friction_point: item.last_friction_point,
          suggested_next_step: item.suggested_next_step,
          next_review_at: new Date(Date.now() + 2 * 86400000).toISOString(),
          tags: item.tags
        });

        newConceptsList.push(newConcept);
        createdOrUpdatedIds.push(newConcept.id);

        db.recordLearningState({
          id: 'ls-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          concept_id: newConcept.id,
          concept_title: newConcept.title,
          previous_score: 0,
          new_score: newConcept.mastery_score,
          trigger_event: 'session_dump',
          recorded_at: new Date().toISOString(),
          feedback_notes: 'Initial concept registered from study dump'
        });
      }
    }

    // Process relationships
    const allConceptsCurrent = db.getConcepts();
    const findConceptRef = (ref: string): Concept | undefined => {
      const trimmed = ref.trim().toLowerCase();
      return allConceptsCurrent.find(
        c => c.id === ref || c.title.toLowerCase() === trimmed || c.title.toLowerCase().includes(trimmed)
      );
    };

    const newRelationships: ConceptRelationship[] = [];
    if (Array.isArray(aiResult.relationships)) {
      for (const rel of aiResult.relationships) {
        const source = findConceptRef(rel.source_title_or_id);
        const target = findConceptRef(rel.target_title_or_id);
        if (source && target && source.id !== target.id) {
          const added = db.addRelationship({
            user_id: user.id,
            source_concept_id: source.id,
            target_concept_id: target.id,
            relationship_type: rel.relationship_type,
            label: rel.label
          });
          if (added) {
            newRelationships.push(added);
          }
        }
      }
    }

    // Save Study Session
    const session = db.addSession(
      {
        user_id: user.id,
        session_type: sessionType as any,
        raw_session_input: combinedText,
        ai_summary: aiResult.session_summary,
        duration_minutes: 15,
        started_at: new Date(Date.now() - 15 * 60000).toISOString(),
        ended_at: new Date().toISOString()
      },
      createdOrUpdatedIds
    );

    res.json({
      session,
      updated_concepts: updatedConceptsList,
      new_concepts: newConceptsList,
      relationships: newRelationships,
      ai_notes: aiResult.session_summary,
      transcription
    });
  } catch (err) {
    console.error('Error in /api/process-input:', err);
    res.status(500).json({
      error: 'Failed to process input',
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

// Cold nodes for Feynman Warmup
app.get('/api/feynman/cold-nodes', (req: Request, res: Response) => {
  const coldNodes = db.getColdConcepts();
  res.json(coldNodes);
});

// Generate Feynman Question for a concept
app.post('/api/feynman/question', async (req: Request, res: Response) => {
  try {
    const { concept_id } = req.body;
    let concept = concept_id ? db.getConceptById(concept_id) : undefined;

    if (!concept) {
      // Pick first cold node if none specified
      const coldNodes = db.getColdConcepts();
      concept = coldNodes[0] || db.getConcepts()[0];
    }

    if (!concept) {
      res.status(404).json({ error: 'No concepts available to test' });
      return;
    }

    const questionData = await generateFeynmanQuestion(concept);
    res.json({
      concept_id: concept.id,
      concept_title: concept.title,
      current_mastery: concept.mastery_score,
      last_friction_point: concept.last_friction_point,
      ...questionData
    });
  } catch (err) {
    console.error('Error generating Feynman question:', err);
    res.status(500).json({ error: 'Could not generate question' });
  }
});

// Grade Feynman Explanation
app.post('/api/feynman/grade', async (req: Request, res: Response) => {
  try {
    const concept_id = req.body.concept_id || req.body.conceptId;
    const user_explanation = req.body.user_explanation || req.body.userAnswer || req.body.explanation;
    const question = req.body.question || '';

    if (!concept_id || !user_explanation) {
      res.status(400).json({ error: 'concept_id and user_explanation (or conceptId and userAnswer) are required' });
      return;
    }

    const concept = db.getConceptById(concept_id);
    if (!concept) {
      res.status(404).json({ error: 'Concept not found' });
      return;
    }

    const grading = await gradeFeynmanExplanation(concept, question || '', user_explanation);
    const oldScore = concept.mastery_score;

    // Update concept mastery and friction points
    const colorMap: Record<number, string> = {
      1: '#ef4444',
      2: '#f97316',
      3: '#eab308',
      4: '#22c55e',
      5: '#10b981'
    };

    const nextReviewDays = grading.score >= 4 ? 7 : grading.score === 3 ? 3 : 1;
    const updatedConcept = db.updateConcept(concept.id, {
      mastery_score: grading.score,
      color_code: colorMap[grading.score] || '#eab308',
      last_friction_point: grading.state_of_mind_update.last_friction_point,
      suggested_next_step: grading.state_of_mind_update.suggested_next_step,
      next_review_at: new Date(Date.now() + nextReviewDays * 86400000).toISOString()
    });

    // Record audit entry in learning_states
    db.recordLearningState({
      id: 'ls-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      concept_id: concept.id,
      concept_title: concept.title,
      previous_score: oldScore,
      new_score: grading.score,
      trigger_event: 'feynman_test',
      recorded_at: new Date().toISOString(),
      feedback_notes: grading.clarity_analysis
    });

    // Save session
    db.addSession(
      {
        user_id: db.getUser().id,
        session_type: 'feynman_test',
        raw_session_input: `Q: ${question}\n\nExplanation:\n${user_explanation}`,
        ai_summary: `Feynman Test for "${concept.title}": Score ${oldScore} -> ${grading.score}. ${grading.clarity_analysis.slice(0, 120)}`,
        duration_minutes: 10,
        started_at: new Date(Date.now() - 10 * 60000).toISOString(),
        ended_at: new Date().toISOString()
      },
      [concept.id]
    );

    res.json({
      success: true,
      new_score: grading.score,
      feedback: grading.clarity_analysis,
      ...grading,
      concept: updatedConcept,
      score_change: {
        from: oldScore,
        to: grading.score
      }
    });
  } catch (err) {
    console.error('Error grading Feynman explanation:', err);
    res.status(500).json({ error: 'Failed to grade explanation' });
  }
});

// State of Mind Briefing on demand
app.post('/api/concepts/:id/state-of-mind', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const concept = db.getConceptById(id);
    if (!concept) {
      res.status(404).json({ error: 'Concept not found' });
      return;
    }

    // Find related concepts
    const rels = db.getRelationships().filter(
      r => r.source_concept_id === id || r.target_concept_id === id
    );
    const relatedIds = rels.map(r => (r.source_concept_id === id ? r.target_concept_id : r.source_concept_id));
    const relatedConcepts = db.getConcepts().filter(c => relatedIds.includes(c.id));

    const briefing = await generateStateOfMindBriefing(concept, relatedConcepts);
    res.json(briefing);
  } catch (err) {
    console.error('Error generating State of Mind briefing:', err);
    res.status(500).json({ error: 'Failed to generate briefing' });
  }
});

// Reset to seed data
app.post('/api/reset-seed', (req: Request, res: Response) => {
  const data = db.resetToSeed();
  res.json({ success: true, message: 'Reset to initial seed knowledge graph', data });
});

// Attach Vite middleware in development or static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LoopTracker server running with WebSocket Live API at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
