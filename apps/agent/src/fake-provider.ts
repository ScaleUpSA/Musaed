import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type FakeMessage = {
  role: string;
  content?: unknown;
};

type FakeRequest = {
  messages: FakeMessage[];
};

export interface FakeProvider {
  baseUrl: string;
  close: () => Promise<void>;
}

const isFakeMessage = (value: unknown): value is FakeMessage =>
  typeof value === "object" &&
  value !== null &&
  "role" in value &&
  typeof value.role === "string";

const readRequest = async (request: IncomingMessage): Promise<FakeRequest> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("messages" in parsed) ||
    !Array.isArray(parsed.messages) ||
    !parsed.messages.every(isFakeMessage)
  ) {
    throw new Error("Invalid placeholder model request");
  }

  return { messages: parsed.messages };
};

const writeChunk = (response: ServerResponse, payload: unknown): void => {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const writeTextResponse = async (response: ServerResponse, text: string): Promise<void> => {
  const words = text.split(" ");
  for (const [index, word] of words.entries()) {
    writeChunk(response, {
      choices: [{ delta: { content: `${index === 0 ? "" : " "}${word}` } }],
    });
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  writeChunk(response, { choices: [{ delta: {}, finish_reason: "stop" }] });
};

const writeToolResponse = (response: ServerResponse): void => {
  writeChunk(response, {
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          id: "placeholder-write-call",
          type: "function",
          function: { name: "write", arguments: "" },
        }],
      },
    }],
  });
  writeChunk(response, {
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          function: {
            arguments: JSON.stringify({
              path: "placeholder-tool-output.txt",
              content: "Placeholder tool output.",
            }),
          },
        }],
      },
      finish_reason: "tool_calls",
    }],
  });
};

const requestHasToolResult = (messages: FakeMessage[]): boolean =>
  messages.some((message) => message.role === "tool");

const contentText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { text: string } =>
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
  }
  return "";
};

const requestWantsTool = (messages: FakeMessage[]): boolean => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const prompt = contentText(lastUserMessage?.content).toLowerCase();
  return prompt.includes("musaed_placeholder_tool_test");
};

const handleRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "close",
  });

  try {
    const body = await readRequest(request);
    if (requestHasToolResult(body.messages)) {
      await writeTextResponse(response, "Placeholder tool run completed.");
    } else if (requestWantsTool(body.messages)) {
      writeToolResponse(response);
    } else {
      const userContent = body.messages.find((message) => message.role === "user")?.content;
      const prompt = contentText(userContent);
      await writeTextResponse(response, `This is a clearly fake response for: ${prompt}`);
    }
    response.write("data: [DONE]\n\n");
    response.end();
  } catch {
    response.statusCode = 400;
    response.end();
  }
};

export const startFakeProvider = async (): Promise<FakeProvider> => {
  const server = createServer((request, response) => {
    if (request.method !== "POST" || !request.url?.endsWith("/chat/completions")) {
      response.writeHead(404).end();
      return;
    }

    void handleRequest(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Placeholder model failed to bind");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};
