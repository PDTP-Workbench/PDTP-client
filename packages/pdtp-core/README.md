# @pdtp/core

`@pdtp/core` is a package that supports protocol transfer.
It provides client functionality to parse data sent from the server and return it as objects.
This package is used in `@pdtp/react` and can also be utilized when creating other PDF viewers.

## Installation

Install using npm:

```bash
npm install @pdtp/core
```

## Usage

Below is a basic example:

```typescript
import { PdtpClient } from "@pdtp/core";

const client = new PdtpClient({
  file: "your-file.pdf",
  headers: {
    base: 0,
    start: 0,
    end: 10,
  },
});

client.fetchChunkedData((data) => {
  // Process the received data
  console.log(data);
});
```

## Overview

- Parses data sent from the server and provides various types of content such as pages, text, images, fonts, and paths.
- Request options allow you to specify the file, adjust headers, and control fetch cancellation.
- For detailed API specifications, please refer to the source code or additional documentation.

## License

MIT License
