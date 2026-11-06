import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Concept,
  ConceptRelationship,
  StudySession,
  SessionConcept,
  LearningState,
  MasteryScore
} from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  users: Array<{ id: string; email: string; created_at: string }>;
  concepts: Concept[];
  concept_relationships: ConceptRelationship[];
  study_sessions: StudySession[];
  session_concepts: SessionConcept[];
  learning_states: LearningState[];
}

const DEFAULT_USER_ID = 'usr_jobseeker_demo';

export function getInitialSeedData(): DatabaseSchema {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  const daysAhead = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

  const concepts: Concept[] = [
    {
      id: 'c-raft-consensus',
      user_id: DEFAULT_USER_ID,
      title: 'Raft Consensus Algorithm',
      summary: 'Leader election, log replication, and safety invariants in distributed replicated state machines. Relies on randomized election timers to avoid split votes.',
      raw_notes: 'Notes from tutorial:\n- Heartbeats prevent follower timeouts\n- Candidate increments currentTerm and votes for self\n- Stumbled when reading section 5.2: what happens when leader gets disconnected during log entry commit? Need to understand how follower truncates uncommitted entries upon rejoin.',
      mastery_score: 1,
      position_x: 120,
      position_y: 140,
      color_code: '#ef4444',
      last_friction_point: 'Split-vote deadlock recovery & handling uncommitted log divergence after network partition heals.',
      suggested_next_step: 'Trace a 5-node cluster diagram where Node 1 is partitioned, Node 2 becomes leader in term 2, and Node 1 rejoins with stale uncommitted logs.',
      next_review_at: daysAgo(3),
      created_at: daysAgo(10),
      updated_at: daysAgo(3),
      tags: ['distributed-systems', 'consensus', 'systems-design']
    },
    {
      id: 'c-quorums',
      user_id: DEFAULT_USER_ID,
      title: 'Distributed Quorums (W + R > N)',
      summary: 'Strict quorum consistency model guaranteeing that the read set and write set always overlap by at least one node, ensuring monotonic reads of latest writes.',
      raw_notes: 'If N=3, W=2, R=2: overlap is guaranteed (2+2=4 > 3). Write to 2 nodes, read from 2 nodes, highest timestamp wins.',
      mastery_score: 4,
      position_x: 100,
      position_y: 460,
      color_code: '#22c55e',
      last_friction_point: 'Reconciling concurrent timestamp clocks (Lamport vs Vector clocks) under sloppy quorums.',
      suggested_next_step: 'Review Dynamo paper section on hinted handoff and anti-entropy with Merkle trees.',
      next_review_at: daysAhead(5),
      created_at: daysAgo(14),
      updated_at: daysAgo(5),
      tags: ['distributed-systems', 'databases']
    },
    {
      id: 'c-react-fiber',
      user_id: DEFAULT_USER_ID,
      title: 'React Fiber Architecture & Work Loop',
      summary: 'React 18+ reconciler breaking synchronous recursive tree traversal into cooperative units of work using requestIdleCallback / MessageChannel scheduler.',
      raw_notes: 'Two phases:\n1. Render Phase (reconciliation): pure, no side effects, interruptible by higher-priority events\n2. Commit Phase: mutations to real DOM, runs synchronously\nFriction: Mixed up lane priorities and why useEffect runs asynchronously after layout.',
      mastery_score: 2,
      position_x: 620,
      position_y: 130,
      color_code: '#f97316',
      last_friction_point: 'Confusing how priority lanes preempt in-progress render work without leaking partial DOM state.',
      suggested_next_step: 'Explain the difference between alternate fiber pointers (workInProgress vs current) using the double-buffering canvas analogy.',
      next_review_at: daysAgo(8),
      created_at: daysAgo(9),
      updated_at: daysAgo(8),
      tags: ['frontend', 'react', 'performance']
    },
    {
      id: 'c-btree-storage',
      user_id: DEFAULT_USER_ID,
      title: 'B-Tree vs LSM-Tree Storage Engines',
      summary: 'Tradeoffs between in-place page updates (B-Trees in Postgres/InnoDB) and append-only sequential writes with background compactions (LSM-Trees in RocksDB/Cassandra).',
      raw_notes: 'B-Tree:\n- Good for read-heavy workloads\n- Random write page splits require WAL\nLSM-Tree:\n- High write throughput, MemTable -> SSable\n- Read amplification mitigated by Bloom filters',
      mastery_score: 3,
      position_x: 640,
      position_y: 480,
      color_code: '#eab308',
      last_friction_point: 'Quantifying write amplification factor during leveled compaction vs size-tiered compaction.',
      suggested_next_step: 'Calculate write amplification for a 10MB write in a 4-level LSM tree.',
      next_review_at: daysAgo(1),
      created_at: daysAgo(12),
      updated_at: daysAgo(1),
      tags: ['databases', 'internals', 'storage']
    },
    {
      id: 'c-database-indexing',
      user_id: DEFAULT_USER_ID,
      title: 'Database Indexing & B+ Trees',
      summary: 'Multi-level self-balancing tree structure where leaves contain all keys linked sequentially, optimized for block storage reads and range scans.',
      raw_notes: 'High fan-out means low tree height (depth 3-4 holds billions of records). Clustered vs non-clustered index lookup costs.',
      mastery_score: 5,
      position_x: 630,
      position_y: 780,
      color_code: '#10b981',
      last_friction_point: 'Composite index prefix matching rules on range queries.',
      suggested_next_step: 'Explain to a junior engineer how covering indexes eliminate table heap lookups.',
      next_review_at: daysAhead(14),
      created_at: daysAgo(20),
      updated_at: daysAgo(6),
      tags: ['databases', 'sql', 'performance']
    },
    {
      id: 'c-k8s-lifecycle',
      user_id: DEFAULT_USER_ID,
      title: 'Kubernetes Pod Lifecycle & Eviction',
      summary: 'Pod phase transitions (Pending -> Running -> Succeeded/Failed), termination grace period (preStop hook -> SIGTERM -> SIGKILL), and kubelet eviction thresholds.',
      raw_notes: 'Debugged a production 502 error during rolling update. Service endpoint controller removes pod IP asynchronously, so traffic was still sent while container was shutting down!',
      mastery_score: 2,
      position_x: 1120,
      position_y: 150,
      color_code: '#f97316',
      last_friction_point: 'Race condition between EndpointSlice propagation and container SIGTERM during rolling updates.',
      suggested_next_step: 'Implement a preStop sleep 5s hook in Deployment YAML and test zero-downtime curl loop.',
      next_review_at: daysAgo(4),
      created_at: daysAgo(7),
      updated_at: daysAgo(4),
      tags: ['devops', 'kubernetes', 'reliability']
    },
    {
      id: 'c-container-isolation',
      user_id: DEFAULT_USER_ID,
      title: 'Linux Namespaces & Cgroups',
      summary: 'Underlying Linux kernel primitives that form containers: PID/NET/MNT namespaces for visibility boundaries, cgroups v2 for CPU/memory resource limits.',
      raw_notes: 'Containers are just processes! `unshare` command creates new namespaces. OOM killer targets cgroup memory.max exceeders.',
      mastery_score: 4,
      position_x: 1130,
      position_y: 470,
      color_code: '#22c55e',
      last_friction_point: 'Understanding cgroups v1 vs v2 unified hierarchy implications on Java 8 heap sizing.',
      suggested_next_step: 'Write a 20-line bash script creating a mini chroot container with isolated PID namespace.',
      next_review_at: daysAhead(8),
      created_at: daysAgo(18),
      updated_at: daysAgo(2),
      tags: ['linux', 'containers', 'systems']
    },
    {
      id: 'c-oauth-pkce',
      user_id: DEFAULT_USER_ID,
      title: 'OAuth 2.0 PKCE Flow',
      summary: 'Proof Key for Code Exchange protocol preventing authorization code interception attacks on public clients (SPAs and mobile apps) without client secrets.',
      raw_notes: 'Client generates code_verifier (random string) and code_challenge (SHA-256 base64url). Auth server verifies challenge hash upon code exchange.',
      mastery_score: 3,
      position_x: 1110,
      position_y: 770,
      color_code: '#eab308',
      last_friction_point: 'Proper token storage security tradeoffs in browser (HttpOnly cookies vs in-memory with refresh token rotation).',
      suggested_next_step: 'Draft an architectural diagram of Token Refresh rotation with replay detection.',
      next_review_at: daysAgo(2),
      created_at: daysAgo(11),
      updated_at: daysAgo(2),
      tags: ['security', 'auth', 'web']
    }
  ];

  const relationships: ConceptRelationship[] = [
    {
      id: 'r-quorum-raft',
      user_id: DEFAULT_USER_ID,
      source_concept_id: 'c-quorums',
      target_concept_id: 'c-raft-consensus',
      relationship_type: 'prerequisite_of',
      label: 'Majority quorum is prerequisite for Raft leader elections',
      created_at: daysAgo(10)
    },
    {
      id: 'r-btree-lsm',
      user_id: DEFAULT_USER_ID,
      source_concept_id: 'c-database-indexing',
      target_concept_id: 'c-btree-storage',
      relationship_type: 'prerequisite_of',
      label: 'B+ Tree index mechanics form foundation for storage comparison',
      created_at: daysAgo(12)
    },
    {
      id: 'r-cgroups-k8s',
      user_id: DEFAULT_USER_ID,
      source_concept_id: 'c-container-isolation',
      target_concept_id: 'c-k8s-lifecycle',
      relationship_type: 'prerequisite_of',
      label: 'Kernel cgroups define container resource limits enforced by Kubelet',
      created_at: daysAgo(7)
    },
    {
      id: 'r-raft-k8s',
      user_id: DEFAULT_USER_ID,
      source_concept_id: 'c-raft-consensus',
      target_concept_id: 'c-k8s-lifecycle',
      relationship_type: 'related_to',
      label: 'etcd backing Kubernetes control plane relies directly on Raft',
      created_at: daysAgo(5)
    },
    {
      id: 'r-fiber-btree',
      user_id: DEFAULT_USER_ID,
      source_concept_id: 'c-btree-storage',
      target_concept_id: 'c-react-fiber',
      relationship_type: 'related_to',
      label: 'Both balance tree traversal latency vs batched commits',
      created_at: daysAgo(4)
    }
  ];

  const studySessions: StudySession[] = [
    {
      id: 'sess-01',
      user_id: DEFAULT_USER_ID,
      session_type: 'dump',
      raw_session_input: 'Read through Raft paper section 5. Stuck on term conflicts when leader drops.',
      ai_summary: 'Analyzed Raft leader election edge cases and uncommitted log handling during network partitions.',
      duration_minutes: 35,
      started_at: daysAgo(3),
      ended_at: daysAgo(3)
    },
    {
      id: 'sess-02',
      user_id: DEFAULT_USER_ID,
      session_type: 'feynman_test',
      raw_session_input: 'Feynman test on Database Indexing B+ trees vs Binary Search trees.',
      ai_summary: 'Mastered B+ Tree fan-out and sequential leaf node scan efficiency.',
      duration_minutes: 20,
      started_at: daysAgo(6),
      ended_at: daysAgo(6)
    }
  ];

  const sessionConcepts: SessionConcept[] = [
    {
      session_id: 'sess-01',
      concept_id: 'c-raft-consensus',
      notes_added: 'Noted partition recovery problem'
    },
    {
      session_id: 'sess-02',
      concept_id: 'c-database-indexing',
      notes_added: 'Passed Feynman test with 5/5'
    }
  ];

  const learningStates: LearningState[] = [
    {
      id: 'ls-01',
      concept_id: 'c-database-indexing',
      concept_title: 'Database Indexing & B+ Trees',
      previous_score: 3,
      new_score: 5,
      trigger_event: 'feynman_test',
      recorded_at: daysAgo(6),
      feedback_notes: 'Flawlessly explained high fan-out, block size matching, and avoiding heap scans with covering indexes without buzzwords.'
    },
    {
      id: 'ls-02',
      concept_id: 'c-raft-consensus',
      concept_title: 'Raft Consensus Algorithm',
      previous_score: 2,
      new_score: 1,
      trigger_event: 'session_dump',
      recorded_at: daysAgo(3),
      feedback_notes: 'Reported confusion over split-vote deadlocks and uncommitted log entry drops.'
    },
    {
      id: 'ls-03',
      concept_id: 'c-react-fiber',
      concept_title: 'React Fiber Architecture & Work Loop',
      previous_score: 1,
      new_score: 2,
      trigger_event: 'review',
      recorded_at: daysAgo(8),
      feedback_notes: 'Understood render phase vs commit phase distinction, but still uncertain about preemption lanes.'
    }
  ];

  return {
    users: [{ id: DEFAULT_USER_ID, email: 'candidate@looptracker.dev', created_at: daysAgo(30) }],
    concepts,
    concept_relationships: relationships,
    study_sessions: studySessions,
    session_concepts: sessionConcepts,
    learning_states: learningStates
  };
}

export class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read saved data file, using fresh initial seed:', err);
    }

    const seed = getInitialSeedData();
    this.saveData(seed);
    return seed;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  public resetToSeed(): DatabaseSchema {
    this.data = getInitialSeedData();
    this.persist();
    return this.data;
  }

  // Users
  public getUser() {
    return this.data.users[0];
  }

  // Concepts
  public getConcepts(): Concept[] {
    return this.data.concepts;
  }

  public getConceptById(id: string): Concept | undefined {
    return this.data.concepts.find(c => c.id === id);
  }

  public updateConceptPosition(id: string, x: number, y: number): boolean {
    const concept = this.data.concepts.find(c => c.id === id);
    if (!concept) return false;
    concept.position_x = Math.round(x);
    concept.position_y = Math.round(y);
    concept.updated_at = new Date().toISOString();
    this.persist();
    return true;
  }

  public updateConcept(id: string, updates: Partial<Concept>): Concept | undefined {
    const idx = this.data.concepts.findIndex(c => c.id === id);
    if (idx === -1) return undefined;

    const old = this.data.concepts[idx];
    const updated: Concept = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.mastery_score !== undefined && updates.mastery_score !== old.mastery_score) {
      this.recordLearningState({
        id: 'ls-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        concept_id: id,
        concept_title: updated.title,
        previous_score: old.mastery_score,
        new_score: updates.mastery_score as MasteryScore,
        trigger_event: 'manual_adjustment',
        recorded_at: new Date().toISOString(),
        feedback_notes: 'Mastery score changed manually in concept inspector'
      });
    }

    this.data.concepts[idx] = updated;
    this.persist();
    return updated;
  }

  public addConcept(concept: Omit<Concept, 'id' | 'created_at' | 'updated_at'>): Concept {
    const id = 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const newConcept: Concept = {
      ...concept,
      id,
      created_at: now,
      updated_at: now
    };
    this.data.concepts.push(newConcept);
    this.persist();
    return newConcept;
  }

  public deleteConcept(id: string): boolean {
    const initialLen = this.data.concepts.length;
    this.data.concepts = this.data.concepts.filter(c => c.id !== id);
    // Cascade remove relationships
    this.data.concept_relationships = this.data.concept_relationships.filter(
      r => r.source_concept_id !== id && r.target_concept_id !== id
    );
    this.persist();
    return this.data.concepts.length < initialLen;
  }

  // Relationships
  public getRelationships(): ConceptRelationship[] {
    return this.data.concept_relationships;
  }

  public addRelationship(rel: Omit<ConceptRelationship, 'id' | 'created_at'>): ConceptRelationship | null {
    if (rel.source_concept_id === rel.target_concept_id) {
      return null; // prevent self-loops
    }
    // Check duplicate pair - update if already exists (upsert)
    const exists = this.data.concept_relationships.find(
      r => (r.source_concept_id === rel.source_concept_id && r.target_concept_id === rel.target_concept_id) ||
           (r.source_concept_id === rel.target_concept_id && r.target_concept_id === rel.source_concept_id)
    );
    if (exists) {
      exists.relationship_type = rel.relationship_type;
      exists.label = rel.label;
      this.persist();
      return exists;
    }

    const newRel: ConceptRelationship = {
      ...rel,
      id: 'r-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    };
    this.data.concept_relationships.push(newRel);
    this.persist();
    return newRel;
  }

  public deleteRelationship(id: string): boolean {
    const len = this.data.concept_relationships.length;
    this.data.concept_relationships = this.data.concept_relationships.filter(r => r.id !== id);
    this.persist();
    return this.data.concept_relationships.length < len;
  }

  // Sessions
  public getSessions(): StudySession[] {
    return this.data.study_sessions;
  }

  public addSession(session: Omit<StudySession, 'id'>, conceptIds: string[] = []): StudySession {
    const id = 'sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newSession: StudySession = {
      ...session,
      id
    };
    this.data.study_sessions.unshift(newSession);

    for (const cId of conceptIds) {
      this.data.session_concepts.push({
        session_id: id,
        concept_id: cId,
        notes_added: session.ai_summary.slice(0, 100)
      });
    }

    this.persist();
    return newSession;
  }

  // Learning States (Audit log)
  public getLearningStates(): LearningState[] {
    return this.data.learning_states;
  }

  public recordLearningState(entry: LearningState) {
    this.data.learning_states.unshift(entry);
    this.persist();
  }

  // Cold node query
  public getColdConcepts(): Concept[] {
    const now = Date.now();
    const sevenDaysMs = 7 * 86400000;
    return this.data.concepts.filter(c => {
      const isLowMastery = c.mastery_score <= 2;
      const isStale = (now - new Date(c.updated_at).getTime()) > sevenDaysMs;
      return isLowMastery || isStale;
    }).sort((a, b) => a.mastery_score - b.mastery_score);
  }
}

export const db = new DatabaseStore();
