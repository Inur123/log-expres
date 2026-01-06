import crypto from "crypto";

export class HashChainService {
  normalize(value: any): any {
    if (value === null || value === undefined) return undefined;

    if (typeof value === "string") {
      if (value === "") return undefined;
      return value;
    }

    if (Array.isArray(value)) {
      const arr = value
        .map((v) => this.normalize(v))
        .filter((v) => v !== undefined);
      return arr.length ? arr : undefined;
    }

    if (typeof value === "object") {
      const entries = Object.entries(value)
        .map(([k, v]) => [k, this.normalize(v)] as const)
        .filter(([, v]) => v !== undefined);

      entries.sort(([a], [b]) => a.localeCompare(b));

      const out: Record<string, any> = {};
      for (const [k, v] of entries) out[k] = v;

      return Object.keys(out).length ? out : undefined;
    }

    return value;
  }

  generateHash(params: {
    applicationId: string;
    seq: bigint;
    logType: string;
    payload: any;
    prevHash: string;
    secret: string;
  }): string {
    const payloadNorm = this.normalize(params.payload) ?? {};
    const raw = [
      params.applicationId,
      params.seq.toString(),
      params.logType.toUpperCase(),
      JSON.stringify(payloadNorm),
      params.prevHash,
    ].join("|");

    return crypto.createHmac("sha256", params.secret).update(raw).digest("hex");
  }
}
