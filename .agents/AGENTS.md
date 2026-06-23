# Workspace Rules for Mem0 Memory Integration

You MUST use Mem0 as your primary long-term memory layer to persist and recall user preferences, project configurations, and context across sessions.

## 1. Startup Memory Retrieval (Proactive Search)
- **Trigger:** At the start of every task or session initialization.
- **Action:** Perform a search query to retrieve relevant historical preferences or context related to the current workspace and task scope.
- **Tooling:** Use `mem0/search_memories` (MCP) if available. Fall back to running the command `mem0 search "<query>"` if MCP tools are not yet active in the current session.

## 2. Dynamic Memory Updating (During/End of Task)
- **Trigger:** Whenever the user shares a new preference, configures a new tool, updates a package, or changes their workflow.
- **Action:** Save or update the preference immediately. Do not wait for the end of the session.
- **Format:** Store memories as concise, actionable facts (e.g., "User prefers pnpm over npm", "Project uses Astro v5 with Tailwind", "User email is user@example.com").
- **Tooling:** Use `mem0/add_memory` (MCP) or fall back to running the command `mem0 add "<fact>"` in the terminal.

## 3. Memory Cleanup & Deduplication
- **Trigger:** When conflicting or outdated information is discovered.
- **Action:** Update or delete the obsolete memories to prevent pollution or contradictions.
- **Tooling:** Use `mem0/update_memory` / `mem0/delete_memory` (MCP) or fall back to `mem0 delete --id <id>`.
