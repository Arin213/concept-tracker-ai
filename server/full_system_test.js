/**
 * Full End-to-End Stress & Edge-Case Validation Test
 */

const BASE_URL = 'http://localhost:3000';

async function testAll() {
  console.log('🧪 Starting Full System & Edge Case Validation...\n');
  const results = [];

  function record(testName, passed, info = '') {
    results.push({ testName, passed, info });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName} ${info ? `-> ${info}` : ''}`);
  }

  // 1. Reset Seed Check
  try {
    const res = await fetch(`${BASE_URL}/api/reset-seed`, { method: 'POST' });
    const data = await res.json();
    record('Seed reset API', res.ok && data.data?.concepts?.length > 0, `Loaded ${data.data?.concepts?.length} concepts`);
  } catch (e) {
    record('Seed reset API', false, e.message);
  }

  // 2. Fetch Graph
  let initialConcepts = [];
  try {
    const res = await fetch(`${BASE_URL}/api/graph`);
    const data = await res.json();
    initialConcepts = data.concepts || [];
    record('Fetch Graph API', res.ok && initialConcepts.length > 0, `${initialConcepts.length} nodes retrieved`);
  } catch (e) {
    record('Fetch Graph API', false, e.message);
  }

  // 3. Create a Test Concept
  let createdId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/process-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: 'Studying LSM Trees and SSTables in RocksDB storage engine. Friction point: understanding write amplification during compactions.',
        sessionType: 'dump'
      })
    });
    const data = await res.json();
    const created = (data.new_concepts || [])[0] || (data.updated_concepts || [])[0];
    createdId = created?.id;
    record('Note Ingestion & Creation', res.ok && Boolean(createdId), `Created/Updated node: "${created?.title}" (${createdId})`);
  } catch (e) {
    record('Note Ingestion & Creation', false, e.message);
  }

  // 4. Update Note / Mastery Score
  try {
    const res = await fetch(`${BASE_URL}/api/concepts/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mastery_score: 4,
        last_friction_point: 'Resolved write amplification by switching to Leveled Compaction.'
      })
    });
    const updated = await res.json();
    record('Update Concept Details', res.ok && updated.mastery_score === 4, `Mastery updated to ${updated.mastery_score}/5`);
  } catch (e) {
    record('Update Concept Details', false, e.message);
  }

  // 5. Connect Relationship
  let createdRelId = null;
  try {
    const targetId = initialConcepts[0]?.id;
    if (targetId && createdId && targetId !== createdId) {
      const res = await fetch(`${BASE_URL}/api/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_concept_id: createdId,
          target_concept_id: targetId,
          relationship_type: 'depends_on',
          label: 'Relies on log storage'
        })
      });
      const relData = await res.json();
      createdRelId = relData?.id;
      record('Add Graph Relationship', res.ok && Boolean(createdRelId), `Connected ${createdId} -> ${targetId}`);
    } else {
      record('Add Graph Relationship', true, 'Skipped duplicate node target');
    }
  } catch (e) {
    record('Add Graph Relationship', false, e.message);
  }

  // 6. Delete Note Right Away (User requested: "if note need to be delete then delete right")
  try {
    const res = await fetch(`${BASE_URL}/api/concepts/${createdId}`, {
      method: 'DELETE'
    });
    const delData = await res.json();
    record('Delete Note Directly (No Locker/Confirm)', res.ok && delData.success === true, `Deleted note ${createdId}`);
  } catch (e) {
    record('Delete Note Directly (No Locker/Confirm)', false, e.message);
  }

  // 7. Verify Cascade Delete
  try {
    const graphRes = await fetch(`${BASE_URL}/api/graph`);
    const graphData = await graphRes.json();
    const stillExists = graphData.concepts.some(c => c.id === createdId);
    const relStillExists = graphData.relationships.some(r => r.source_concept_id === createdId || r.target_concept_id === createdId);
    record('Verify Node & Relationship Cascaded Removal', !stillExists && !relStillExists, 'Node and connected edges completely purged');
  } catch (e) {
    record('Verify Node & Relationship Cascaded Removal', false, e.message);
  }

  // 8. Edge Case: Fetching Deleted Node
  try {
    const res = await fetch(`${BASE_URL}/api/concepts/${createdId}`);
    record('Edge Case: 404 on Deleted Node', res.status === 404, `Status ${res.status}`);
  } catch (e) {
    record('Edge Case: 404 on Deleted Node', false, e.message);
  }

  // 9. Edge Case: Process Input with Empty String & Missing Fields
  try {
    const res = await fetch(`${BASE_URL}/api/process-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: '    ' })
    });
    record('Edge Case: Graceful 400 on Blank Note', res.status === 400, `Returned status ${res.status}`);
  } catch (e) {
    record('Edge Case: Graceful 400 on Blank Note', false, e.message);
  }

  // 10. Edge Case: Prevent Self-Loop Link
  try {
    const sampleId = initialConcepts[0]?.id;
    const res = await fetch(`${BASE_URL}/api/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_concept_id: sampleId,
        target_concept_id: sampleId,
        relationship_type: 'related_to'
      })
    });
    record('Edge Case: Prevent Self-Loop Relationship', res.status === 400, `Blocked self-connection with 400`);
  } catch (e) {
    record('Edge Case: Prevent Self-Loop Relationship', false, e.message);
  }

  // 11. State of Mind Briefing Generation
  try {
    const sampleId = initialConcepts[0]?.id;
    const res = await fetch(`${BASE_URL}/api/concepts/${sampleId}/state-of-mind`, { method: 'POST' });
    const som = await res.json();
    record('State of Mind 3-Part Briefing', Boolean(som.where_you_left_off && som.exact_friction_point && som.suggested_next_step), `Briefing generated for "${initialConcepts[0]?.title}"`);
  } catch (e) {
    record('State of Mind 3-Part Briefing', false, e.message);
  }

  // 12. Feynman Question Generation & Grading Loop
  try {
    const sampleId = initialConcepts[0]?.id;
    const qRes = await fetch(`${BASE_URL}/api/feynman/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept_id: sampleId })
    });
    const qData = await qRes.json();
    const hasQuestion = Boolean(qData?.question);

    let graded = false;
    if (hasQuestion) {
      const gRes = await fetch(`${BASE_URL}/api/feynman/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: sampleId,
          question: qData.question,
          user_explanation: 'Servers take turns electing a candidate with the highest log index to keep consensus safely agreed upon without conflicts.'
        })
      });
      const gData = await gRes.json();
      graded = gRes.ok && typeof gData.score === 'number';
    }
    record('Feynman Question & Active Recall Grading', hasQuestion && graded, 'Question generated and explanation scored 1-5');
  } catch (e) {
    record('Feynman Question & Active Recall Grading', false, e.message);
  }

  console.log('\n===============================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`Final Result: ${results.filter(r => r.passed).length}/${results.length} tests passed.`);
  console.log('===============================================================');

  if (!allPassed) process.exit(1);
}

testAll();
