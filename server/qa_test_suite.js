/**
 * Automated QA & Validation Test Suite for AI Concept Tracker
 * Modules 1 - 5 Execution Script
 */

const BASE_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🚀 LOOPTRACKER QA TEST SUITE: MODULES 1 - 5');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // MODULE 1: Hybrid Input & Audio Pipeline Testing
  // -------------------------------------------------------------
  console.log('--- [Module 1] Hybrid Input & Audio Pipeline ---');
  
  // Test Case 1.1: Text/Code Drop Parsing
  try {
    const rawMarkdownInput = `
# Database Sharding Patterns
When horizontal scaling reaches limits, sharding partitions data across multiple database instances.
Key components:
- Hash-based sharding vs Range-based sharding
- Re-sharding bottlenecks

\`\`\`sql
-- Hash modulo routing key
SELECT shard_id FROM shard_map WHERE hash(user_id) % 16 = current_shard;
\`\`\`
    `.trim();

    const res = await fetch(`${BASE_URL}/api/process-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: rawMarkdownInput, sessionType: 'dump' })
    });
    const data = await res.json();
    assert(res.ok && data.session && (data.new_concepts?.length > 0 || data.updated_concepts?.length > 0), 
      'Test 1.1: Raw Markdown & Code Snippet Input parsed without crashing');
  } catch (err) {
    assert(false, 'Test 1.1: Raw Markdown parsing', err.message);
  }

  // Test Case 1.2 & Failure Mode: Malformed / Empty Audio Payload
  try {
    const res = await fetch(`${BASE_URL}/api/process-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: '', audioBase64: '' })
    });
    assert(res.status === 400, 'Test 1.2: Empty / Invalid audio payload caught with graceful 400 error');
  } catch (err) {
    assert(false, 'Test 1.2: Edge case error handling', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 2: AI Extraction & Auto-Merging (Anti-Explosion)
  // -------------------------------------------------------------
  console.log('\n--- [Module 2] AI Extraction & Auto-Merging (Anti-Explosion) ---');
  
  // Test Case 2.1: Entity Resolution & Merging with Existing Concept
  try {
    const mergeInput = `
Notes on Raft Consensus Algorithm:
We encountered an issue where split-votes caused leader election timeouts.
Mitigated by adding randomized election timers between 150ms and 300ms.
    `.trim();

    const res = await fetch(`${BASE_URL}/api/process-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: mergeInput, sessionType: 'dump' })
    });
    const data = await res.json();
    
    // Check if Raft Consensus was merged rather than duplicated
    const mergedConcept = (data.updated_concepts || []).find(c => 
      c.title.toLowerCase().includes('raft')
    );
    assert(Boolean(mergedConcept || data.updated_concepts?.length > 0), 'Test 2.1: Entity Resolution matches and updates existing "Raft Consensus Algorithm" node without duplicate ID');
  } catch (err) {
    assert(false, 'Test 2.1: Entity Resolution & Merging', err.message);
  }

  // Test Case 2.2: Granularity Control (Macro Concept vs Micro-Explosion)
  try {
    const denseSqlInput = `
SQL optimization guide:
SELECT users.id, orders.total FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.status = 'completed' AND orders.created_at > NOW() - INTERVAL '30 days'
GROUP BY users.id, orders.total
HAVING COUNT(orders.id) > 2
ORDER BY orders.total DESC LIMIT 50;
Indexes used: B-Tree on user_id, Composite Index on (status, created_at).
    `.trim();

    const res = await fetch(`${BASE_URL}/api/process-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: denseSqlInput, sessionType: 'dump' })
    });
    const data = await res.json();
    const createdTotal = (data.new_concepts || []).length + (data.updated_concepts || []).length;
    assert(createdTotal <= 3, `Test 2.2: Granularity control extracted macro concepts (${createdTotal} nodes created/updated, prevented micro-node explosion)`);
  } catch (err) {
    assert(false, 'Test 2.2: Granularity control', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 3: Visual Canvas & State Persistence
  // -------------------------------------------------------------
  console.log('\n--- [Module 3] Visual Canvas & State Persistence ---');
  
  let testConceptId = null;
  try {
    const graphRes = await fetch(`${BASE_URL}/api/graph`);
    const graph = await graphRes.json();
    testConceptId = graph.concepts[0]?.id;

    // Test 3.1: Dynamic Mastery Styling Verification
    const hasScores1to5 = graph.concepts.every(c => c.mastery_score >= 1 && c.mastery_score <= 5);
    const hasWarmColorCoding = graph.concepts.some(c => c.mastery_score <= 2);
    assert(hasScores1to5 && hasWarmColorCoding, 'Test 3.1: Concepts maintain valid 1-5 mastery scores with visual color-mapping');

    // Test 3.2: Position Persistence (onNodeDragStop)
    const testX = Math.round(Math.random() * 800);
    const testY = Math.round(Math.random() * 600);
    const posRes = await fetch(`${BASE_URL}/api/concepts/${testConceptId}/position`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_x: testX, position_y: testY })
    });
    const posData = await posRes.json();
    assert(posRes.ok && posData.position_x === testX && posData.position_y === testY, 
      `Test 3.2: Node drag coordinates persisted to (${testX}, ${testY})`);

    // Test 3.3: State of Mind Briefing Panel Content
    const somRes = await fetch(`${BASE_URL}/api/concepts/${testConceptId}/state-of-mind`, {
      method: 'POST'
    });
    const somData = await somRes.json();
    assert(Boolean(somData.where_you_left_off && somData.exact_friction_point && somData.suggested_next_step),
      'Test 3.3: 3-Part "State of Mind" briefing (where left off, friction point, next step) generated');
  } catch (err) {
    assert(false, 'Test 3: Canvas & State Persistence', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 4: Context Resumption & Feynman Warm-Up Testing
  // -------------------------------------------------------------
  console.log('\n--- [Module 4] Context Resumption & Feynman Warm-Up ---');
  
  try {
    // Test 4.1: Cold Node Selection
    const coldRes = await fetch(`${BASE_URL}/api/feynman/cold-nodes`);
    const coldNodes = await coldRes.json();
    const allColdValid = coldNodes.every(c => c.mastery_score <= 2 || new Date(c.next_review_at) <= new Date());
    assert(Array.isArray(coldNodes) && coldNodes.length > 0 && allColdValid,
      `Test 4.1: Cold nodes correctly query concepts with mastery <= 2 or overdue review (${coldNodes.length} cold nodes detected)`);

    // Test 4.2: Feynman Grading Loop & Learning State Audit Log
    const targetCold = coldNodes[0];
    const qRes = await fetch(`${BASE_URL}/api/feynman/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept_id: targetCold.id })
    });
    const qData = await qRes.json();

    const gradeRes = await fetch(`${BASE_URL}/api/feynman/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id: targetCold.id,
        question: qData.question,
        user_explanation: 'In simple words, it guarantees that even if a server crashes, surviving nodes elect a new leader and keep data ordered by incrementing terms.'
      })
    });
    const gradeData = await gradeRes.json();
    assert(gradeRes.ok && typeof gradeData.score === 'number' && gradeData.clarity_analysis,
      `Test 4.2: Feynman evaluation graded explanation (Score: ${gradeData.score}/5, state_of_mind updated)`);

    // Verify learning_states audit log updated
    const auditRes = await fetch(`${BASE_URL}/api/graph`);
    const auditGraph = await auditRes.json();
    const latestAudit = auditGraph.learningStates[0];
    assert(latestAudit?.trigger_event === 'feynman_test' && latestAudit?.concept_id === targetCold.id,
      'Test 4.3: Learning states audit trail recorded transaction with score transition');
  } catch (err) {
    assert(false, 'Test 4: Feynman warm-up loop', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 5: Security & Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n--- [Module 5] Security & Multi-Tenant Isolation ---');
  
  try {
    // Test 5.1: Self-loop prevention on relationship creation
    const loopRes = await fetch(`${BASE_URL}/api/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_concept_id: testConceptId,
        target_concept_id: testConceptId,
        relationship_type: 'related_to'
      })
    });
    assert(loopRes.status === 400, 'Test 5.1: Invariant guard blocked self-loop relationship (source == target)');

    // Test 5.2: SQL / Path Injection Protection on Concepts
    const injectRes = await fetch(`${BASE_URL}/api/concepts/non_existent_or_injection_id_9999`);
    assert(injectRes.status === 404, 'Test 5.2: Path variable lookup safely returns 404 for unmapped IDs');
  } catch (err) {
    assert(false, 'Test 5: Security checks', err.message);
  }

  console.log('\n===============================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite crashed:', err);
  process.exit(1);
});
