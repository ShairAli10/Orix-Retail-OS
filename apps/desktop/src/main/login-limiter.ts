export class LoginLimiter {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  public constructor(private readonly now: () => number = Date.now) {}
  public allowed(key: string): boolean {
    const attempt = this.attempts.get(key);
    if (attempt === undefined) return true;
    if (this.now() >= attempt.until) {
      this.attempts.delete(key);
      return true;
    }
    return attempt.count < 5;
  }
  public failed(key: string): void {
    const previous = this.attempts.get(key);
    // Bound memory even if many invalid usernames are submitted.
    if (this.attempts.size >= 1000) this.attempts.delete(this.attempts.keys().next().value ?? "");
    this.attempts.set(key, { count: (previous?.count ?? 0) + 1, until: this.now() + 60000 });
  }
  public succeeded(key: string): void {
    this.attempts.delete(key);
  }
}
