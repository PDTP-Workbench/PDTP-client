# @pdtp/react

`@pdtp/react` provides React components and hooks for rendering and managing data transferred using the PDTP protocol.
It supports chunked data processing and offers utilities to integrate PDTP seamlessly into React applications.

## Installation

Install using npm:

```bash
npm install @pdtp/react
```

## Usage

Below is a basic example of how to use the provided components:

```typescript
import { PdtpProvider, PdtpRenderer } from "@pdtp/react";

const App = () => {
  return (
    <PdtpProvider
      options={{
        file: "example.pdf",
        headers: { base: 0, start: 1, end: 5 },
      }}
    >
      <PdtpRenderer />
    </PdtpProvider>
  );
};
```

## Overview

- **PdtpProvider**: A context provider for managing PDTP configuration in a React application.
  Wrap your application or component tree with this provider and supply the necessary PDTP request options.

- **usePdtpContext**: A React hook to access the PDTP context.
  This hook will throw an error if it is used outside of a `PdtpProvider`.

- **PdtpRenderer**: A component that automatically renders pages, text, images, and paths based on the PDTP data received from the server.

- **usePdtpData**: A hook for fetching and organizing chunked PDTP data by page.
  It returns a record of page data, including metadata for texts, images, and paths.

For detailed API information, please refer to the source code or additional documentation.
