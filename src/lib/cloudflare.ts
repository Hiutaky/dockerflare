type Warp = {
  id: string;
  account_tag: string;
  created_at: string | null;
  deleted_at: string | null;
  name: string;
  connections: Array<{
    colo_name: string;
    uuid: string;
    id: string;
    is_pending_reconnect: boolean;
    origin_ip: string;
    opened_at: string;
    client_id: string;
    client_version: string;
  }>;
  conns_active_at: string | null;
  conns_inactive_at: string | null;
  tun_type: string;
  metadata: {
    ipv4: string;
    ipv6: string;
    vn_id: string | null;
    mr: string | null;
  };
  status: string;
};
interface CloudflareDevice {
  id: string;
  name: string;
  serial_number?: string;
  version?: string;
  os_version?: string;
  user?: {
    id: string;
    email: string;
  };
  metadata: Warp["metadata"];
}

export async function getWARPDevices(): Promise<CloudflareDevice[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare credentials not configured");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/devices?policy_id=all`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Cloudflare API error: ${response.statusText}`);
  }

  const data = (await response.json()).result as CloudflareDevice[];

  for (const device of data) {
    const dResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/warp/${device.id}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (dResponse.ok) {
      const data = (await dResponse.json()).result as Warp;
      device.metadata = data.metadata;
    }
  }
  return data || [];
}
