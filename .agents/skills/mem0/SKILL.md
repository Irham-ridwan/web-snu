---
name: mem0-memory
description: Use this skill to persist, search, and manage long-term memories about the user and project preferences using the local mem0 CLI.
---

# Mem0 Memory Skill

This skill allows the agent to interact with the Mem0 memory layer using the local `mem0` CLI command.

## Usage Guidelines

### 1. Adding a Memory
To store a new fact, user preference, or project context, execute:
```bash
mem0 add "User preference: <fact/preference>"
```

### 2. Searching Memories
To recall relevant information before starting a task or when looking for context, execute:
```bash
mem0 search "<query>"
```

### 3. Listing Memories
To view a list of all stored memories, execute:
```bash
mem0 list
```

### 4. Deleting a Memory
To delete a specific memory by its ID, execute:
```bash
mem0 delete --id <memory_id>
```
