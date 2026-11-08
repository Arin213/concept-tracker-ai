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
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authNotification, setAuthNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

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

  // Reactive safeguard: auto-dismiss slide-over if the active concept is deleted
  useEffect(() => {
    if (selectedConcept && !concepts.some((c) => c.id === selectedConcept.id)) {
      setSelectedConcept(null);
    }
  }, [concepts, selectedConcept]);

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
    setIsAuthLoading(true);
    setAuthNotification(null);
    try {
      const signedInUser = await signInWithGoogle();
      setAuthNotification({
        type: 'success',
        message: `Welcome, ${signedInUser.displayName || signedInUser.email}! Your knowledge graph is now securely synchronized with Google Cloud Firestore.`
      });
      setTimeout(() => setAuthNotification(null), 5000);
    } catch (err: any) {
      console.error('Google Sign-In notice:', err);
      let message = 'Sign-in failed. Please try again.';
      if (err?.code === 'auth/popup-blocked') {
        message = 'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        message = 'The sign-in popup was closed before completion.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        message = 'A sign-in window is already active.';
      } else if (err?.code === 'auth/unauthorized-domain') {
        message = 'This domain is not yet listed in Firebase Auth authorized domains.';
      } else if (err?.message) {
        message = err.message;
      }
      setAuthNotification({
        type: 'error',
        message
      });
      setTimeout(() => setAuthNotification(null), 8000);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await signOutUser();
      setAuthNotification({
        type: 'info',
        message: 'Signed out successfully. Concepts are currently saved locally.'
      });
      setTimeout(() => setAuthNotification(null), 4000);
    } catch (err) {
      console.error('Sign-Out error:', err);
    } finally {
      setIsAuthLoading(false);
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
  };

  const primaryColdNode = coldConcepts[0];

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#ECEFF1] dark:bg-[#0B0F19] text-[#2E4053] dark:text-[#E2E8F0] overflow-hidden font-sans transition-colors duration-200">
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
        isAuthLoading={isAuthLoading}
      />

      {/* Auth Notification Toast Banner */}
      {authNotification && (
        <div
          className={`px-3 sm:px-4 py-2 border-b text-xs font-mono flex items-center justify-between z-40 transition-all ${
            authNotification.type === 'error'
              ? 'bg-[#C0392B]/15 border-[#C0392B]/30 text-[#C0392B] dark:text-[#EF4444]'
              : authNotification.type === 'success'
              ? 'bg-[#27AE60]/15 border-[#27AE60]/30 text-[#27AE60] dark:text-[#10B981]'
              : 'bg-[#4A6572]/15 border-[#4A6572]/30 text-[#4A6572] dark:text-[#94A3B8]'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold shrink-0">
              {authNotification.type === 'error' ? 'Auth Notice:' : authNotification.type === 'success' ? 'Cloud Sync:' : 'Notice:'}
            </span>
            <span className="truncate">{authNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthNotification(null)}
            className="p-1 hover:opacity-75 cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Canvas Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#ECEFF1] dark:bg-[#0B0F19]">
            <Loader2 className="w-7 h-7 text-[#4A6572] dark:text-[#94A3B8] animate-spin" />
            <p className="text-xs font-mono text-[#546E7A] dark:text-[#94A3B8]">
              Loading concept graph...
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

        {/* Floating Context-Resumption Cold Node Alert Toast (Strict 1px Flat Border, Zero Shadow) */}
        {!dismissWarmupToast && primaryColdNode && !isFeynmanModalOpen && (
          <div className="absolute bottom-4 right-14 sm:bottom-4 sm:right-16 z-20 max-w-[calc(100vw-5rem)] sm:max-w-xs md:max-w-sm bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/30 dark:border-[#2E3F59] p-2.5 sm:p-3 rounded-md animate-in fade-in duration-200 flex items-start gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 h-8 rounded border border-[#C0392B]/40 bg-[#ECEFF1] dark:bg-[#0B0F19] flex items-center justify-center text-[#C0392B] dark:text-[#EF4444] shrink-0">
              <Flame className="w-3.5 h-3.5 sm:w-4 h-4" />
            </div>

            <div className="space-y-1 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#C0392B] dark:text-[#EF4444] text-[11px] sm:text-xs">
                  Feynman Warm-Up Ready
                </span>
                <button
                  type="button"
                  onClick={() => setDismissWarmupToast(true)}
                  className="text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[#546E7A] dark:text-[#94A3B8] text-[10px] sm:text-[11px] leading-relaxed line-clamp-2">
                <strong className="text-[#2E4053] dark:text-[#E2E8F0]">&ldquo;{primaryColdNode.title}&rdquo;</strong> is cold ({primaryColdNode.mastery_score}/5). Break the forgetting loop.
              </p>
              <div className="pt-0.5 sm:pt-1 flex items-center gap-1.5 sm:gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => handleStartFeynman(primaryColdNode)}
                  className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-[#C0392B] bg-[#C0392B] hover:bg-[#A93226] text-white text-[10px] sm:text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Drill
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConcept(primaryColdNode)}
                  className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[#2E4053] dark:text-[#E2E8F0] text-[10px] sm:text-[11px] hover:border-[#4A6572] transition-colors cursor-pointer"
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
