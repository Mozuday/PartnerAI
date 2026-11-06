type OllamaMessage = {
  role: string;
  content: string;
};

type OllamaChatOptions = {
  model: string;
  messages: OllamaMessage[];
  temperature: number;
  signal?: AbortSignal;
};

const OLLAMA_URL =
  "http://127.0.0.1:11434/api/chat";

export async function chatWithOllama({
  model,
  messages,
  temperature,
  signal,
}: OllamaChatOptions) {
  console.log(
    "Ollama request model:",
    model
  );

  console.log(
    "Ollama request messages:",
    messages.length
  );

  console.log(
    "Ollama system prompt length:",
    messages.find(
      (message) => message.role === "system"
    )?.content.length ?? 0
  );

  const response = await fetch(
    OLLAMA_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model,

        messages,

        stream: true,

        options: {
          temperature,
        },
      }),

      signal,
    }
  );

  if (!response.ok) {
    let errorBody =
      "No error body returned by Ollama.";

    try {
      errorBody =
        await response.text();
    } catch {
      // Ignore body-reading errors.
    }

    console.error(
      "Ollama HTTP error:",
      response.status
    );

    console.error(
      "Ollama error body:",
      errorBody
    );

    console.error(
      "Ollama request model:",
      model
    );

    console.error(
      "Ollama request message count:",
      messages.length
    );

    console.error(
      "Ollama system prompt length:",
      messages.find(
        (message) =>
          message.role === "system"
      )?.content.length ?? 0
    );
  }

  return response;
}