# Agentic Frameworks

Agentic frameworks are orchestration layers that coordinate how a language model reasons, selects tools, and manages state across multi-step tasks. They handle the loop of: receiving a goal, deciding what action to take, executing a tool call, observing the result, and planning the next step — iterating until the goal is satisfied or a stopping condition is reached.

Popular frameworks differ in how they structure this loop (e.g. ReAct, plan-and-execute, multi-agent), how they manage memory, and how tightly they integrate with tool ecosystems like MCP. Choosing the right framework depends on the complexity of the task, latency requirements, and the degree of human oversight needed.

!!! note "More details coming soon"
    A survey of agentic frameworks relevant to scientific and detector-operations use cases will be added here.
