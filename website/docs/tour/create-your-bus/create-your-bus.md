---
sidebar_position: 1
---

# Create Your Bus

`GraphQLEventBus` is a framework for building your custom event bus that runs in NodeJS. It exposes methods that you can use to create your own bus using a message broker of your choice. The broker is a dumb pipe to propagate the data when an event is published and it triggers the subscribers for the topic with the data is received. The broker could also take care of things like load balancing across subscribers, providing persistence and scalability, retries, and more. This library lets you build a consistent API for publising and consuming events while taking of things like validating event payload, logging, monitoring, schema evolution and more.

## Steps

There are three simple decisions you have to make when creating you event bus.

1. **Publishing** a JSON payload for each topic into the bus so that it can be consumed by the subscribers subscribing to these events. Your message broker must be able to subscribe to individual topics.
2. **Subscribing** only to the events that the consumer is interested in. You must trigger a callback when an event is received for the topic that consumer is susbcribed to, with the exact payload that was published.
3. **Startup and Cleanup logic**: When the bus is being started, you should initialize the message broker, create individual topics, channels, subscriptions and more depending on the inner workings of your bus. Similar, when the bus is closing (typically when the server is shutting down), you should close all the connections to the bus. The clean up logic could be different when you are consuming vs publishing events. Typically, your bus should stop consuming events, wait for some time to process existing requests and publish events for them, and finally shutdown the bus.

Let's practice the steps by creating a bus using `EventEmitter` as our message broker using `GraphQLEventbus` class.
