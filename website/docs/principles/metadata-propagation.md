---
sidebar_position: 4
---

# Metadata Propagation

In a microservice architecture, metadata propagation is crucial for observability. By default, GraphQLEventbus adds the following metadata for every published event:

- `x-request-id`: UUID. This field is only created if the propagated metadata does not have this field.
- `eventId`: UUID generated for every event. This field is overridden for every published event.
- `publishedAt`: an ISO timestamp which denotes the time when an event was published. This field cannot be overriden.

In addition to the default metadata added by the `GraphQLEventbus`, you can add your own custom metadata when publishing an event and it will be passed through when publishing the `baggage`, which include the payload and metadata.
