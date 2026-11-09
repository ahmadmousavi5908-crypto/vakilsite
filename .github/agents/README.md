# Vakilsite / MAVIS specialist agents

Use one focused agent per review or engineering task. Agents are scoped through their profile files and must follow ../copilot-instructions.md.

| Agent | Responsibility | Write access |
|---|---|---|
| search-growth-engineer | Google Search, technical SEO, AEO/GEO, local search, News eligibility | Yes, with tests |
| performance-engineer | Bundle, Lighthouse, Core Web Vitals, runtime performance | Yes, with measurements |
| mavis-retrieval-engineer | Persian legal retrieval, ranking, provenance, scoped search | Yes, with tests |
| mavis-legal-evidence-reviewer | Iranian legal authority and temporal validity | Read-only |
| security-privacy-reviewer | Security boundaries, client privacy, OAuth, SSRF, secrets | Read-only |
| site-design-guard | Protect approved Mother Two visual design and RTL behavior | Read-only |
| continuity-keeper | Branch, PR, CI, and cross-session checkpoint | Yes, docs only |

No agent may merge, deploy, migrate production data, publish content, enable public chat, or alter the approved visual design without explicit owner approval.
