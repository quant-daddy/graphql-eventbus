---
sidebar_position: 2
---

# Runtime Architecture

GraphQL Eventbus ensures that a non valid event or payload cannot be published at runtime. It also ensures that a consumer only gets an event if the payload is valid. Otherwise, the event handler for that event is not called.
