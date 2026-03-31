# Workflows

How to use Adapt Canvas for penetration testing engagement planning, execution, and reporting.

---

## Overview

Adapt Canvas supports the full penetration testing lifecycle:
1. **Pre-Engagement**: Scope definition and consensus
2. **During Engagement**: Tracking progress and discoveries
3. **Post-Engagement**: Documentation and archival

---

## Pre-Engagement: Scope Definition

### Phase 1: Initial Model Creation

**Goal**: Define scope, actors, and objectives

**Who**: Security Project Manager + Client Contact

**Steps**:

1. **Create project actors**
   - Use AI: "Add actors for Red Team, Client, Blue Team, and Project Manager with their responsibilities"
   - Review and approve changes

2. **Define target scope**
   - Use AI: "Create Target and Network Segment entities with required fields"
   - Add specific targets manually or via AI

3. **Set boundaries**
   - Use AI: "Add business rules for authorization, testing windows, and notification requirements"
   - Use AI: "Add constraints for excluded systems and approval requirements"

4. **Define deliverables**
   - Use AI: "Create Report entity with fields for report types and delivery tracking"

**Outcome**: Draft model ready for stakeholder review

### Phase 2: Consensus Review

**Goal**: Get agreement from all stakeholders

**Who**: Security Team + Client Stakeholders + Legal + Compliance

**Steps**:

1. **Navigate to Consensus Review** (`/review`)

2. **Section-by-section review**:
   - **Actors**: Verify all stakeholders represented, responsibilities clear
   - **Entities**: Confirm what's being tracked makes sense
   - **Journeys**: Review testing methodology and flow
   - **Rules**: Ensure authorization and notification processes are clear
   - **Constraints**: Verify all boundaries and exclusions are documented

3. **Approve or dispute**:
   - Each reviewer marks sections as approved or disputed
   - Document disputes in comments
   - Track open questions

4. **Resolve disputes**:
   - Use AI to iterate on disputed sections
   - Get re-approval on changes

5. **Final sign-off**:
   - All sections approved by required reviewers
   - Export final scope document

**Outcome**: Approved scope of work, all stakeholders aligned

### Phase 3: Kickoff Preparation

**Goal**: Prepare for testing

**Steps**:

1. **Export BRD** (`/brd`):
   - Generate scope document
   - Include in Statement of Work

2. **Set up tracking**:
   - Add initial targets to model
   - Prepare finding templates

3. **Establish communication**:
   - Document escalation paths
   - Set up notification channels

**Outcome**: Ready to begin testing

---

## During Engagement: Execution & Tracking

### Daily Model Updates

**Goal**: Track discoveries and progress

**Who**: Red Team Lead

**Steps**:

1. **Add discovered systems**:
   ```
   Add a new Target: hostname corp-web-02, IP 10.0.1.52,
   OS Ubuntu 20.04, ports 22/80/443 open
   ```

2. **Document vulnerabilities**:
   ```
   Create a Vulnerability: CVE-2024-1234, CVSS 8.1,
   affects corp-web-02, SQL injection in login form
   ```

3. **Track findings**:
   ```
   Add a Finding: High severity, SQL injection allows
   authentication bypass on corp-web-02
   ```

4. **Update journey progress**:
   - Mark completed steps
   - Add notes about techniques used

**Frequency**: Daily or after significant discoveries

### Scope Change Management

**Goal**: Document and approve scope changes

**Steps**:

1. **Identify scope change**:
   - New system discovered
   - Out-of-scope system needed for testing
   - Additional testing required

2. **Document in model**:
   ```
   Add a constraint that corp-db-01 (originally out of scope)
   requires inclusion for realistic exploitation path validation
   ```

3. **Version comparison**:
   - Navigate to `/review/versions`
   - Show diff between current and last approved version

4. **Get approval**:
   - Share diff with client
   - Document approval in comments
   - Continue testing once approved

### Critical Finding Escalation

**Goal**: Immediate notification per rules

**Steps**:

1. **Document finding immediately**:
   ```
   Add Critical Finding: Default credentials on production
   database server db-prod-01 allow full administrative access
   ```

2. **Follow notification rule**:
   - Check model business rules for escalation procedure
   - Notify per defined process

3. **Track remediation**:
   ```
   Update Finding db-prod-01-001 status to "remediated,
   retest scheduled"
   ```

---

## Post-Engagement: Documentation & Reporting

### Final Model Update

**Goal**: Complete and accurate record

**Who**: Red Team Lead

**Steps**:

1. **Verify all findings documented**:
   - Check each target has associated findings
   - Ensure all vulnerabilities captured

2. **Complete journey documentation**:
   - Mark all steps with outcomes
   - Document techniques and tools used

3. **Add remediation tracking**:
   ```
   Update each Finding with remediation recommendations,
   priority, and validation requirements
   ```

4. **Final snapshot**:
   ```bash
   pnpm intent:snapshot
   ```

### Report Generation

**Goal**: Create deliverables

**Steps**:

1. **Generate BRD** (`/brd`):
   - Export scope and findings documentation
   - Use as basis for technical report

2. **Extract findings summary**:
   - Filter findings by severity
   - Group by system or category
   - Include in executive summary

3. **Create technical appendix**:
   - Export entity details
   - Include journey documentation
   - Add evidence references

### Client Presentation

**Goal**: Present results clearly

**Steps**:

1. **Use 3D visualizations** (`/explorer`):
   - Force graph: Show attack paths
   - Lifecycle view: Show progression
   - Actor layers: Show impact scope

2. **Review findings**:
   - Walk through consensus review
   - Show severity distribution
   - Highlight critical paths

3. **Demonstrate remediation priorities**:
   - Show rules for fix prioritization
   - Document validation process

### Archive & Cleanup

**Goal**: Secure storage and cleanup

**Steps**:

1. **Final version tag**:
   ```
   Add open question: Final model archived on 2026-04-15,
   version 1.0.0, engagement completed
   ```

2. **Export for archive**:
   ```bash
   pnpm export:contract
   ```

3. **Secure model storage**:
   - Export model to secure storage
   - Remove from production if needed

4. **Evidence handling**:
   - Follow data handling rules from model
   - Destroy evidence per timeline

---

## Collaboration Tips

### Security Team + Client Alignment

**Challenge**: Different priorities and risk tolerance

**Solution**:
- Use consensus review for explicit approval
- Document disputes with reasoning
- Use AI to generate alternative approaches
- Version history shows evolution of agreement

### Mixed Technical Levels

**Challenge**: Non-technical stakeholders need to understand

**Solution**:
- Use visualizations for big picture
- BRD provides readable documentation
- Comments explain technical decisions
- Executive summary in report entity

### Rapid Iteration

**Challenge**: Scope and findings change quickly

**Solution**:
- AI chat for fast updates
- Version comparison shows exact changes
- Daily snapshots track progress
- Diffs for approval are specific

### Remote Collaboration

**Challenge**: Distributed team and client

**Solution**:
- Single source of truth in model
- Async review with approve/dispute
- Comments for discussion
- Export BRD for offline review

---

## Advanced Workflows

### Continuous Testing Engagement

For ongoing/continuous testing relationships:

1. **Master model**: Core scope, actors, rules (stable)
2. **Sprint models**: Snapshot per testing sprint
3. **Delta documentation**: What changed each sprint
4. **Cumulative findings**: Track across sprints

### Multi-Site Engagement

For testing across multiple locations/environments:

1. **Global model**: Overall scope and rules
2. **Site-specific entities**: Targets per site
3. **Site-specific constraints**: Timing and approvals per location
4. **Rollup reporting**: Aggregate findings

### Red Team Exercise

For scenario-based adversary simulation:

1. **Scenario definition**: Add as business rule or constraint
2. **Objective entities**: Track scenario goals
3. **TTP journeys**: Map to MITRE ATT&CK
4. **Blue team tracking**: Document detections

---

## Next Steps

- [Prompts Guide](prompts-guide.md) — Example prompts for common tasks
- [Scripts Reference](scripts-reference.md) — Available automation
- [Getting Started](getting-started.md) — Setup and basics
