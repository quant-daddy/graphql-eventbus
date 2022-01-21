---
sidebar_position: 2
---

# Runtime Architecture

GraphQL Eventbus ensures that an invalid event or payload cannot be published at runtime. It also ensures that a consumer only gets an event if the payload is valid. Otherwise, the event handler for that event is not called.

#### As a publisher:

- Parse the SDL and extract the events and corresponding payloads.
- Validate the payload at runtime to make sure that the fields are valid and required fields are not missing.
- Trigger the `publish` method with the topic and the validated payload.

#### As a consumer:

It requires the SDL which has all the events that can be consumed and list of all the documents that corresponds to events being consumed by the service.

- Parse the documents and find the list of events being consumed and validate that the field being queried are actually part of the payload.
- Validate the payload when an event is received.
- Extract the fields from the payload and trigger the event handler with the fields that it queried for.
