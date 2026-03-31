# Prompts Guide

Example prompts for building penetration testing models with the AI chat panel. Use these as templates and adapt to your specific engagement.

---

## Overview

The AI chat panel (bottom-right corner or press `/`) understands conversational descriptions and generates structured model content. Describe what you want in plain language, review the diff, and approve or reject changes.

**Best practices:**
- Be specific about responsibilities and fields
- Include context about the engagement type
- Reference existing actors/entities when creating journeys
- Iterate — start broad, then refine

---

## Actor Prompts

### Red Team / Offensive Security

```
Add a Red Team actor responsible for offensive security testing.
Responsibilities include: reconnaissance and information gathering,
vulnerability identification and validation, exploitation and gaining access,
privilege escalation, lateral movement, persistence mechanisms,
post-exploitation data gathering, and cleanup.
```

```
Add an External Penetration Tester actor working as a third-party contractor.
Responsibilities: scope validation, target enumeration, vulnerability scanning,
manual testing, reporting findings, and recommendations.
```

### Client / Target Organization

```
Add a Client actor representing the organization requesting the pentest.
Responsibilities include: defining scope and objectives, providing access credentials,
approving testing windows, receiving notifications for critical findings,
and reviewing final reports.
```

```
Add a Target Organization Contact actor who serves as the technical point of contact.
Responsibilities: providing network diagrams, answering technical questions,
coordinating access, and receiving status updates.
```

### Blue Team / Defensive Security

```
Add a Blue Team actor responsible for defensive monitoring during the engagement.
Responsibilities include: monitoring security alerts, distinguishing test traffic
from real threats, coordinating incident response exercises, and documenting
detection capabilities.
```

### Project Management

```
Add a Security Project Manager actor coordinating the engagement.
Responsibilities: scheduling testing windows, coordinating stakeholder communication,
tracking milestones, managing scope changes, and ensuring deliverable quality.
```

---

## Entity Prompts

### Target Systems

```
Create a Target entity representing systems under test.
Fields: IP address, hostname, operating system, open ports list,
running services, discovery date, test status, and access level achieved.
```

```
Create a Network Segment entity for organizing targets.
Fields: segment name, IP range, security zone (DMZ/internal/management),
business criticality, and approved testing flag.
```

### Vulnerabilities

```
Create a Vulnerability entity for discovered weaknesses.
Fields: CVE identifier, CVSS base score, title, description,
affected systems list, exploitation difficulty, remediation priority,
and status (identified/validated/exploited/reported).
```

```
Add a Misconfiguration entity for security misconfigurations.
Fields: configuration type, affected system, severity level,
description, business impact, and remediation steps.
```

### Findings & Reports

```
Create a Finding entity for pentest results.
Fields: finding ID, severity (Critical/High/Medium/Low), title,
detailed description, affected assets, exploitation evidence,
business impact, remediation recommendation, and validation status.
```

```
Create a Report entity for deliverables.
Fields: report type (executive/technical/remediation),
generation date, scope covered, findings count by severity,
key recommendations, and delivery status.
```

### Exploits & Techniques

```
Create an Exploit entity for tracking attack techniques.
Fields: exploit name, CVE targeted, MITRE ATT&CK technique ID,
success rate, tools required, IOCs generated, and detection likelihood.
```

---

## Journey Prompts

### Reconnaissance Phase

```
Add a reconnaissance journey for external penetration testing.
Steps: passive information gathering (OSINT, DNS records, public documents),
subdomain enumeration, IP range identification, technology stack fingerprinting,
employee information gathering (LinkedIn, social media), and public exposure assessment.
```

```
Create an internal reconnaissance journey starting with assumed breach.
Steps: network discovery, active directory enumeration, service identification,
share enumeration, identifying privileged accounts, and mapping network topology.
```

### Vulnerability Assessment

```
Add a vulnerability assessment journey.
Steps: automated scanning (Nessus, OpenVAS, Nmap), manual verification of findings,
false positive elimination, prioritization by exploitability,
cross-referencing with known exploits, and validated vulnerabilities list.
```

### Exploitation

```
Create an exploitation journey for gaining initial access.
Steps: target selection based on vulnerabilities, exploit development or adaptation,
payload preparation, delivery mechanism, execution, establishing callback,
and initial access confirmation.
```

```
Add a privilege escalation journey.
Steps: enumerate current privileges, identify escalation paths
(kernel exploits, misconfigurations, weak permissions), attempt escalation,
achieve elevated privileges, and document path taken.
```

### Post-Exploitation

```
Create a post-exploitation journey for demonstrating impact.
Steps: credential harvesting, lateral movement to additional systems,
data exfiltration simulation (non-sensitive test data), persistence mechanism setup,
covering tracks, and documenting access maintained.
```

### Reporting

```
Add a reporting journey from findings to deliverables.
Steps: consolidate all findings, assign severity ratings, document evidence
(screenshots, logs, packet captures), write technical descriptions,
assess business impact, develop remediation recommendations,
executive summary creation, technical appendix compilation, and report review.
```

---

## Business Rules Prompts

### Authorization & Scope

```
Add a business rule that all exploitation attempts require explicit authorization
from the client contact. Include escalation process for scope expansions and
mandatory approval for any destructive testing.
```

```
Create a rule defining in-scope and out-of-scope systems.
In-scope: external-facing web applications, internal network 10.0.0.0/8,
wireless networks. Out-of-scope: production databases, payment processing systems,
physical security testing.
```

### Testing Windows

```
Add a rule defining testing windows.
External testing: Monday-Friday 8am-6pm EST. Internal testing: Monday-Thursday 6pm-6am EST
(after business hours). No testing on holidays or during blackout periods
(quarter-end, major releases).
```

### Notification Requirements

```
Create a rule for critical finding notifications.
Critical findings must be reported within 1 hour of discovery via email and phone.
High findings within 4 hours. All findings included in daily status updates.
Client must acknowledge receipt.
```

### Data Handling

```
Add a rule for data handling and evidence collection.
No collection of real customer data, PII, or financial information.
Test data only for exfiltration demos. All evidence encrypted at rest.
Secure evidence transfer via encrypted channels. Evidence destruction
within 30 days of report delivery.
```

---

## Constraints Prompts

### Technical Constraints

```
Add a constraint limiting concurrent network connections.
Maximum 10 concurrent connections to avoid overwhelming systems.
Scan rate limited to 100 packets/second. No denial of service testing.
All testing from approved source IPs only.
```

### Approval Requirements

```
Create a constraint requiring additional approvals for high-risk testing.
Destructive tests require CTO approval. Social engineering requires
HR and Legal approval. Physical security testing requires Facilities and
Security Director approval. 48-hour notice required for all high-risk activities.
```

### Environmental Constraints

```
Add a constraint for production environment restrictions.
Production systems require explicit approval per system.
Testing limited to read-only activities. No configuration changes.
Immediate rollback plan required. Change control ticket mandatory.
```

---

## Modification Prompts

### Updating Actors

```
Update the Red Team actor to add a responsibility for
supply chain attack simulation and third-party integration testing.
```

### Updating Entities

```
Update the Target entity to add fields for cloud provider,
region, and compliance classification (PCI/HIPAA/SOX).
```

### Updating Journeys

```
Modify the exploitation journey to include a step for
documenting all command execution and system state changes.
```

### Refining Rules

```
Update the testing windows rule to add emergency testing procedures
for zero-day response scenarios.
```

---

## Complex Scenario Prompts

### Web Application Pentest

```
I'm planning a web application penetration test for an e-commerce platform.

Add a Red Team actor focused on application security testing.

Create a Web Application entity with fields for URL, technology stack,
authentication methods, and API endpoints.

Add a web app testing journey covering: reconnaissance (crawling, API discovery),
authentication testing, authorization bypass attempts, injection vulnerabilities
(SQL, XSS, XXE, SSRF), business logic flaws, and session management issues.

Add a rule that production data must not be modified and all testing
uses test accounts only.
```

### Internal Network Pentest

```
I need a model for an internal network penetration test with assumed breach scenario.

Add a Red Team actor with internal network testing capabilities.

Create entities for: Internal Host, Active Directory Object, Network Segment, and Credential.

Add journeys for: host discovery and enumeration, AD enumeration,
lateral movement, privilege escalation, and persistence.

Add a rule that testing occurs after business hours only and critical systems
require explicit approval.

Add a constraint that domain controller testing is read-only.
```

### Cloud Infrastructure Pentest

```
Planning a cloud infrastructure security assessment for AWS environment.

Add a Cloud Security Tester actor.

Create entities for: Cloud Asset (EC2, S3, RDS, Lambda), IAM Policy,
Network Configuration, and Security Group.

Add journeys for: asset discovery and inventory, IAM misconfiguration identification,
storage exposure assessment, network security testing, and serverless security review.

Add a rule requiring backup verification before any destructive testing.

Add a constraint that production data stores are read-only.
```

---

## Tips for Better Prompts

**Be Specific**
❌ "Add a hacker"
✅ "Add a Red Team actor responsible for external network penetration testing"

**Include Context**
❌ "Create a target entity"
✅ "Create a Target entity for tracking systems under test with IP, hostname, OS, and open ports"

**Reference Existing Elements**
❌ "Add a testing journey"
✅ "Add an exploitation journey that uses the vulnerabilities identified in the assessment journey"

**Iterate and Refine**
Start broad → review → refine with follow-up prompts

**Use Industry Terms**
The AI understands security terminology: CVE, CVSS, MITRE ATT&CK, OSINT, lateral movement, etc.

---

## Next Steps

- Try these prompts in the AI chat panel
- Review the generated diffs
- Adapt prompts to your specific engagement
- See [Workflows](workflows.md) for end-to-end process
