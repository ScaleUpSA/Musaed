export interface SandboxRequest {
  runId: string;
  image: string;
  cpuLimit: number;
  memoryLimitMb: number;
}

export interface SandboxHandle {
  id: string;
  runId: string;
  status: "running";
}

export interface SandboxBroker {
  create(_request: SandboxRequest): Promise<SandboxHandle>;
  destroy(_id: string): Promise<void>;
}

export class InMemorySandboxBroker implements SandboxBroker {
  private readonly sandboxes = new Map<string, SandboxHandle>();

  async create(_request: SandboxRequest): Promise<SandboxHandle> {
    const handle: SandboxHandle = {
      id: `sandbox-${_request.runId}`,
      runId: _request.runId,
      status: "running",
    };
    this.sandboxes.set(handle.id, handle);
    return handle;
  }

  async destroy(_id: string): Promise<void> {
    this.sandboxes.delete(_id);
  }
}
