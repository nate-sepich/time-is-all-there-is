# LinkedIn Warm Intro AI Agent Toolkit

**AI-powered prompt toolkit for systematic LinkedIn warm introduction prospecting**

Transform your LinkedIn network into qualified business opportunities through a proven 5-step methodology optimized for financial advisors, consultants, and business development professionals.

---

## 🎯 What This Does

This toolkit provides battle-tested **prompts for AI agents** (ChatGPT, Claude, etc.) to systematically analyze LinkedIn networks and identify warm introduction opportunities. It's not software you run locally—it's a **prompt engineering system** that works with any AI agent.

### Key Innovation: Permission-First Approach
Unlike aggressive prospecting, this methodology focuses on **relationship comfort**—identifying introductions your contacts would be happy to make based on their actual LinkedIn engagement patterns.

---

## 📋 The 5-Step Process

### Step 1: Extract Mutual Connections
**Goal**: Get clean JSON of all mutual connections  
**Input**: Target name and company  
**Output**: 20-50+ connections with titles and companies

### Step 2: Analyze Interaction Patterns  
**Goal**: Identify who actively engages with target's content  
**Process**: Check target's last 5 LinkedIn posts for likes/comments  
**Discovery**: ~20-25% typically show engagement + find non-mutual high-value engagers

### Step 3: Categorize & Map Evidence
**Goal**: Focus on active engagers with conversation hooks  
**Categories**: exec, finance, engineering, consulting  
**Output**: Evidence-based prospect list with specific post engagement

### Step 4: Score Introduction Readiness
**Goal**: Permission-first likelihood scoring (not deal potential)  
**Algorithm**: 0-8 score based on relationship strength, engagement quality, recency  
**Output**: Top 6 prospects ranked by introduction comfort level

### Step 5: Generate Meeting Intelligence
**Goal**: Actionable talking points for client conversations  
**Format**: Executive summary, conversation scripts, risk assessment  
**Language**: "How well do you know [name]? Think they'd be open to..."

---

## 🛠️ Usage

### Quick Start
1. **Choose your target**: Someone whose network you want to analyze
2. **Generate prompts**: Use the prompt generator tool
3. **Run with AI agent**: Copy prompts to ChatGPT/Claude and follow outputs through all 5 steps
4. **Get results**: Receive meeting-ready prospect intelligence with conversation hooks

### Generate Prompts
```bash
# Generate all 5 step prompts for a target
python3 tools/prompt_generator.py --target "John Smith" --company "Microsoft"

# Generate just Step 2 prompt
python3 tools/prompt_generator.py --target "Sarah Johnson" --company "Apple" --step 2

# Save prompts to file with session header
python3 tools/prompt_generator.py --target "Mike Chen" --company "Google" --with-header --output session.txt
```

### Conversational Workflow
**No manual copying/pasting required** - designed for single chat session:

1. **Generate all 5 prompts**: `python3 tools/prompt_generator.py --target "Name" --company "Company"`
2. **Open ChatGPT/Claude** and start a conversation
3. **Send Step 1 prompt** → Agent returns JSON of mutual connections
4. **Send Step 2 prompt** → Agent uses "your previous message above" to add engagement data
5. **Send Step 3 prompt** → Agent uses "your Step 2 output above" to categorize prospects  
6. **Send Step 4 prompt** → Agent uses "your Step 3 output above" to score introduction likelihood
7. **Send Step 5 prompt** → Agent uses "your Step 4 output above" to generate meeting intelligence

Each step references previous outputs in the same conversation - **zero manual data transfer**

---

## 📊 Validated Results

**Tested across 4+ real cases with consistent results:**

### Success Metrics
- **~20-25% engagement discovery rate** (realistic, not artificially inflated)
- **15-25 qualified prospects** from typical 50+ connection networks
- **Dual-source intelligence**: Mutual connections + non-mutual engagers from post activity
- **Evidence-based conversations**: Specific LinkedIn post engagement for natural talking points

### Cross-Industry Validation
- **Technology professionals**: 52% engineering, 22% finance, 13% exec, 13% consulting
- **Financial services**: Strong financial advisor and CPA networks
- **Corporate executives**: C-level peers and senior leadership connections
- **Consistent patterns**: Career milestone posts attract highest-value professionals

### Discovery Examples
- **VP-level executives**: Non-mutual engagers found through post analysis
- **Corp Dev professionals**: High-value prospects missed by mutual connection analysis
- **Financial services clusters**: Multiple advisors at same firms identified for referral partnerships

---

## 🎯 Best Use Cases

### Financial Advisors
- **Client network development**: Systematically identify high-net-worth prospects in client networks
- **Referral partnerships**: Find financial services professionals for strategic alliances
- **Permission-based prospecting**: Comfortable introductions that strengthen client relationships

### Management Consultants  
- **Industry network expansion**: Target senior executives and decision-makers
- **Strategic partnerships**: Identify complementary service providers
- **Thought leadership amplification**: Connect with influencers who engage with your content

### Business Development
- **Systematic prospecting**: Repeatable methodology for any target profile
- **Evidence-based conversations**: Specific hooks from actual LinkedIn engagement
- **Relationship-first approach**: Build long-term networks rather than transactional connections

---

## 📁 Repository Contents

```
├── README.md                    # This comprehensive guide
├── tools/
│   └── prompt_generator.py      # Core tool - generates customized prompts
└── agent-sessions/
    └── example-case/            # Example: Complete methodology demonstration
        ├── step1.log            # Mutual connections extraction
        ├── step2.log            # Interaction analysis + non-mutual discovery  
        ├── step3.log            # Prospect categorization with evidence
        └── step4.log            # Introduction readiness scoring
```

### Essential Files
- **`tools/prompt_generator.py`**: The only code you need - generates all prompts with token replacement
- **`agent-sessions/example-case/`**: Complete example showing methodology in action
- **`README.md`**: Complete methodology and usage guide (this file)

---

## 🔧 Prompt Generator Tool

### Features
- **Token replacement**: Automatically substitutes `<TARGET>` and `<COMPANY>` in all prompts
- **Individual steps**: Generate specific step prompts or all 5 steps
- **Session headers**: Include logging headers for systematic record-keeping
- **File output**: Save prompts to files or display in terminal

### Command Options
```bash
# Basic usage - all steps
python3 tools/prompt_generator.py --target "Name" --company "Company"

# Specific step only
python3 tools/prompt_generator.py --target "Name" --company "Co" --step 3

# With session header for logging
python3 tools/prompt_generator.py --target "Name" --company "Co" --with-header

# Save to file
python3 tools/prompt_generator.py --target "Name" --company "Co" --output prompts.txt

# Custom case name and advisor details
python3 tools/prompt_generator.py --target "Name" --company "Co" --case-name "custom-test" --advisor-name "Cam"

# Separate origin contact (client who makes intro vs target analyzed)
python3 tools/prompt_generator.py --target "Alex Thompson" --company "TechCorp" --origin-contact "Sarah Johnson"

# Strict recency mode (disqualify engagements >12 months)
python3 tools/prompt_generator.py --target "Name" --company "Co" --strict-recency
```

### Key Features
- **Role separation**: `--target` (person analyzed) vs `--origin-contact` (person making introductions)
- **Advisor identification**: `--advisor-name` for personalized prompts  
- **Recency control**: `--strict-recency` flag to disqualify stale engagements (>12 months)
- **Clear instructions**: JSON-only outputs, batch guidance, conversation flow
- **Safety features**: Built-in undo instructions for accidental LinkedIn activity

### Token System  
All prompts use consistent tokens that get automatically replaced:
- `<TARGET>` → "John Smith" (person whose network is analyzed)
- `<COMPANY>` → "Microsoft" (target's company name)
- `<ORIGIN_CONTACT>` → "Sarah Johnson" (client who would make introductions)  
- `<ADVISOR_NAME>` → "Cameron" (advisor's name in prompts)
- `<CASE_NAME>` → "john-smith" (auto-generated identifier)

---

## 📈 Advanced Methodology Notes

### Permission-First Philosophy
This isn't about finding the biggest deals—it's about finding introductions your contacts would be **comfortable making**. The scoring prioritizes:
1. **Relationship strength** (mutual vs non-mutual)
2. **Engagement quality** (comments > likes)  
3. **Recency** (recent activity weighted higher)
4. **Evidence depth** (specific posts and engagement types)

### Post Types That Work Best
- **Career milestones**: Job changes, promotions, MBA completions
- **Professional achievements**: Awards, certifications, speaking engagements
- **Industry insights**: Company news, market commentary, thought leadership
- **Work anniversaries**: Reflection posts, company milestone celebrations

### Why This Approach Works
1. **Evidence-based conversations**: "I noticed John engaged with your recent post about..."
2. **Natural introduction flow**: Builds on existing demonstrated interest
3. **Relationship strengthening**: Shows you pay attention to your contacts' networks
4. **Systematic scalability**: Repeatable across any target profile or industry

---

## 🚨 Important Notes

### This is NOT Software
- **No local execution**: All analysis happens through AI agent prompts
- **Platform agnostic**: Works with ChatGPT, Claude, or any capable AI agent
- **Prompt engineering**: Success depends on following methodology exactly
- **Conversational workflow**: Designed for single chat session with automatic data flow

### Privacy and Ethics
- **Uses public LinkedIn data only**: No private information or unauthorized access
- **Permission-first approach**: Focuses on relationship comfort over sales pressure
- **Relationship building**: Designed to strengthen networks, not exploit them
- **Transparency**: Clear about methodology with clients and contacts

### Best Practices
- **Follow all 5 steps**: Each step builds on the previous for complete intelligence
- **Document everything**: Keep logs of all outputs for review and improvement
- **Respect relationships**: Never force introductions, always ask permission first
- **Quality over quantity**: Focus on top 3-6 prospects rather than broad outreach

### Safety Guidelines

**Accidental LinkedIn Activity**: If you accidentally like, comment, or connect during research:
> *"If you liked/commented during this session, please undo those actions and confirm."*

**Privacy Protection**:
- Never include profile URLs or email addresses in outputs
- Use only publicly visible LinkedIn information
- Focus on professional context, not personal details
- Maintain confidentiality of all prospect intelligence

**Relationship Ethics**:
- Always use permission-first language: "How well do you know [name]? Think they'd be open to..."
- Respect when contacts decline to make introductions
- Build long-term relationships rather than transactional connections
- Be transparent about your methodology with clients

---

## 📞 Getting Started

1. **Install Python 3.x** (for prompt generation tool)
2. **Choose a target** whose network you want to analyze
3. **Generate all prompts**: `python3 tools/prompt_generator.py --target "Name" --company "Company"`
4. **Open ChatGPT/Claude** and start a new conversation
5. **Send prompts sequentially** - each references previous outputs automatically
6. **Review example-case logs** for complete methodology demonstration

**Ready to transform your LinkedIn network into systematic business opportunities? The conversational workflow eliminates manual copying while maintaining the proven 5-step methodology.**