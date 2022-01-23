// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "GraphQL Eventbus",
  tagline: "Power your event architecture using GraphQL.",
  url: "https://graphql-eventbus.vercel.app/",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "quant-daddy", // Usually your GitHub org/user name.
  projectName: "graphql-eventbus", // Usually your repo name.
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl:
            "https://github.com/quant-daddy/graphql-eventbus/tree/master/website/",
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            "https://github.com/quant-daddy/graphql-eventbus/tree/master/website/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "GraphQL Eventbus",
        logo: {
          alt: "GraphQL Eventbus Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "doc",
            docId: "getting-started/intro",
            position: "left",
            label: "Docs",
          },
          { to: "/blog", label: "Blog", position: "left" },
          {
            href: "https://github.com/quant-daddy/graphql-eventbus",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Tutorial",
                to: "/docs/getting-started/intro",
              },
            ],
          },
          {
            title: "Twitter",
            items: [
              {
                label: "Twitter",
                href: "https://twitter.com/GraphqlEventbus",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "GitHub",
                href: "https://github.com/quant-daddy/graphql-eventbus",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} GraphQL Eventbus. Built with ☕ in NYC.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
