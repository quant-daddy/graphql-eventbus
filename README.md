<p align="center"><img src="website/static/img/logo-large.png" width="200"/></p>

---

# GraphQL Eventbus

> Build a GraphQL powered Event architecture

## Overview

GraphQL eventbus is an abstraction layer on top of GraphQL SDL to publish and consume messages in a type-safe way. It is message broker agnotic: you can use Kafka, RabbitMQ, Google Pubsub or any other message broker. With features like code generation, API evolution without breaking changes, plugin system for logging and monitoring, and more, you can build a production quality event hub for your service architecture.

## Features

- ✂️ **Schema Driven:** Define your events and payloads in GraphQL schema. Consume your events using GraphQL documents.
- 🤝 **Message Broker agnostic:** Works with any message broker. We provide packages for Google Pubsub and RabbitMQ. You can easily use the library to build a bus for your message broker.
- 🚀 **Code Generation:** <a href="https://www.graphql-code-generator.com/">GraphQL Codegen</a>
  plugin to generate code for typescript (`npm i graphql-eventbus-codegen`).
- 🎯 **Plugins:** We provide plugins for logging and monitoring. You can also build your custom plugins.
- ✴️ **Best Practices:**: Publish time, event ID, and other metadata propagation are built-in for observability.
- 🤖 **Testing Utilities:**: The library comes with utilities to easily sample payload for your events and test your event handlers.

## Intro Video

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/XLbShOmkKk0/0.jpg)](https://www.youtube.com/watch?v=XLbShOmkKk0)

## Documentation

You can find extensive documentation at <a href="https://graphql-eventbus.vercel.app/" target="_blank">https://graphql-eventbus.vercel.app</a>

## Contributing

We are always looking for people to help us grow `graphql-eventbus`! If you have an issue, feature request, or pull request, let us know!

Follow us on [Twitter](https://twitter.com/GraphqlEventbus)!

## License

MIT @ [Suraj Keshri](https://twitter.com/quantdaddy)
