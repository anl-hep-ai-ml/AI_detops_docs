# Model Context Protocol (MCP) Servers

The Model Context Protocol (MCP) is an open standard that defines how language models communicate with external tools and data sources. An MCP server exposes a set of typed, callable tools — such as database queries, file operations, or API calls — that an agent can invoke during its reasoning loop. By standardising this interface, MCP makes it straightforward to connect a single agent to many heterogeneous systems without bespoke integration work for each one.

For detector operations, MCP servers could provide agents with live access to slow-control databases, data-quality monitoring systems, or run-management APIs.

!!! note "More details coming soon"
    A full treatment of the MCP specification, server implementation patterns, and detector-operations integrations will be added here.
