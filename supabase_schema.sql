-- ====================================================================
-- LoopTracker - AI-Powered Visual Concept & Learning Loop Tracker
-- PostgreSQL Schema for Supabase with RLS (Row-Level Security)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Concepts Table
CREATE TABLE IF NOT EXISTS concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    raw_notes TEXT,
    mastery_score INT DEFAULT 1 CHECK (mastery_score BETWEEN 1 AND 5),
    position_x FLOAT DEFAULT 0.0,
    position_y FLOAT DEFAULT 0.0,
    color_code VARCHAR(7) DEFAULT '#FF5733',
    last_friction_point TEXT,
    next_review_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Concept Relationships Table
CREATE TABLE IF NOT EXISTS concept_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    target_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'related_to',
    label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_concept_edge UNIQUE (source_concept_id, target_concept_id),
    CONSTRAINT prevent_self_loop CHECK (source_concept_id <> target_concept_id)
);

-- 4. Study Sessions Table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'dump' CHECK (session_type IN ('dump', 'review', 'feynman_test')),
    raw_session_input TEXT,
    ai_summary TEXT,
    duration_minutes INT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 5. Session Concepts Junction Table
CREATE TABLE IF NOT EXISTS session_concepts (
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    notes_added TEXT,
    PRIMARY KEY (session_id, concept_id)
);

-- 6. Learning States Audit Log
CREATE TABLE IF NOT EXISTS learning_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    previous_score INT CHECK (previous_score BETWEEN 1 AND 5),
    new_score INT NOT NULL CHECK (new_score BETWEEN 1 AND 5),
    trigger_event VARCHAR(50) DEFAULT 'user_update',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_states ENABLE ROW LEVEL SECURITY;

-- Concepts RLS
CREATE POLICY "Users can only read own concepts"
    ON concepts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own concepts"
    ON concepts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own concepts"
    ON concepts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own concepts"
    ON concepts FOR DELETE
    USING (auth.uid() = user_id);

-- Concept Relationships RLS
CREATE POLICY "Users can only read own concept relationships"
    ON concept_relationships FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own concept relationships"
    ON concept_relationships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete own concept relationships"
    ON concept_relationships FOR DELETE
    USING (auth.uid() = user_id);

-- Study Sessions RLS
CREATE POLICY "Users can only read own study sessions"
    ON study_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own study sessions"
    ON study_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
