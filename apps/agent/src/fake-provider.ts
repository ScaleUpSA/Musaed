export async function* completeFakeResponse(prompt: string): AsyncIterable<string> {
    const response = `This is a clearly fake response for: ${prompt}`;
    const words = response.split(" ");

    for (const [index, word] of words.entries()) {
      yield `${index === 0 ? "" : " "}${word}`;
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
}
