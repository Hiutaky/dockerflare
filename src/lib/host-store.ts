/**
 * In-Memory Host Store
 * Manages host metadata (status, lastSeen) without database persistence
 * Source of truth for hosts is Cloudflare WARP devices API
 */

export interface HostMetadata {
  deviceId: string;
  status: "Online" | "Offline";
  lastSeen: Date | null;
  containerCount?: number;
  runningContainers?: number;
}

class HostStore {
  private hosts: Map<string, HostMetadata> = new Map();

  /**
   * Update or create host metadata
   */
  upsert(
    deviceId: string,
    data: Partial<Omit<HostMetadata, "deviceId">>,
  ): HostMetadata {
    const existing = this.hosts.get(deviceId);
    const updated: HostMetadata = {
      deviceId,
      status: data.status ?? existing?.status ?? "Offline",
      lastSeen: data.lastSeen ?? existing?.lastSeen ?? null,
      containerCount: data.containerCount ?? existing?.containerCount ?? 0,
      runningContainers:
        data.runningContainers ?? existing?.runningContainers ?? 0,
    };

    this.hosts.set(deviceId, updated);
    return updated;
  }

  /**
   * Get host metadata by device ID
   */
  get(deviceId: string): HostMetadata | undefined {
    return this.hosts.get(deviceId);
  }

  /**
   * Get all host metadata
   */
  getAll(): HostMetadata[] {
    return Array.from(this.hosts.values());
  }

  /**
   * Update host status
   */
  updateStatus(deviceId: string, isOnline: boolean): void {
    const existing = this.hosts.get(deviceId);
    this.upsert(deviceId, {
      status: isOnline ? "Online" : "Offline",
      lastSeen: isOnline ? new Date() : (existing?.lastSeen ?? null),
    });
  }

  /**
   * Update container counts
   */
  updateContainerCounts(
    deviceId: string,
    containerCount: number,
    runningContainers: number,
  ): void {
    this.upsert(deviceId, {
      containerCount,
      runningContainers,
    });
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    this.hosts.clear();
  }

  /**
   * Remove specific host
   */
  remove(deviceId: string): boolean {
    return this.hosts.delete(deviceId);
  }

  /**
   * Get online hosts count
   */
  getOnlineCount(): number {
    return Array.from(this.hosts.values()).filter((h) => h.status === "Online")
      .length;
  }
}

// Export singleton instance
export const hostStore = new HostStore();
