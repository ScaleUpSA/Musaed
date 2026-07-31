export interface ModelProvider {
  // eslint-disable-next-line no-unused-vars
  complete: (prompt: string) => AsyncIterable<string>;
}

export class ClearlyFakeModelProvider implements ModelProvider {
  async *complete(prompt: string): AsyncIterable<string> {
    const response = `This is a clearly fake response for: ${prompt}`;
    const words = response.split(" ");

    for (const [index, word] of words.entries()) {
      yield `${index === 0 ? "" : " "}${word}`;
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  }
}
