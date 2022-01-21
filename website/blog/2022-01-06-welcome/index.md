---
slug: story
title: Story of GraphQL Eventbus
authors: [suraj]
---

In the summer of 2017, I was building a bookmarking app, [Kollate](https://kollate.io). This was my first production release as a software engineer and an entrepreneur. I was new to software engineering and I was using REST API for my backend. I stumbled upon GraphQL at that time and felt in love with the type safety guarantees that it provides at runtime, in addition to amazing tools like GraphiQL, client libraries and more.

In the summer of 2019, I decided to build another app, [Gully](https://gully.to), for building online communities. It's a pretty complex app that is powered by eight microservices all written in typescript and exposing a GraphQL API which is aggregated at the gateway using Apollo Federation. Since I love GraphQL, I decided to use it for service to service HTTP communication as well. My architecture also involved a fair bit of asynchronous communication for sending emails, notifications, live feed and more. I was looking for ways to make the event architecture type safe.

## JSON Schema and Protobuf

I started with a simple solution: using JSON schema to define event payload. Each event had a separate file which contained the schema. I was using it for code generation to make everything type safe. However, I quickly started realizing the pain points. There is no way to see all the events in my architecture. It was painful to open a file to see the event payload. Moreover, there was no library that provided type safety guarantees at runtime. In addition, the JSON schema is pretty verbose compared to a GraphQL SDL. I didn't really like it. Next, I decided to try Protobuf. With data encryption using protobuf, runtime type safety is guaranteed. So it was better than JSON schema. Also, it's not as verbose. However, I wasn't fully convinced that it was the best choice. I loved GraphQL and the easy with which you can define object, field types and more. The ecosystem of tools around GraphQL, especially in javascript/typescript is also amazing. So, I started to think if I can use GraphQL SDL to define events and their payloads.

## GraphQL Eventbus

GraphQL SDL supports only three root types: Query, Mutation, and Subscription. It was created as a replacement for REST or other APIs. There is no notion of event in GraphQL. Note that subscription is more about receiving a stream of data as it is produced. The client must be online or connected when a subscription is triggered. Also, there is no concept of load balancing or queue. This is different from event architecure which involved topics, subcription, load balancing, offline processing and more.

I had to come up with a rule that would let me express a list of topics and corresponding payloads in a GraphQL SDL. It turns out that using the fields of the root Query object as the event names and it's types as the event payload works out really well! And rest is history...GraphQL Eventbus was born. This makes GraphQL a universal language for building your APIs. To learn more, read the docs.

🚌 _Long live GraphQL!_ 🚌
