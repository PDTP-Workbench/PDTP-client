# PDTP Monorepo

This monorepo contains two packages:

- **@pdtp/core**
  Provides the core functionality for PDTP protocol transfer. It parses data sent from the server and returns it as objects. This package is designed to be used directly or as a dependency for other projects.

- **@pdtp/react**
  Provides React components and hooks for rendering and managing data transferred via the PDTP protocol. It builds on the functionality of `@pdtp/core` to offer seamless integration into React applications.

## Package Readme Summaries

### @pdtp/core

The readme for **@pdtp/core** covers:
- An overview of its protocol transfer functionality.
- Installation instructions via npm.
- A basic usage example demonstrating how to instantiate the client and process data.
- A brief explanation of how the package parses server data into various content types (e.g., pages, text, images).

### @pdtp/react

The readme for **@pdtp/react** includes:
- An overview of the provided React components and hooks.
- Installation instructions via npm.
- A simple usage example showing how to wrap your application with `PdtpProvider` and render data using `PdtpRenderer`.
- An explanation of how the package integrates PDTP data processing into a React environment.

## Installation

You can install each package individually using npm:

```bash
npm install @pdtp/core
npm install @pdtp/react
