import React from "react";
import clsx from "clsx";
import styles from "./HomepageFeatures.module.css";

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Schema Driven",
    description: (
      <>
        Define your events and their payloads in a GraphQL schema. Use GraphQL
        documents to consume your events. If you love GraphQL, you will fall in
        love with this library.
      </>
    ),
  },
  {
    title: "Message Broker agnostic",
    description: (
      <>
        GraphQL Eventbus lets you use any message broker you want: RabbitMQ,
        Kafka, NATS, Google PubSub. It just provides an abstraction layer on top
        your broker using GraphQL SDL.
      </>
    ),
  },
  {
    title: "Code Generation",
    description: (
      <>
        We provide{" "}
        <a href="https://www.graphql-code-generator.com/">GraphQL Codegen</a>{" "}
        plugin to generate code for typescript. Never publish or consume events
        without type safety.
      </>
    ),
  },
  {
    title: "Schema Evolution",
    description: (
      <>
        Since all the event consumers explicitly specify the fields they want to
        consume for each event, you can remove or deprecate fields without
        breaking any event consumers.
      </>
    ),
  },
  {
    title: "Plugins",
    description: (
      <>
        We provide plugins for logging and monitoring. One line of code and you
        get prometheus metrics for all the events published and consumed by your
        services. You can also build your custom plugins.
      </>
    ),
  },
  {
    title: "Testing utilities",
    description: (
      <>
        The library comes with utilities to easily sample payload for your
        events and test your event handlers.
      </>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div
      className={clsx("col col--4")}
      style={{
        marginBottom: 20,
      }}
    >
      <div className="text--center padding-horiz--md">
        <h3 className={styles.h3}>{title}</h3>
        <p className={styles.text}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
