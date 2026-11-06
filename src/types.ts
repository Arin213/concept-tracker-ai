export type MasteryScore = 1 | 2 | 3 | 4 | 5;

export type RelationshipType = 'prerequisite_of' | 'part_of' | 'related_to' | 'derived_from';

export interface Concept {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  raw_notes: string;
  mastery_score: MasteryScore;
  position_x: number;
  position_y: number;
  color_code?: string;
  last_friction_point: string;
  suggested_next_step?: string;
  next_review_at: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface ConceptRelationship {
  id: string;
  user_id: string;
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: RelationshipType;
  label: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  session_type: 'dump' | 'review' | 'feynman_test';
  raw_session_input: string;
  ai_summary: string;
  duration_minutes: number;
  started_at: string;
  ended_at: string;
}

export interface SessionConcept {
  session_id: string;
  concept_id: string;
  notes_added: string;
}

export interface LearningState {
  id: string;
  concept_id: string;
  concept_title?: string;
  previous_score: number;
  new_score: number;
  trigger_event: 'feynman_test' | 'session_dump' | 'manual_adjustment' | 'review';
  recorded_at: string;
  feedback_notes?: string;
}

export interface FeynmanQuestion {
  concept_id: string;
  concept_title: string;
  question: string;
  prompt_focus: string;
  suggested_key_points: string[];
}

export interface FeynmanGradeResult {
  score: MasteryScore;
  clarity_analysis: string;
  jargon_detected: string[];
  missing_pieces: string[];
  strengths: string[];
  state_of_mind_update: {
    last_friction_point: string;
    suggested_next_step: string;
  };
}

export interface StateOfMindBriefing {
  where_you_left_off: string;
  exact_friction_point: string;
  suggested_next_step: string;
  related_concepts: string[];
  confidence_rating: string;
}

export interface ProcessInputResponse {
  session: StudySession;
  updated_concepts: Concept[];
  new_concepts: Concept[];
  relationships: ConceptRelationship[];
  ai_notes: string;
  transcription?: string;
}
