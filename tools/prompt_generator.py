#!/usr/bin/env python3
"""
LinkedIn Warm Intro Prompt Generator

Generates agent prompts with proper token substitution for target name and company.

Usage:
    python prompt_generator.py --target "Alex Thompson" --company "TechCorp"
    python prompt_generator.py --target "Sarah Johnson" --company "DataCorp" --case-name "example-case"
    python prompt_generator.py --target "John Smith" --company "Microsoft" --step 2
    python prompt_generator.py --target "Alex Thompson" --company "TechCorp" --advisor-name "Cameron" --origin-contact "Sarah Johnson"
"""

import argparse
import re
import sys
from pathlib import Path
from datetime import datetime


class PromptGenerator:
    """Generate LinkedIn warm intro prompts with token substitution."""
    
    def __init__(self, target: str, company: str, case_name: str = None,
                 advisor_name: str = "Advisor", origin_contact: str = None,
                 strict_recency: bool = False):
        self.target = target
        self.company = company
        self.origin_contact = origin_contact or target  # default: target is introducer
        self.advisor_name = advisor_name
        self.strict_recency = strict_recency
        self.case_name = case_name or self._generate_case_name()
        
    def _generate_case_name(self) -> str:
        """Generate case name from target name."""
        # Slugify: keep letters/numbers, collapse to hyphens
        slug = re.sub(r"[^A-Za-z0-9]+", "-", self.target.strip().lower())
        return slug.strip("-")
    
    def get_step1_prompt(self) -> str:
        """Generate Step 1: Mutual Connections Extraction prompt."""
        return f"""🎯 **STEP 1: Mutual Connections Extraction**

Find {self.target} at {self.company} on LinkedIn. Open profile → "See all mutual connections".
Extract ALL mutual connections between us in clean JSON format:

[
  {{
    "name": "Full Name with Credentials",
    "title": "Job Title", 
    "company": "Company Name",
    "mutual_connections": number_of_mutuals
  }}
]

Requirements:
- Include ALL mutual connections, paginate if necessary
- Use null for missing company (not empty string)
- Keep exact names and titles as shown on LinkedIn
- Return a valid JSON array ONLY (no prose)
- Do NOT include profile URLs or emails
- If the list is empty, return []

**After you complete this, I will send Step 2 which will use your JSON output above.**"""

    def get_step2_prompt(self) -> str:
        """Generate Step 2: Interaction Analysis prompt."""
        return f"""🎯 **STEP 2: Interaction Analysis & Non-Mutual Discovery**

Using the JSON array from your previous message above, analyze {self.origin_contact}'s LinkedIn engagement patterns.

Go to {self.origin_contact}'s LinkedIn profile. Check their last 5 posts for likes/comments.

For each person in your Step 1 JSON output above, add a boolean field:
"target_interacted": true/false  // if they engaged with any of the 5 posts

Also identify NEW people (not in our mutual connections from Step 1) who actively engage with {self.origin_contact}'s posts, especially in:
- Prosperous engineering roles
- Business ownership  
- Consulting/professional services
- High-level corporate positions

Batch if needed (≤10 profiles per run). If you accidentally like/comment, undo and confirm.

Return a SINGLE combined JSON array ONLY:
[
  {{ "name","title","company", "mutual_connections":N, "target_interacted":bool, "source":"mutual", "evidence":"post/topic (date, like|comment)" }},
  {{ "name","title","company", "source":"non-mutual-engager", "evidence":"post/topic (date, like|comment)" }}
]

**After you complete this, I will send Step 3 which will use your combined JSON output above.**"""

    def get_step3_prompt(self) -> str:
        """Generate Step 3: Prospect Categorization & Evidence Mapping prompt.""" 
        return f"""🎯 **STEP 3: Prospect Categorization & Evidence Mapping**

Using the combined JSON array from your Step 2 output above, filter and categorize prospects for permission-first warm intros via {self.origin_contact}.

Task:
1) From your Step 2 JSON above, keep only entries with target_interacted = true
2) Add "category" field to each prospect based on their title/company:
   - "exec": C-level, VPs, senior leadership roles
   - "finance": Financial advisors, analysts, CPAs, investment professionals  
   - "engineering": Senior engineers, CTOs, tech leads, data scientists
   - "consulting": Management consultants, professional service providers

3) Return ONE filtered JSON array with these fields:
   {{
     "name", "title", "company", "category",
     "source",                // mutual | non-mutual-engager  
     "evidence": "Specific post title/date and type of engagement"
   }}

Focus on prospects who actively engaged with {self.origin_contact}'s content - these are the warm introduction opportunities.

Return JSON ONLY (no prose).

**After you complete this, I will send Step 4 which will score these prospects for introduction likelihood.**"""

    def get_step4_prompt(self) -> str:
        """Generate Step 4: Introduction Readiness Scoring prompt."""
        mode = "STRICT" if self.strict_recency else "STALE_OK"
        recency_rule = (
            'If engagement_recency is ">12m", set intro_likelihood = 0 and tag "stale_engagement".'
            if self.strict_recency else
            'If engagement_recency is ">12m", add +0 (allowed).'
        )
        return f"""🎯 **STEP 4: Introduction Readiness Scoring**

Using the categorized prospects JSON from your Step 3 output above, score them for permission-first introduction likelihood.

You are assisting {self.advisor_name} with warm intros via {self.origin_contact}.

Task:
1) Clean & dedupe by name from your Step 3 output. Prefer entries with richer, newer evidence (comments > likes; <90d > 90d–12m > >12m).

2) Derive fields for each prospect:
   - engagement_type: comment | multiple_reacts | single_like | unknown
   - engagement_recency: <90d | 90d–12m | >12m | unknown  
   - relationship_basis: mutual | non-mutual-engager

3) Compute *IntroLikelihood* for {self.origin_contact} to comfortably introduce (not "deal size"):
   Start at 0 and add:
     +3 if relationship_basis=mutual
     +2 if engagement_type=comment
     +1 if engagement_type=multiple_reacts or single_like
     +2 if engagement_recency=<90d | +1 if 90d–12m | +0 if >12m/unknown
   Cap at 8. If evidence says "5 years ago," set recency=>12m.
   Mode: {mode}. {recency_rule}

4) Rank by IntroLikelihood (desc), tie-breakers:
   a) relationship_basis=mutual before non-mutual
   b) category priority exec>engineering>consulting>finance
   c) alphabetical by name

5) Return TOP 6 as JSON:
[
  {{
    "name": "...",
    "title": "...",
    "company": "...",
    "category": "exec|engineering|consulting|finance",
    "relationship_basis": "mutual|non-mutual-engager",
    "engagement_type": "...",
    "engagement_recency": "...",
    "evidence": "...",
    "intro_likelihood": N,       // 0–8
    "why_now": "...",            // 6–12 words, grounded in evidence
    "risk_notes": "..."          // <=12 words, e.g., "engagement >12m ago"
  }},
  ...
]

Return JSON ONLY (no prose).

**After you complete this, I will send Step 5 (optional) to generate meeting intelligence for client conversations.**"""

    def get_step5_prompt(self) -> str:
        """Generate Step 5: Meeting Intelligence Generation prompt."""
        return f"""🎯 **STEP 5: Meeting Intelligence Generation** [OPTIONAL]

Using the TOP 6 scored prospects JSON from your Step 4 output above, create meeting intelligence for discussions with {self.origin_contact}.

Create a meeting briefing with:

**1. EXECUTIVE SUMMARY:**
   - Total prospects identified from this analysis
   - Breakdown by category (exec/finance/engineering/consulting)  
   - Mutual vs non-mutual split
   - Key insights about {self.origin_contact}'s network engagement patterns

**2. TOP 3 PRIORITY PROSPECTS:**
   For each prospect from your Step 4 output, include:
   - Name, title, company, category
   - Conversation hook: "I noticed [name] [specific engagement evidence from Step 4]"  
   - Value proposition: Why this intro benefits both {self.advisor_name} and the prospect
   - Introduction difficulty: Easy/Medium/Hard based on intro_likelihood score

**3. CONVERSATION SCRIPTS:**
   - Opening: How to ask {self.origin_contact} permission-first for introductions
   - Prospect-specific talking points for each top 3
   - Fallback prospects (#4-6 from Step 4) if primary ones don't resonate
   - Permission language: "How well do you know [name]? Think they'd be open to..."

**4. NETWORK INSIGHTS:**
   - Company clusters (multiple people from same firms identified in Steps 1-4)
   - Industry concentrations discovered
   - Engagement patterns (which posts attracted which prospect types)
   - Notable non-mutual discoveries and their significance

Format as meeting-ready talking points for client conversation with {self.origin_contact}.

**This completes the 5-step LinkedIn warm introduction analysis.**"""

    def get_all_prompts(self) -> dict:
        """Get all prompts as a dictionary."""
        return {
            "step1": self.get_step1_prompt(),
            "step2": self.get_step2_prompt(), 
            "step3": self.get_step3_prompt(),
            "step4": self.get_step4_prompt(),
            "step5": self.get_step5_prompt()
        }
    
    def generate_session_header(self) -> str:
        """Generate session header for logs."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return f"""=== LINKEDIN WARM INTRO SESSION ===
Target: {self.target}
Company: {self.company}
Origin Contact: {self.origin_contact}
Advisor: {self.advisor_name}
Case Name: {self.case_name}
Date: {timestamp}
Session ID: {self.case_name}-{datetime.now().strftime("%Y%m%d")}
Recency Mode: {"STRICT" if self.strict_recency else "STALE_OK"}

Objective: Extract and analyze {self.target}'s network for warm introduction opportunities
Expected Output: JSON connection data with interaction analysis

=== PROMPTS USED ===

"""


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Generate LinkedIn warm intro prompts with token substitution",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python prompt_generator.py --target "Alex Thompson" --company "TechCorp"
    python prompt_generator.py --target "Sarah Johnson" --company "DataCorp" --step 2
    python prompt_generator.py --target "John Smith" --company "Microsoft" --case-name "john-test"
    python prompt_generator.py --target "Alex Thompson" --company "TechCorp" --advisor-name "Cameron" --origin-contact "Sarah Johnson"
    python prompt_generator.py --target "Alex Thompson" --company "TechCorp" --strict-recency
        """
    )
    
    parser.add_argument(
        "--target", "-t",
        required=True,
        help="Target person's full name (e.g., 'Alex Thompson')"
    )
    
    parser.add_argument(
        "--company", "-c", 
        required=True,
        help="Target's company name (e.g., 'TechCorp')"
    )
    
    parser.add_argument(
        "--case-name",
        help="Custom case name (default: auto-generated from target name)"
    )
    
    parser.add_argument(
        "--advisor-name",
        default="Advisor",
        help="Advisor's name used in prompts (default: 'Advisor')"
    )
    
    parser.add_argument(
        "--origin-contact",
        help="Existing client who would make the intro (default: same as --target)"
    )
    
    parser.add_argument(
        "--strict-recency",
        action="store_true",
        help="Disqualify engagements older than 12 months in Step 4 scoring"
    )
    
    parser.add_argument(
        "--step", "-s",
        type=int,
        choices=[1, 2, 3, 4, 5],
        help="Generate prompt for specific step only (1-5)"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output file path (default: print to stdout)"
    )
    
    parser.add_argument(
        "--with-header",
        action="store_true",
        help="Include session header for logging"
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    if not args.target.strip():
        print("Error: Target name cannot be empty", file=sys.stderr)
        sys.exit(1)
        
    if not args.company.strip():
        print("Error: Company name cannot be empty", file=sys.stderr)
        sys.exit(1)
    
    # Initialize generator
    generator = PromptGenerator(
        target=args.target.strip(),
        company=args.company.strip(),
        case_name=args.case_name,
        advisor_name=args.advisor_name,
        origin_contact=args.origin_contact,
        strict_recency=args.strict_recency
    )
    
    # Generate output
    output_lines = []
    
    if args.with_header:
        output_lines.append(generator.generate_session_header())
    
    if args.step:
        # Generate single step
        step_name = f"step{args.step}"
        prompt_method = f"get_{step_name}_prompt"
        
        if hasattr(generator, prompt_method):
            output_lines.append(f"## Step {args.step} Prompt\n")
            output_lines.append(getattr(generator, prompt_method)())
        else:
            print(f"Error: Invalid step {args.step}", file=sys.stderr)
            sys.exit(1)
    else:
        # Generate all steps
        all_prompts = generator.get_all_prompts()
        
        for i, (step, prompt) in enumerate(all_prompts.items(), 1):
            output_lines.append(f"## Step {i} Prompt\n")
            output_lines.append(prompt)
            if i < len(all_prompts):  # Add separator between steps
                output_lines.append("\n" + "="*50 + "\n")
    
    # Output results
    output_content = "\n".join(output_lines)
    
    if args.output:
        try:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(output_content)
            
            print(f"✅ Prompts generated successfully: {output_path}")
            print(f"📋 Target: {generator.target} at {generator.company}")
            print(f"👤 Origin Contact: {generator.origin_contact}")
            print(f"🏷️  Case Name: {generator.case_name}")
            print(f"⏰ Recency Mode: {'STRICT' if generator.strict_recency else 'STALE_OK'}")
            
        except Exception as e:
            print(f"Error writing to {args.output}: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(output_content)


if __name__ == "__main__":
    main()


# TODO: Future enhancements
"""
Enhancement Ideas:

1. Template Customization:
   - [ ] Industry-specific prompt variations (engineering vs finance vs healthcare)
   - [ ] Configurable focus areas (business owners vs high earners vs referral sources)
   - [ ] Custom interaction analysis depth (5 posts vs 10 posts)

2. Integration Features:  
   - [ ] Direct integration with agent session logging
   - [ ] Automatic case name generation with sequential numbering
   - [ ] Validation against existing case names to avoid duplicates

3. Output Formats:
   - [ ] Markdown format with proper headers and code blocks
   - [ ] JSON format for programmatic use
   - [ ] Clipboard integration for easy copy/paste

4. Quality Assurance:
   - [ ] Prompt validation against successful test case patterns
   - [ ] Warning if target/company combination seems unusual
   - [ ] Suggestions for improving prompt effectiveness

5. Workflow Integration:
   - [ ] Generate directory structure for new test cases
   - [ ] Create placeholder log files with proper naming
   - [ ] Integration with CI/CD validation workflows
"""