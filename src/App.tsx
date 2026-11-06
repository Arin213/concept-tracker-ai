/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HeaderNavbar } from './components/HeaderNavbar.js';
import { CanvasGraph } from './components/CanvasGraph.js';
import { InputModal } from './components/InputModal.js';
import { FeynmanWarmupModal } from './components/FeynmanWarmupModal.js';
import { ConceptSlideOver } from './components/ConceptSlideOver.js';
import { LearningAuditModal } from './components/LearningAuditModal.js';
import { InfoModal } from './components/InfoModal.js';
import { LiveVoiceModal } from './components/LiveVoiceModal.js';
import { InputDrawer } from './components/InputDrawer.js';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  loadUserDataFromFirestore,
  backupAllToFirestore,
  updateConceptPositionInFirestore,
  saveConceptToFirestore,
  deleteConceptFromFirestore,
  saveRelationshipToFirestore,
  deleteRelationshipFromFirestore
} from './lib/firebase.js';
import type { User } from 'firebase/auth';
import type {
  Concept,
  ConceptRelationship,
  LearningState,
  ProcessInputResponse,
  RelationshipType,
  StudySession
} from './types.js';
import { Flame, Loader2, Sparkles, X } from 'lucide-react';

export default function App() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [relationships, setRelationships] = useState<ConceptRelationship[]>([]);
  const [coldConcepts, setColdConcepts] = useState<Concept[]>([]);
  const [learningStates, setLearningStates] = useState<LearningState[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User state from Firebase Auth
  const [user, setUser] = useState<User | null>(null);

  // Light / Dark Theme State (defaults to Milk Coffee)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('looptracker_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}
    return 'light'; // Default to warm milk coffee mode
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('looptracker_theme', theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Modals & Panels
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isFeynmanModalOpen, setIsFeynmanModalOpen] = useState(false);
  const [feynmanTargetConcept, setFeynmanTargetConcept] = useState<Concept | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [dismissWarmupToast, setDismissWarmupToast] = useState(false);

  // Firebase Auth Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const cloudData = await loadUserDataFromFirestore(currentUser.uid);
          if (cloudData && cloudData.concepts && cloudData.concepts.length > 0) {
            setConcepts(cloudData.concepts);
            setRelationships(cloudData.relationships);
            setLearningStates(cloudData.learningStates);
            setSessions(cloudData.sessions);
            setColdConcepts(cloudData.concepts.filter((c) => c.mastery_score <= 2));
          } else if (concepts.length > 0) {
            await backupAllToFirestore(currentUser.uid, {
              concepts,
              relationships,
              learningStates,
              sessions
            });
          }
        } catch (e) {
          console.warn('Firestore initial sync notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [concepts.length]);

  const handleSignInGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      alert('Sign-In notice: ' + (err?.message || 'Authentication closed'));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign-Out error:', err);
    }
  };

  // Load knowledge graph
  const loadGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/graph');
      if (res.ok) {
        const data = await res.json();
        setConcepts(data.concepts || []);
        setRelationships(data.relationships || []);
        setColdConcepts(data.coldConcepts || []);
        setLearningStates(data.learningStates || []);
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Update node position on canvas drag stop
  const handleUpdatePosition = async (id: string, x: number, y: number) => {
    setConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, position_x: x, position_y: y } : c))
    );

    if (user) {
      updateConceptPositionInFirestore(user.uid, id, x, y);
    }

    try {
      await fetch(`/api/concepts/${id}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_x: x, position_y: y }),
      });
    } catch (err) {
      console.error('Failed to save position:', err);
    }
  };

  // Update concept details
  const handleUpdateConcept = async (id: string, updates: Partial<Concept>) => {
    try {
      const res = await fetch(`/api/concepts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setConcepts((prev) => prev.map((c) => (c.id === id ? updated : c)));
        if (selectedConcept && selectedConcept.id === id) {
          setSelectedConcept(updated);
        }
        if (user) {
          saveConceptToFirestore(user.uid, updated);
        }
        loadGraph();
      }
    } catch (err) {
      console.error('Failed to update concept:', err);
    }
  };

  // Delete concept
  const handleDeleteConcept = async (id: string) => {
    try {
      await fetch(`/api/concepts/${id}`, { method: 'DELETE' });
      setConcepts((prev) => prev.filter((c) => c.id !== id));
      setRelationships((prev) =>
        prev.filter((r) => r.source_concept_id !== id && r.target_concept_id !== id)
      );
      if (selectedConcept?.id === id) {
        setSelectedConcept(null);
      }
      if (user) {
        deleteConceptFromFirestore(user.uid, id);
      }
    } catch (err) {
      console.error('Failed to delete concept:', err);
    }
  };

  // Add relationship from connecting handles
  const handleAddRelationship = async (relData: {
    source_concept_id: string;
    target_concept_id: string;
    relationship_type: RelationshipType;
    label: string;
  }) => {
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relData),
      });
      if (res.ok) {
        const newRel = await res.json();
        setRelationships((prev) => {
          const filtered = prev.filter((r) => r.id !== newRel.id);
          return [...filtered, newRel];
        });
        if (user) {
          saveRelationshipToFirestore(user.uid, newRel);
        }
      }
    } catch (err) {
      console.error('Failed to add relationship:', err);
    }
  };

  const handleInputSuccess = (_data: ProcessInputResponse) => {
    loadGraph();
  };

  const handleStartFeynman = (concept: Concept) => {
    setFeynmanTargetConcept(concept);
    setIsFeynmanModalOpen(true);
  };

  // Reset to seed data
  const handleResetSeed = async () => {
    if (
      confirm(
        'Reset knowledge graph to sample distributed systems & engineering sketch notes?'
      )
    ) {
      try {
        setIsLoading(true);
        const res = await fetch('/api/reset-seed', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setConcepts(data.data.concepts);
          setRelationships(data.data.concept_relationships);
          setColdConcepts(
            data.data.concepts.filter((c: Concept) => c.mastery_score <= 2)
          );
          setLearningStates(data.data.learning_states);
          setSessions(data.data.study_sessions);
          setSelectedConcept(null);
        }
      } catch (err) {
        console.error('Failed to reset seed:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const primaryColdNode = coldConcepts[0];

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#F5ECE2] dark:bg-[#16100C] text-[#2C1E16] dark:text-[#EFE5D9] overflow-hidden font-sans transition-colors duration-200">
      {/* Top Navigation Bar with Theme Switcher */}
      <HeaderNavbar
        concepts={concepts}
        coldConcepts={coldConcepts}
        onOpenInputModal={() => setIsInputModalOpen(true)}
        onOpenFeynmanModal={() => {
          setFeynmanTargetConcept(null);
          setIsFeynmanModalOpen(true);
        }}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
        onResetSeed={handleResetSeed}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
      />

      {/* Main Canvas Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#F5ECE2] dark:bg-[#16100C]">
            <Loader2 className="w-8 h-8 text-[#7F5539] dark:text-[#E0A878] animate-spin" />
            <p className="text-xs font-sketch text-[#8C6D53] dark:text-[#CBB6A1]">
              Opening sketch note journal...
            </p>
          </div>
        ) : (
          <CanvasGraph
            concepts={concepts}
            relationships={relationships}
            onSelectConcept={(concept) => setSelectedConcept(concept)}
            onQuickFeynman={handleStartFeynman}
            onUpdatePosition={handleUpdatePosition}
            onAddRelationship={handleAddRelationship}
            selectedConceptId={selectedConcept?.id}
            theme={theme}
          />
        )}

        {/* Floating Context-Resumption Cold Node Alert Toast (Sketch Card style) */}
        {!dismissWarmupToast && primaryColdNode && !isFeynmanModalOpen && (
          <div className="absolute bottom-6 right-6 z-20 max-w-sm bg-[#FAF5EE]/95 dark:bg-[#1E1611]/95 backdrop-blur-md border border-[#C8B69F] dark:border-[#473527] p-4 rounded-xl shadow-xl animate-in slide-in-from-bottom duration-300 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] dark:bg-[#431407] border border-[#FDBA74] dark:border-[#991B1B] flex items-center justify-center text-[#C2410C] shrink-0">
              <Flame className="w-5 h-5" />
            </div>

            <div className="space-y-1 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-sketch font-bold text-[#9A3412] dark:text-[#FCA5A5]">
                  Feynman Warm-Up Ready
                </span>
                <button
                  type="button"
                  onClick={() => setDismissWarmupToast(true)}
                  className="text-[#8C6D53] dark:text-[#A7927F] hover:text-[#2C1E16] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[#5D4636] dark:text-[#C5B3A1] text-[11px] leading-relaxed">
                <strong className="font-sketch text-[#2C1E16] dark:text-[#F3E9DD]">&ldquo;{primaryColdNode.title}&rdquo;</strong> is cold (Mastery {primaryColdNode.mastery_score}/5). Break the forgetting loop before resuming.
              </p>
              <div className="pt-1.5 flex items-center gap-2 font-sketch font-bold">
                <button
                  type="button"
                  onClick={() => handleStartFeynman(primaryColdNode)}
                  className="px-3 py-1 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[11px] shadow-xs flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  Drill Now
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConcept(primaryColdNode)}
                  className="px-2.5 py-1 rounded-lg bg-[#EFE3D5] dark:bg-[#2C211A] text-[#5D4636] dark:text-[#D1BEAB] text-[11px] hover:text-[#2C1E16] transition-all"
                >
                  Inspect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Brain Dump & Voice Memo Drawer */}
        <InputDrawer
          userId={user?.uid || 'usr_jobseeker_demo'}
          onProcessed={loadGraph}
          onOpenFullModal={() => setIsInputModalOpen(true)}
        />
      </main>

      {/* Slide-over Inspector for Selected Concept */}
      <ConceptSlideOver
        concept={selectedConcept}
        onClose={() => setSelectedConcept(null)}
        onUpdateConcept={handleUpdateConcept}
        onDeleteConcept={handleDeleteConcept}
        onStartFeynman={handleStartFeynman}
        allConcepts={concepts}
        relationships={relationships}
      />

      {/* Hybrid Ingestion Modal (Voice + Text/Code) */}
      <InputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        onSuccess={handleInputSuccess}
      />

      {/* Daily Feynman Warm-Up Active Recall Modal */}
      <FeynmanWarmupModal
        isOpen={isFeynmanModalOpen}
        onClose={() => {
          setIsFeynmanModalOpen(false);
          setFeynmanTargetConcept(null);
        }}
        coldConcepts={coldConcepts}
        targetConcept={feynmanTargetConcept}
        onConceptUpdated={(updated) => {
          setConcepts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          if (selectedConcept?.id === updated.id) {
            setSelectedConcept(updated);
          }
          loadGraph();
        }}
      />

      {/* Learning States Audit History Modal */}
      <LearningAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        learningStates={learningStates}
        sessions={sessions}
      />

      {/* Info / About Modal */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      {/* Gemini 3.8 Live Voice Coach Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        activeConceptTitle={selectedConcept?.title || primaryColdNode?.title}
      />
    </div>
  );
}
