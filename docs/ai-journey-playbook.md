# AI Journey Playbook: Building Your Intent Model

A complete walkthrough showing the actual AI-assisted journey from blank canvas to finished penetration testing model.

---

## What This Playbook Shows

This document demonstrates the **actual workflow** of building an intent model through conversational AI. You'll see:

- The step-by-step conversation flow
- What the AI generates at each step
- How to review and approve changes
- The iterative refinement process ("vibing")
- How the model builds incrementally

**Time to complete**: 15-30 minutes for a basic model

---

## Starting Point: Empty Canvas

Your model starts empty:

```typescript
{
  meta: { version: '0.1.0', project: 'Adapt Canvas', status: 'draft' },
  actors: [],
  entities: [],
  journeys: [],
  businessRules: [],
  constraints: [],
  openQuestions: []
}
```

**Goal**: Build a complete penetration testing engagement model for a financial services web application.

---

## The Journey

### Step 1: Open AI Chat Panel

**Action**: Click the chat icon (bottom-right) or press `/`

**What you see**: 
- AI chat interface opens
- Empty conversation
- Model is empty (all sections show 0 items)

---

### Step 2: Start with the Big Picture

**You say**:
```
I'm planning a penetration test for a financial services web application.
The client is a regional bank with online banking and mobile app.
I need to structure the engagement scope.
```

**AI responds**:
```
I'll help you structure this engagement. Let's start by defining the key 
actors involved in this financial services penetration test.

I'll add:
- Red Team (offensive testing)
- Client (the regional bank)
- Blue Team (monitoring/defensive)
- Project Manager (coordination)

Would you like me to add these actors?
```

**What happens**:
- AI proposes additions (doesn't change anything yet)
- You see a **Diff Preview** showing what would be added
- "Approve" and "Reject" buttons appear

**You do**: Click **Approve**

**Result**: 
- Model now has 4 actors
- Version 0.1.1 created
- You can see the actors in the sidebar

---

### Step 3: Refine an Actor

**You say**:
```
The Red Team needs more specific responsibilities. 
Add web application testing, API security testing, and authentication bypass testing.
```

**AI responds** with diff showing:
```diff
  actors: [
    {
      id: 'redteam',
      name: 'Red Team',
-     responsibilities: ['Offensive security testing']
+     responsibilities: [
+       'Web application penetration testing',
+       'API security assessment',
+       'Authentication and authorization testing',
+       'Session management testing',
+       'Input validation and injection attacks'
+     ]
    }
  ]
```

**You do**: Click **Approve**

**Result**: Red Team actor updated with detailed responsibilities

---

### Step 4: Add Entities

**You say**:
```
Create entities for what we'll be testing and tracking:
- Web Application (the target)
- API Endpoint (for API testing)
- Vulnerability (for discovered issues)
- Finding (for pentest results)
```

**AI responds** with diff showing 4 new entities, each with relevant fields:

```typescript
entities: [
  {
    id: 'webapp',
    name: 'Web Application',
    fields: [
      { name: 'url', type: 'string' },
      { name: 'technology_stack', type: 'string' },
      { name: 'authentication_type', type: 'string' },
      { name: 'test_status', type: 'enum', values: ['pending', 'in_progress', 'completed'] }
    ]
  },
  // ... 3 more entities
]
```

**You do**: Click **Approve**

**Result**: 4 entities added, ready to use in journeys

---

### Step 5: Build Journey (The "Vibing" Starts Here)

**You say**:
```
Add a reconnaissance journey for the web app testing
```

**AI responds** with a basic journey:
```typescript
{
  id: 'web-recon',
  name: 'Web Application Reconnaissance',
  steps: [
    { name: 'Crawl application', actors: ['redteam'] },
    { name: 'Identify technology stack', actors: ['redteam'] },
    { name: 'Map attack surface', actors: ['redteam'] }
  ]
}
```

**You review and think**: "This is too basic. I want more detail."

**You say**:
```
Add more steps to the reconnaissance journey:
- Subdomain enumeration
- Directory brute forcing  
- JavaScript file analysis for API endpoints
- Identify sensitive information in page source
```

**AI responds** with updated journey showing the additional steps inserted in logical order.

**You do**: Click **Approve**

**This is the "vibing"**: You're iterating conversationally, adding detail as you think of it, not filling out a rigid form.

---

### Step 6: Add More Journeys

**You say**:
```
Add journeys for:
- Authentication testing (brute force, bypass, session management)
- Injection testing (SQL, XSS, command injection)
- API security testing
```

**AI responds** with 3 complete journeys with logical step sequences.

**You review the SQL injection journey**:
```typescript
{
  id: 'injection-testing',
  name: 'Injection Vulnerability Testing',
  steps: [
    { name: 'Identify input points', actors: ['redteam'] },
    { name: 'Test SQL injection', actors: ['redteam'] },
    { name: 'Test XSS attacks', actors: ['redteam'] },
    { name: 'Test command injection', actors: ['redteam'] },
    { name: 'Document successful exploits', actors: ['redteam'] }
  ]
}
```

**You think**: "This needs to connect to our entities"

**You say**:
```
Update the injection testing journey to reference the Vulnerability 
entity when issues are found, and create Finding entities for confirmed exploits.
```

**AI responds** with updated steps showing entity touchpoints:
```typescript
steps: [
  { 
    name: 'Identify input points',
    actors: ['redteam'],
    outputs: ['webapp']
  },
  { 
    name: 'Test SQL injection',
    actors: ['redteam'],
    inputs: ['webapp'],
    outputs: ['vulnerability']
  },
  // ... more steps with entity references
]
```

**You do**: Click **Approve**

---

### Step 7: Set Boundaries (Business Rules)

**You say**:
```
Add business rules for this engagement:
- All testing requires written authorization from client
- Testing only during business hours (Mon-Fri 8am-6pm EST)
- No testing on production payment processing systems
- Critical findings must be reported within 1 hour
```

**AI responds** with structured business rules:
```typescript
businessRules: [
  {
    id: 'br-001',
    rule: 'Testing Authorization',
    description: 'All penetration testing activities require explicit written authorization from the Client before proceeding.',
    rationale: 'Legal compliance and liability protection'
  },
  // ... 3 more rules
]
```

**You do**: Click **Approve**

---

### Step 8: Add Constraints

**You say**:
```
Add constraints:
- Production database servers are completely out of scope
- Maximum 50 requests per second to avoid overwhelming systems
- Social engineering requires separate approval
- All testing from approved IP ranges only
```

**AI responds** with constraint entities.

**You do**: Click **Approve**

---

### Step 9: Catch Missing Pieces

**You look at the model and notice**: "We never defined what the Client actor actually does"

**You say**:
```
Update the Client actor to add responsibilities:
- Provide scope documentation
- Grant system access and credentials
- Approve testing windows
- Review and acknowledge findings
- Provide technical point of contact
```

**AI responds** with updated Client actor.

**You do**: Click **Approve**

**This is more "vibing"**: You're building organically, noticing gaps, filling them in conversationally.

---

### Step 10: Add an Open Question

**You realize**: "We haven't decided on reporting format"

**You say**:
```
Add an open question: What format does the client want for the final report? 
PDF technical report, slides, or both?
```

**AI responds**:
```typescript
openQuestions: [
  {
    id: 'oq-001',
    question: 'Final Report Format',
    description: 'What format does the client want for the final report? PDF technical report, presentation slides, or both?',
    priority: 'high',
    blockedBy: 'Awaiting client preference'
  }
]
```

**You do**: Click **Approve**

---

### Step 11: Review the Complete Model

**You navigate through the app**:

- **Homepage** (`/`): Shows 4 actors, 4 entities, 5 journeys, 4 rules, 4 constraints, 1 open question
- **Actors page** (`/actors`): See all actors with full details
- **Explorer** (`/explorer`): 3D visualization of relationships
- **BRD** (`/brd`): Auto-generated documentation from your model

**Total time elapsed**: 20 minutes

**What you built**: A complete, structured penetration testing engagement model with:
- Clear roles and responsibilities
- Defined testing scope and methodology  
- Explicit boundaries and rules
- Tracking entities for results
- Open questions flagged

---

## The "Vibing" Process Explained

### What Makes This Different from Forms

**Traditional approach** (forms/spreadsheets):
1. Open blank Excel template
2. Fill in Actor #1 row by row
3. Fill in Actor #2 row by row
4. Switch to Entities sheet
5. Fill in Entity #1 row by row
6. Repeat for all sections
7. Try to keep cross-references consistent
8. Realize you forgot something, go back and insert rows
9. Break all your cross-references
10. Give up and just write prose in a Word doc

**Adapt Canvas AI approach** (conversational building):
1. Describe what you're doing (context setting)
2. AI suggests actors → you approve
3. "Oh, I need more detail on X" → AI refines → you approve
4. Add entities you'll track
5. "Wait, let me add another entity" → AI adds it
6. Build journeys, AI suggests logical steps
7. "That journey needs more detail" → AI expands it
8. Set rules and boundaries
9. "I forgot to update that actor" → AI updates it
10. Review complete, coherent model with all cross-references intact

### The "Vibe" Elements

**1. Incremental Building**
- Start broad, add detail later
- Don't need to know everything upfront
- Build in the order that makes sense to you

**2. Natural Language**
- Describe what you want, not how to structure it
- "Add more detail here" instead of "Insert 4 new rows in column B"
- AI handles the structure

**3. Immediate Feedback**
- See diffs before approving
- Understand exactly what's changing
- Catch mistakes before they're saved

**4. Conversational Refinement**
- "Actually, that's not quite right"
- "Add X to that section"
- "Connect these two things"
- Iterate like you're working with a colleague

**5. Context Awareness**
- AI remembers what you added earlier
- Suggests connections between sections
- Maintains consistency across the model

---

## Key Interaction Patterns

### Pattern 1: Add-Refine-Approve

```
You: "Add a Red Team actor"
AI: [Shows basic actor with standard responsibilities]
You: "Add API testing and mobile app testing to Red Team"
AI: [Shows updated actor with added responsibilities]
You: Approve
```

### Pattern 2: Bulk-Then-Detail

```
You: "Add entities for Target, Vulnerability, and Finding"
AI: [Shows 3 basic entities with common fields]
You: "Add CVSS score and exploit status to Vulnerability"
AI: [Shows updated Vulnerability entity]
You: Approve
```

### Pattern 3: Build-Connect-Refine

```
You: "Add a testing journey with 5 steps"
AI: [Shows journey with logical steps]
You: "Connect this journey to the Vulnerability entity"
AI: [Shows journey with entity touchpoints]
You: Approve
```

### Pattern 4: Discover-Add-Connect

```
You: [Looking at model] "We need to track compliance requirements"
You: "Add a Compliance entity with framework, controls, and status"
AI: [Shows new entity]
You: "Add a business rule that PCI systems require extra approval"
AI: [Shows new rule referencing Compliance entity]
You: Approve both
```

---

## What the Engineering Team Sees

### Before AI Interaction

**File**: `src/domain/intent-model/model.ts`
```typescript
export const intentModel: IntentModel = {
  meta: { version: '0.1.0', status: 'draft' },
  actors: [],
  entities: [],
  journeys: [],
  businessRules: [],
  constraints: [],
  openQuestions: []
}
```

### After 20-Minute Conversation

**File**: `src/domain/intent-model/model.ts`
```typescript
export const intentModel: IntentModel = {
  meta: { version: '0.8.0', status: 'draft', lastUpdated: '2026-04-01' },
  actors: [
    { id: 'redteam', name: 'Red Team', responsibilities: [...] },
    { id: 'client', name: 'Client', responsibilities: [...] },
    { id: 'blueteam', name: 'Blue Team', responsibilities: [...] },
    { id: 'pm', name: 'Project Manager', responsibilities: [...] }
  ],
  entities: [
    { id: 'webapp', name: 'Web Application', fields: [...] },
    { id: 'api', name: 'API Endpoint', fields: [...] },
    { id: 'vuln', name: 'Vulnerability', fields: [...] },
    { id: 'finding', name: 'Finding', fields: [...] }
  ],
  journeys: [
    { id: 'web-recon', name: 'Web Reconnaissance', steps: [...] },
    { id: 'auth-testing', name: 'Authentication Testing', steps: [...] },
    { id: 'injection-testing', name: 'Injection Testing', steps: [...] },
    { id: 'api-testing', name: 'API Security Testing', steps: [...] },
    { id: 'reporting', name: 'Reporting', steps: [...] }
  ],
  businessRules: [
    { id: 'br-001', rule: 'Testing Authorization', description: '...' },
    { id: 'br-002', rule: 'Testing Windows', description: '...' },
    { id: 'br-003', rule: 'Scope Exclusions', description: '...' },
    { id: 'br-004', rule: 'Critical Finding Escalation', description: '...' }
  ],
  constraints: [
    { id: 'cn-001', constraint: 'Database Exclusion', description: '...' },
    { id: 'cn-002', constraint: 'Rate Limiting', description: '...' },
    { id: 'cn-003', constraint: 'Social Engineering', description: '...' },
    { id: 'cn-004', constraint: 'IP Whitelisting', description: '...' }
  ],
  openQuestions: [
    { id: 'oq-001', question: 'Final Report Format', description: '...' }
  ]
}
```

**Version history**: 15 snapshots showing the conversational evolution

---

## Technical: How It Works

### 1. User sends message to AI

**Request** to `/api/model/edit`:
```json
{
  "message": "Add a Red Team actor responsible for web app testing",
  "conversationHistory": [...]
}
```

### 2. AI analyzes current model + request

**Backend**:
- Loads current model from `model.ts`
- Sends to OpenAI with system prompt containing model schema
- AI generates structured changes

### 3. AI returns proposed changes

**Response**:
```json
{
  "changes": {
    "actors": {
      "added": [
        { 
          "id": "redteam",
          "name": "Red Team",
          "responsibilities": ["Web application penetration testing"]
        }
      ]
    }
  },
  "explanation": "Added Red Team actor with web application testing responsibility"
}
```

### 4. Frontend shows diff preview

**UI**:
- Green highlighting for additions
- Red for removals (if modifying)
- Side-by-side comparison
- "Approve" and "Reject" buttons

### 5. User approves

**Request** to `/api/model/edit/apply`:
```json
{
  "changes": { /* the proposed changes */ },
  "approved": true
}
```

### 6. Backend applies changes

**Process**:
- Validate changes against schema (Zod)
- Merge changes into current model
- Increment version (0.1.0 → 0.1.1)
- Save snapshot to version history
- Write updated model to `model.ts` (dev) or Vercel KV (production)

### 7. UI updates

**Result**:
- Model refreshes with new content
- Version number increments
- Sidebar counts update
- Change appears in version history

---

## Common Questions

### Q: What if the AI suggests something wrong?

**A**: Click **Reject**. The change is discarded. Then clarify:
```
You: "No, I meant internal testing, not external"
AI: [Shows corrected version]
You: Approve
```

### Q: Can I edit the model manually?

**A**: Yes. Edit `src/domain/intent-model/model.ts` directly. The AI will see your manual changes and work with them.

### Q: What if I want to undo something?

**A**: Navigate to `/versions`, compare versions, and revert to a previous snapshot.

### Q: How does the AI know about pentest terminology?

**A**: The system prompt includes the intent model schema and security testing context. It understands CVE, CVSS, MITRE ATT&CK, etc.

### Q: Can multiple people use the AI at once?

**A**: In the current setup, one active session at a time. For collaboration, use consensus review after building the model.

---

## Next Steps

### For Your First Model

1. **Start the app**: `pnpm dev`
2. **Open AI chat**: Click icon or press `/`
3. **Begin conversationally**: "I'm planning a pentest for..."
4. **Build incrementally**: Actors → Entities → Journeys → Rules → Constraints
5. **Refine as you go**: "Add more detail to X", "Connect Y to Z"
6. **Review in consensus**: Navigate to `/review` when ready

### For Your Engineering Team

Show them this playbook, then:

1. **Screen share**: Walk through building a small model (10 min)
2. **Demonstrate vibing**: Show add-refine-approve pattern
3. **Show version history**: Prove everything is tracked
4. **Export BRD**: Show how structured model → documentation
5. **3D visualization**: Show `/explorer` to visualize relationships

### For Integrating with VBS Canvas

**You now have**:
- Proven AI-assisted model building workflow
- Version-controlled intent model structure
- Diff-based approval process
- Auto-generated documentation

**Integration opportunities**:
- Use same AI chat pattern for tech specs in VBS
- Apply consensus review to requirements gathering
- Version history for spec evolution
- BRD generation from structured specs

---

## Summary: The "Vibe"

The "vibing" is **conversational, incremental, iterative model building**:

- **Conversational**: Describe what you want, don't fill out forms
- **Incremental**: Build in pieces, add detail when you think of it
- **Iterative**: Refine through natural follow-ups, not upfront perfection
- **Visual**: See diffs before committing, understand every change
- **Tracked**: Full version history, no lost work
- **Structured**: Despite feeling freeform, output is perfectly structured

**Time investment**: 15-30 minutes to complete model vs. hours with traditional docs

**Result**: Production-ready, machine-readable, cross-referenced intent model ready for consensus review and documentation generation.
