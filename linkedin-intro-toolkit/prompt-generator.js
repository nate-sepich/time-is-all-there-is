class PromptGenerator {
    constructor(target, company, caseName = null, advisorName = "Advisor", originContact = null, strictRecency = false) {
        this.target = target;
        this.company = company;
        this.originContact = originContact || target;
        this.advisorName = advisorName;
        this.strictRecency = strictRecency;
        this.caseName = caseName || this.generateCaseName();
    }

    generateCaseName() {
        // Slugify: keep letters/numbers, collapse to hyphens
        return this.target.toLowerCase()
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    getStep1Prompt() {
        return `🎯 **STEP 1: Mutual Connections Extraction**

Find ${this.target} at ${this.company} on LinkedIn. Open profile → "See all mutual connections".
Extract ALL mutual connections between us in clean JSON format:

[
  {
    "name": "Full Name with Credentials",
    "title": "Job Title", 
    "company": "Company Name",
    "mutual_connections": number_of_mutuals
  }
]

Requirements:
- Include ALL mutual connections, paginate if necessary
- Use null for missing company (not empty string)
- Keep exact names and titles as shown on LinkedIn
- Return a valid JSON array ONLY (no prose)
- Do NOT include profile URLs or emails
- If the list is empty, return []

**After you complete this, I will send Step 2 which will use your JSON output above.**`;
    }

    getStep2Prompt() {
        return `🎯 **STEP 2: Interaction Analysis & Non-Mutual Discovery**

Using the JSON array from your previous message above, analyze ${this.originContact}'s LinkedIn engagement patterns.

Go to ${this.originContact}'s LinkedIn profile. Check their last 5 posts for likes/comments.

For each person in your Step 1 JSON output above, add a boolean field:
"target_interacted": true/false  // if they engaged with any of the 5 posts

Also identify NEW people (not in our mutual connections from Step 1) who actively engage with ${this.originContact}'s posts, especially in:
- Prosperous engineering roles
- Business ownership  
- Consulting/professional services
- High-level corporate positions

Batch if needed (≤10 profiles per run). If you accidentally like/comment, undo and confirm.

Return a SINGLE combined JSON array ONLY:
[
  { "name","title","company", "mutual_connections":N, "target_interacted":bool, "source":"mutual", "evidence":"post/topic (date, like|comment)" },
  { "name","title","company", "source":"non-mutual-engager", "evidence":"post/topic (date, like|comment)" }
]

**After you complete this, I will send Step 3 which will use your combined JSON output above.**`;
    }

    getStep3Prompt() {
        return `🎯 **STEP 3: Prospect Categorization & Evidence Mapping**

Using the combined JSON array from your Step 2 output above, filter and categorize prospects for permission-first warm intros via ${this.originContact}.

Task:
1) From your Step 2 JSON above, keep only entries with target_interacted = true
2) Add "category" field to each prospect based on their title/company:
   - "exec": C-level, VPs, senior leadership roles
   - "finance": Financial advisors, analysts, CPAs, investment professionals  
   - "engineering": Senior engineers, CTOs, tech leads, data scientists
   - "consulting": Management consultants, professional service providers

3) Return ONE filtered JSON array with these fields:
   {
     "name", "title", "company", "category",
     "source",                // mutual | non-mutual-engager  
     "evidence": "Specific post title/date and type of engagement"
   }

Focus on prospects who actively engaged with ${this.originContact}'s content - these are the warm introduction opportunities.

Return JSON ONLY (no prose).

**After you complete this, I will send Step 4 which will score these prospects for introduction likelihood.**`;
    }

    getStep4Prompt() {
        const mode = this.strictRecency ? "STRICT" : "STALE_OK";
        const recencyRule = this.strictRecency 
            ? 'If engagement_recency is ">12m", set intro_likelihood = 0 and tag "stale_engagement".'
            : 'If engagement_recency is ">12m", add +0 (allowed).';

        return `🎯 **STEP 4: Introduction Readiness Scoring**

Using the categorized prospects JSON from your Step 3 output above, score them for permission-first introduction likelihood.

You are assisting ${this.advisorName} with warm intros via ${this.originContact}.

Task:
1) Clean & dedupe by name from your Step 3 output. Prefer entries with richer, newer evidence (comments > likes; <90d > 90d–12m > >12m).

2) Derive fields for each prospect:
   - engagement_type: comment | multiple_reacts | single_like | unknown
   - engagement_recency: <90d | 90d–12m | >12m | unknown  
   - relationship_basis: mutual | non-mutual-engager

3) Compute *IntroLikelihood* for ${this.originContact} to comfortably introduce (not "deal size"):
   Start at 0 and add:
     +3 if relationship_basis=mutual
     +2 if engagement_type=comment
     +1 if engagement_type=multiple_reacts or single_like
     +2 if engagement_recency=<90d | +1 if 90d–12m | +0 if >12m/unknown
   Cap at 8. If evidence says "5 years ago," set recency=>12m.
   Mode: ${mode}. ${recencyRule}

4) Rank by IntroLikelihood (desc), tie-breakers:
   a) relationship_basis=mutual before non-mutual
   b) category priority exec>engineering>consulting>finance
   c) alphabetical by name

5) Return TOP 6 as JSON:
[
  {
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
  },
  ...
]

Return JSON ONLY (no prose).

**After you complete this, I will send Step 5 (optional) to generate meeting intelligence for client conversations.**`;
    }

    getStep5Prompt() {
        return `🎯 **STEP 5: Meeting Intelligence Generation** [OPTIONAL]

Using the TOP 6 scored prospects JSON from your Step 4 output above, create meeting intelligence for discussions with ${this.originContact}.

Create a meeting briefing with:

**1. EXECUTIVE SUMMARY:**
   - Total prospects identified from this analysis
   - Breakdown by category (exec/finance/engineering/consulting)  
   - Mutual vs non-mutual split
   - Key insights about ${this.originContact}'s network engagement patterns

**2. TOP 3 PRIORITY PROSPECTS:**
   For each prospect from your Step 4 output, include:
   - Name, title, company, category
   - Conversation hook: "I noticed [name] [specific engagement evidence from Step 4]"  
   - Value proposition: Why this intro benefits both ${this.advisorName} and the prospect
   - Introduction difficulty: Easy/Medium/Hard based on intro_likelihood score

**3. CONVERSATION SCRIPTS:**
   - Opening: How to ask ${this.originContact} permission-first for introductions
   - Prospect-specific talking points for each top 3
   - Fallback prospects (#4-6 from Step 4) if primary ones don't resonate
   - Permission language: "How well do you know [name]? Think they'd be open to..."

**4. NETWORK INSIGHTS:**
   - Company clusters (multiple people from same firms identified in Steps 1-4)
   - Industry concentrations discovered
   - Engagement patterns (which posts attracted which prospect types)
   - Notable non-mutual discoveries and their significance

Format as meeting-ready talking points for client conversation with ${this.originContact}.

**This completes the 5-step LinkedIn warm introduction analysis.**`;
    }

    getAllPrompts() {
        return {
            step1: this.getStep1Prompt(),
            step2: this.getStep2Prompt(),
            step3: this.getStep3Prompt(),
            step4: this.getStep4Prompt(),
            step5: this.getStep5Prompt()
        };
    }

    generateSessionHeader() {
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const sessionId = `${this.caseName}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

        return `=== LINKEDIN WARM INTRO SESSION ===
Target: ${this.target}
Company: ${this.company}
Origin Contact: ${this.originContact}
Advisor: ${this.advisorName}
Case Name: ${this.caseName}
Date: ${timestamp}
Session ID: ${sessionId}
Recency Mode: ${this.strictRecency ? 'STRICT' : 'STALE_OK'}

Objective: Extract and analyze ${this.target}'s network for warm introduction opportunities
Expected Output: JSON connection data with interaction analysis

=== PROMPTS USED ===

`;
    }
}

// Global variables
let selectedStep = 'all';
let currentGenerator = null;

// DOM Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize step selector
    document.querySelector('.step-btn[data-step="all"]').classList.add('active');
    
    // Add event listeners to step buttons
    document.querySelectorAll('.step-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            selectedStep = this.dataset.step;
        });
    });

    // Add form validation
    const requiredFields = document.querySelectorAll('input[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', validateField);
    });
});

function validateField(event) {
    const field = event.target;
    if (field.value.trim() === '') {
        field.style.borderColor = 'var(--danger-color)';
    } else {
        field.style.borderColor = 'var(--border-color)';
    }
}

function generatePrompts() {
    // Get form values
    const target = document.getElementById('target').value.trim();
    const company = document.getElementById('company').value.trim();
    const advisor = document.getElementById('advisor').value.trim() || 'Advisor';
    const origin = document.getElementById('origin').value.trim();
    const caseName = document.getElementById('caseName').value.trim();
    const strictRecency = document.getElementById('strictRecency').checked;

    // Validate required fields
    if (!target || !company) {
        alert('Please fill in the required fields: Target Person and Target\'s Company');
        return;
    }

    // Show loading
    const loading = document.querySelector('.loading');
    loading.style.display = 'flex';

    // Simulate processing time for better UX
    setTimeout(() => {
        try {
            // Create generator instance
            currentGenerator = new PromptGenerator(
                target,
                company,
                caseName,
                advisor,
                origin,
                strictRecency
            );

            // Generate prompts based on selection
            let output = '';
            let individualSteps = {};
            
            if (selectedStep === 'all') {
                // Generate all steps with session header
                output = currentGenerator.generateSessionHeader();
                const allPrompts = currentGenerator.getAllPrompts();
                
                // Store individual steps for separate display
                individualSteps.header = currentGenerator.generateSessionHeader();
                Object.keys(allPrompts).forEach((step, index) => {
                    const stepNum = step.replace('step', '');
                    const stepContent = `## Step ${stepNum} Prompt\n\n${allPrompts[step]}`;
                    individualSteps[step] = stepContent;
                    
                    output += `## Step ${stepNum} Prompt\n\n`;
                    output += allPrompts[step];
                    if (index < Object.keys(allPrompts).length - 1) {
                        output += '\n\n' + '='.repeat(50) + '\n\n';
                    }
                });
            } else {
                // Generate specific step
                const stepMethod = `getStep${selectedStep}Prompt`;
                if (currentGenerator[stepMethod]) {
                    output += `## Step ${selectedStep} Prompt\n\n`;
                    output += currentGenerator[stepMethod]();
                } else {
                    throw new Error(`Invalid step: ${selectedStep}`);
                }
            }

            // Display output
            displayPrompts(output, individualSteps);
            
        } catch (error) {
            console.error('Error generating prompts:', error);
            alert('Error generating prompts. Please check your input and try again.');
        } finally {
            // Hide loading
            loading.style.display = 'none';
        }
    }, 1000); // Simulate processing time
}

function displayPrompts(output, individualSteps = {}) {
    const outputSection = document.getElementById('outputSection');
    const promptOutput = document.getElementById('promptOutput');
    
    // Clear previous output
    promptOutput.innerHTML = '';
    
    // If we have individual steps (All Steps selected), display them separately
    if (Object.keys(individualSteps).length > 0) {
        // Add a header explaining the workflow
        const workflowHeader = document.createElement('div');
        workflowHeader.className = 'workflow-header';
        workflowHeader.innerHTML = `
            <h4>📋 Your Generated Prompts - Ready for AI Chat</h4>
            <p>Copy each step below and send them <strong>sequentially</strong> in your AI conversation. Each step builds on the previous one.</p>
        `;
        promptOutput.appendChild(workflowHeader);
        
        // First add the session header if it exists
        if (individualSteps.header) {
            const headerContainer = document.createElement('div');
            headerContainer.className = 'step-card session-header-card';
            
            const stepHeader = document.createElement('div');
            stepHeader.className = 'step-card-header';
            stepHeader.innerHTML = `
                <h5>📄 Session Header</h5>
                <span class="step-description">Copy this first to start your session log</span>
            `;
            
            const headerContent = document.createElement('pre');
            headerContent.className = 'step-content';
            headerContent.textContent = individualSteps.header;
            
            const headerCopyBtn = document.createElement('button');
            headerCopyBtn.className = 'step-copy-btn';
            headerCopyBtn.innerHTML = `
                <span class="copy-icon">📋</span>
                <span class="copy-text">Copy Session Header</span>
            `;
            headerCopyBtn.onclick = () => copyToClipboard(individualSteps.header, headerCopyBtn);
            
            headerContainer.appendChild(stepHeader);
            headerContainer.appendChild(headerContent);
            headerContainer.appendChild(headerCopyBtn);
            promptOutput.appendChild(headerContainer);
        }
        
        // Add each step as a separate card
        const stepOrder = ['step1', 'step2', 'step3', 'step4', 'step5'];
        stepOrder.forEach(step => {
            if (individualSteps[step]) {
                const stepNum = step.replace('step', '');
                const stepContainer = document.createElement('div');
                stepContainer.className = 'step-card prompt-step-card';
                
                const stepHeader = document.createElement('div');
                stepHeader.className = 'step-card-header';
                const stepDescriptions = {
                    '1': 'Extract mutual connections from LinkedIn',
                    '2': 'Analyze engagement patterns and find active users',
                    '3': 'Categorize prospects by role and evidence',
                    '4': 'Score prospects for introduction likelihood',
                    '5': 'Generate meeting intelligence and talking points'
                };
                stepHeader.innerHTML = `
                    <h5>🎯 Step ${stepNum}</h5>
                    <span class="step-description">${stepDescriptions[stepNum]}</span>
                `;
                
                const stepContent = document.createElement('pre');
                stepContent.className = 'step-content';
                stepContent.textContent = individualSteps[step];
                
                const stepCopyBtn = document.createElement('button');
                stepCopyBtn.className = 'step-copy-btn';
                stepCopyBtn.innerHTML = `
                    <span class="copy-icon">📋</span>
                    <span class="copy-text">Copy Step ${stepNum}</span>
                `;
                stepCopyBtn.onclick = () => copyToClipboard(individualSteps[step], stepCopyBtn);
                
                stepContainer.appendChild(stepHeader);
                stepContainer.appendChild(stepContent);
                stepContainer.appendChild(stepCopyBtn);
                promptOutput.appendChild(stepContainer);
            }
        });
        
        // Add a "Copy All" button for the complete output
        const allContainer = document.createElement('div');
        allContainer.className = 'step-card copy-all-card';
        
        const allHeader = document.createElement('div');
        allHeader.className = 'step-card-header';
        allHeader.innerHTML = `
            <h5>📦 Complete Package</h5>
            <span class="step-description">All steps + session header in one copy</span>
        `;
        
        const allCopyBtn = document.createElement('button');
        allCopyBtn.className = 'step-copy-btn copy-all-btn';
        allCopyBtn.innerHTML = `
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy Everything</span>
        `;
        allCopyBtn.onclick = () => copyToClipboard(output, allCopyBtn);
        
        allContainer.appendChild(allHeader);
        allContainer.appendChild(allCopyBtn);
        promptOutput.appendChild(allContainer);
        
    } else {
        // Single step display (original behavior)
        const stepContainer = document.createElement('div');
        stepContainer.className = 'step-card prompt-step-card';
        
        const stepContent = document.createElement('pre');
        stepContent.className = 'step-content';
        stepContent.textContent = output;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'step-copy-btn';
        copyBtn.innerHTML = `
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
        `;
        copyBtn.onclick = () => copyToClipboard(output, copyBtn);
        
        stepContainer.appendChild(stepContent);
        stepContainer.appendChild(copyBtn);
        promptOutput.appendChild(stepContainer);
    }
    
    // Show output section
    outputSection.classList.remove('hidden');
    
    // Scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyToClipboard(text, button) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const copyTextElement = button.querySelector('.copy-text');
            const copyIconElement = button.querySelector('.copy-icon');
            const originalText = copyTextElement ? copyTextElement.textContent : button.textContent;
            const originalIcon = copyIconElement ? copyIconElement.textContent : '';
            const originalBackground = button.style.background || '';
            
            // Update button appearance
            if (copyTextElement) copyTextElement.textContent = 'Copied!';
            else button.textContent = 'Copied!';
            if (copyIconElement) copyIconElement.textContent = '✅';
            button.style.background = '#28a745';
            
            setTimeout(() => {
                if (copyTextElement) copyTextElement.textContent = originalText;
                else button.textContent = originalText;
                if (copyIconElement) copyIconElement.textContent = originalIcon;
                button.style.background = originalBackground;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopyToClipboard(text, button);
        });
    } else {
        fallbackCopyToClipboard(text, button);
    }
}

function fallbackCopyToClipboard(text, button) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        // Visual feedback
        const copyTextElement = button.querySelector('.copy-text');
        const copyIconElement = button.querySelector('.copy-icon');
        const originalText = copyTextElement ? copyTextElement.textContent : button.textContent;
        const originalIcon = copyIconElement ? copyIconElement.textContent : '';
        const originalBackground = button.style.background || '';
        
        // Update button appearance
        if (copyTextElement) copyTextElement.textContent = 'Copied!';
        else button.textContent = 'Copied!';
        if (copyIconElement) copyIconElement.textContent = '✅';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            if (copyTextElement) copyTextElement.textContent = originalText;
            else button.textContent = originalText;
            if (copyIconElement) copyIconElement.textContent = originalIcon;
            button.style.background = originalBackground;
        }, 2000);
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Copy failed. Please manually select and copy the text.');
    }
    
    document.body.removeChild(textArea);
}

function clearForm() {
    if (confirm('Are you sure you want to clear all form data?')) {
        // Clear all input fields
        document.getElementById('target').value = '';
        document.getElementById('company').value = '';
        document.getElementById('advisor').value = 'Advisor';
        document.getElementById('origin').value = '';
        document.getElementById('caseName').value = '';
        document.getElementById('strictRecency').checked = false;
        
        // Reset step selection
        document.querySelectorAll('.step-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.step-btn[data-step="all"]').classList.add('active');
        selectedStep = 'all';
        
        // Hide output
        document.getElementById('outputSection').classList.add('hidden');
        
        // Reset field validation styles
        document.querySelectorAll('input').forEach(field => {
            field.style.borderColor = 'var(--border-color)';
        });
        
        // Focus on first field
        document.getElementById('target').focus();
    }
}

// Utility functions for enhanced UX
function showStepInfo(step) {
    const stepDescriptions = {
        '1': 'Extract all mutual connections between you and the target person.',
        '2': 'Analyze which connections engage with the target\'s LinkedIn posts.',
        '3': 'Categorize engaged prospects by role type and relationship strength.',
        '4': 'Score introduction likelihood based on relationship comfort.',
        '5': 'Generate meeting intelligence and conversation scripts.'
    };
    
    // You could add step-specific information display here
    return stepDescriptions[step] || 'Complete 5-step LinkedIn warm introduction analysis.';
}

// Auto-save form data to localStorage (optional enhancement)
function saveFormData() {
    const formData = {
        target: document.getElementById('target').value,
        company: document.getElementById('company').value,
        advisor: document.getElementById('advisor').value,
        origin: document.getElementById('origin').value,
        caseName: document.getElementById('caseName').value,
        strictRecency: document.getElementById('strictRecency').checked,
        selectedStep: selectedStep
    };
    
    localStorage.setItem('linkedinIntroToolkitFormData', JSON.stringify(formData));
}

// Load form data from localStorage (optional enhancement)
function loadFormData() {
    const savedData = localStorage.getItem('linkedinIntroToolkitFormData');
    if (savedData) {
        try {
            const formData = JSON.parse(savedData);
            document.getElementById('target').value = formData.target || '';
            document.getElementById('company').value = formData.company || '';
            document.getElementById('advisor').value = formData.advisor || 'Advisor';
            document.getElementById('origin').value = formData.origin || '';
            document.getElementById('caseName').value = formData.caseName || '';
            document.getElementById('strictRecency').checked = formData.strictRecency || false;
            
            if (formData.selectedStep) {
                selectedStep = formData.selectedStep;
                document.querySelectorAll('.step-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector(`[data-step="${selectedStep}"]`).classList.add('active');
            }
        } catch (e) {
            console.log('Failed to load saved form data:', e);
        }
    }
}

// Auto-save on form changes (optional enhancement)
document.addEventListener('DOMContentLoaded', function() {
    loadFormData();
    
    // Save form data on changes
    document.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('input', saveFormData);
        field.addEventListener('change', saveFormData);
    });
});

// Add keyboard shortcuts (optional enhancement)
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to generate prompts
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generatePrompts();
    }
    
    // Ctrl/Cmd + R to clear form
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        clearForm();
    }
});