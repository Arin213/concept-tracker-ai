import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Concept, ConceptRelationship, LearningState, StudySession } from '../types.js';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// -------------------------------------------------------------
// Firestore Persistence Helpers
// -------------------------------------------------------------

export async function loadUserDataFromFirestore(userId: string): Promise<{
  concepts: Concept[];
  relationships: ConceptRelationship[];
  learningStates: LearningState[];
  sessions: StudySession[];
} | null> {
  try {
    const conceptsRef = collection(firestore, `users/${userId}/concepts`);
    const relsRef = collection(firestore, `users/${userId}/relationships`);
    const statesRef = collection(firestore, `users/${userId}/learning_states`);
    const sessionsRef = collection(firestore, `users/${userId}/study_sessions`);

    const [cSnap, rSnap, sSnap, sesSnap] = await Promise.all([
      getDocs(conceptsRef),
      getDocs(relsRef),
      getDocs(statesRef),
      getDocs(sessionsRef)
    ]);

    if (cSnap.empty && rSnap.empty && sSnap.empty && sesSnap.empty) {
      return null;
    }

    const concepts = cSnap.docs.map(d => d.data() as Concept);
    const relationships = rSnap.docs.map(d => d.data() as ConceptRelationship);
    const learningStates = sSnap.docs.map(d => d.data() as LearningState);
    const sessions = sesSnap.docs.map(d => d.data() as StudySession);

    return {
      concepts,
      relationships,
      learningStates,
      sessions
    };
  } catch (err) {
    console.warn('Failed to load user data from Firestore:', err);
    return null;
  }
}

export async function saveConceptToFirestore(userId: string, concept: Concept): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/concepts/${concept.id}`);
    await setDoc(ref, concept, { merge: true });
  } catch (err) {
    console.warn('Firestore concept save failed:', err);
  }
}

export async function updateConceptPositionInFirestore(userId: string, conceptId: string, x: number, y: number): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/concepts/${conceptId}`);
    await updateDoc(ref, { position_x: x, position_y: y, updated_at: new Date().toISOString() });
  } catch (err) {
    console.warn('Firestore position update failed:', err);
  }
}

export async function deleteConceptFromFirestore(userId: string, conceptId: string): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/concepts/${conceptId}`);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore concept delete failed:', err);
  }
}

export async function saveRelationshipToFirestore(userId: string, rel: ConceptRelationship): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/relationships/${rel.id}`);
    await setDoc(ref, rel, { merge: true });
  } catch (err) {
    console.warn('Firestore relationship save failed:', err);
  }
}

export async function deleteRelationshipFromFirestore(userId: string, relId: string): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/relationships/${relId}`);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore relationship delete failed:', err);
  }
}

export async function saveLearningStateToFirestore(userId: string, state: LearningState): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/learning_states/${state.id}`);
    await setDoc(ref, state, { merge: true });
  } catch (err) {
    console.warn('Firestore learning state save failed:', err);
  }
}

export async function saveSessionToFirestore(userId: string, session: StudySession): Promise<void> {
  try {
    const ref = doc(firestore, `users/${userId}/study_sessions/${session.id}`);
    await setDoc(ref, session, { merge: true });
  } catch (err) {
    console.warn('Firestore session save failed:', err);
  }
}

export async function backupAllToFirestore(
  userId: string,
  data: {
    concepts: Concept[];
    relationships: ConceptRelationship[];
    learningStates: LearningState[];
    sessions: StudySession[];
  }
): Promise<void> {
  try {
    await Promise.all([
      ...data.concepts.map(c => saveConceptToFirestore(userId, c)),
      ...data.relationships.map(r => saveRelationshipToFirestore(userId, r)),
      ...data.learningStates.map(s => saveLearningStateToFirestore(userId, s)),
      ...data.sessions.map(ses => saveSessionToFirestore(userId, ses))
    ]);
  } catch (err) {
    console.warn('Backup to Firestore failed:', err);
  }
}
