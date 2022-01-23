<p align="center"><img src="website/static/img/logo-large.png" width="200"/></p>

---

# Google Pubsub GraphQL Eventbus

This is a reference implementation of [GraphQL Eventbus](https://www.npmjs.com/package/graphql-eventbus) using Google Pubsub.

## Overview

- ✂️ **Schema Driven:** Define your events and payloads in GraphQL schema. Consume your events using GraphQL documents.
- 🤝 **Message Broker agnostic:** Works with any message broker. We provide packages for Google Pubsub and RabbitMQ. You can easily use the library to build a bus for your message broker.
- 🚀 **Code Generation:** <a href="https://www.graphql-code-generator.com/">GraphQL Codegen</a>
  plugin to generate code for typescript (`npm i graphql-eventbus-codegen`).
- 🎯 **Plugins:** We provide plugins for logging and monitoring. You can also build your custom plugins.
- ✴️ **Best Practices:**: Publish time, event ID, and other metadata propagation are built-in for observability.
- 🤖 **Testing Utilities:**: The library comes with utilities to easily sample payload for your events and test your event handlers.

## Documentation

You can find extensive documentation at <a href="https://graphql-eventbus.vercel.app/" target="_blank">https://graphql-eventbus.vercel.app</a>

## Contributing

We are always looking for people to help us grow `graphql-eventbus`! If you have an issue, feature request, or pull request, let us know!

Follow us on [Twitter](https://twitter.com/GraphqlEventbus)!

## License

MIT @ Suraj Keshri
