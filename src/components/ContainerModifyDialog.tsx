"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useDocker } from "@/providers/docker.provider";
import { toast } from "sonner";
import type * as Dockerode from "dockerode";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  X,
  Plus,
  Trash2,
  Settings,
  HardDrive,
  Network,
  Cpu,
  Shield,
  Tag,
} from "lucide-react";
import z from "zod";

interface ContainerModifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string;
  hostUrl: string;
  containerName: string;
}

// Parse env string array to key-value pairs
function parseEnvArray(
  envArray: string[],
): Array<{ key: string; value: string }> {
  return (envArray || []).map((env) => {
    const splitted = env.split("=");
    const [_, ...valueParts] = splitted;
    const [key, ...parts] = valueParts;
    return { key, value: parts.join("=") };
  });
}

// Convert env pairs back to string array
function stringifyEnvArray(
  envPairs: Array<{ key: string; value: string }>,
): string[] {
  return envPairs.map(({ key, value }, i) => `${i}=${key}=${value}`);
}

// Parse volumes (binds) to key-value pairs
function parseBindsArray(
  bindsArray: string[],
): Array<{ host: string; container: string }> {
  return (bindsArray || []).map((bind) => {
    const [host, container] = bind.split(":");
    return { host, container };
  });
}

// Convert volume pairs back to string array
function stringifyBindsArray(
  volumePairs: Array<{ host: string; container: string }>,
): string[] {
  return volumePairs.map(({ host, container }) => `${host}:${container}`);
}

export function ContainerModifyDialog({
  open,
  onOpenChange,
  containerId,
  hostUrl,
  containerName,
}: ContainerModifyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { refreshContainers } = useDocker();

  // Editable config state
  const [image, setImage] = useState("");
  const [envPairs, setEnvPairs] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [volumePairs, setVolumePairs] = useState<
    Array<{ host: string; container: string }>
  >([]);
  const [portBindings, setPortBindings] = useState<
    Record<string, Array<{ HostPort: string }>>
  >({});
  const [memory, setMemory] = useState<number | undefined>(undefined);
  const [cpuShares, setCpuShares] = useState<number | undefined>(undefined);
  const [restartPolicy, setRestartPolicy] = useState<{
    Name: string;
    MaximumRetryCount?: number;
  }>({ Name: "no" });
  const [networkMode, setNetworkMode] = useState<string>("bridge");
  const [privileged, setPrivileged] = useState(false);
  const [workingDir, setWorkingDir] = useState("");
  const [cmd, setCmd] = useState<string[]>([]);
  const [entrypoint, setEntrypoint] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  // Load current container config using query hook
  const { data: config, isLoading: queryLoading } =
    trpc.docker.getContainerConfig.useQuery(
      { hostUrl, containerId },
      { enabled: open && !!containerId && !!hostUrl },
    );

  // Mutation for modifying container
  const modifyMutation = trpc.docker.modifyContainer.useMutation();

  useEffect(() => {
    setLoading(queryLoading);
    if (config && !queryLoading) {
      setImage(config.Image || "");
      console.log(parseEnvArray(config.Env || []));
      setEnvPairs(parseEnvArray(config.Env || []));
      console.log(stringifyEnvArray(parseEnvArray(config.Env || [])));
      setVolumePairs(parseBindsArray(config.HostConfig?.Binds || []));
      setPortBindings(config.HostConfig?.PortBindings || {});
      setMemory(config.HostConfig?.Memory);
      setCpuShares(config.HostConfig?.CpuShares);
      setRestartPolicy(config.HostConfig?.RestartPolicy || { Name: "no" });
      setNetworkMode(config.HostConfig?.NetworkMode || "bridge");
      setPrivileged(config.HostConfig?.Privileged || false);
      setWorkingDir(config.WorkingDir || "");
      setCmd(config.Cmd || []);
      setEntrypoint((config.Entrypoint as string[]) || []);
      setLabels(config.Labels || {});
    }
  }, [config, queryLoading]);

  // Add/remove env variables
  const addEnvVar = () => {
    setEnvPairs([...envPairs, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const newPairs = [...envPairs];
    newPairs[index][field] = value;
    setEnvPairs(newPairs);
  };

  // Add/remove volumes
  const addVolume = () => {
    setVolumePairs([...volumePairs, { host: "", container: "" }]);
  };

  const removeVolume = (index: number) => {
    setVolumePairs(volumePairs.filter((_, i) => i !== index));
  };

  const updateVolume = (
    index: number,
    field: "host" | "container",
    value: string,
  ) => {
    const newPairs = [...volumePairs];
    newPairs[index][field] = value;
    setVolumePairs(newPairs);
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const containerConfig: Dockerode.ContainerCreateOptions = {
        Image: image,
        Env: stringifyEnvArray(envPairs),
        Cmd: cmd.length > 0 ? cmd : undefined,
        Entrypoint: entrypoint.length > 0 ? entrypoint : undefined,
        WorkingDir: workingDir || undefined,
        Labels: labels,
        HostConfig: {
          Binds: stringifyBindsArray(volumePairs),
          PortBindings: portBindings,
          Memory: memory,
          CpuShares: cpuShares,
          RestartPolicy: {
            Name: restartPolicy.Name as
              | "no"
              | "always"
              | "on-failure"
              | "unless-stopped",
            MaximumRetryCount: restartPolicy.MaximumRetryCount,
          },
          NetworkMode: networkMode,
          Privileged: privileged,
        },
      };

      await modifyMutation.mutateAsync({
        hostUrl,
        containerId,
        config: containerConfig,
      });

      toast.success("Container modified successfully");
      onOpenChange(false);

      // Refresh container list after modification
      setTimeout(() => refreshContainers(hostUrl), 2000);
    } catch (error) {
      console.error("Failed to modify container:", error);
      toast.error(
        `Failed to modify container: ${(error as { message: string }).message}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-[90vw] !max-w-4xl max-h-[100vh] overflow-hidden px-3">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Modify Container: {containerName}
          </SheetTitle>
          <SheetDescription>
            Edit container configuration. Changes will require restarting the
            container.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="env">Environment</TabsTrigger>
                <TabsTrigger value="volumes">Volumes</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Image & Basic Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Image</span>
                        <Input
                          id="image"
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          placeholder="nginx:latest"
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          Working Directory
                        </span>
                        <Input
                          id="workingDir"
                          value={workingDir}
                          onChange={(e) => setWorkingDir(e.target.value)}
                          placeholder="/app"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Command</span>
                      <Input
                        id="cmd"
                        value={cmd.join(" ")}
                        onChange={(e) =>
                          setCmd(e.target.value.split(" ").filter(Boolean))
                        }
                        placeholder="npm start"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Space-separated command arguments
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Entrypoint</span>
                      <Input
                        id="entrypoint"
                        value={entrypoint.join(" ")}
                        onChange={(e) =>
                          setEntrypoint(
                            e.target.value.split(" ").filter(Boolean),
                          )
                        }
                        placeholder="/bin/bash"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="env" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          Environment Variables
                        </CardTitle>
                        <CardDescription>
                          Configure environment variables for this container
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={addEnvVar}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Variable
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {envPairs.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No environment variables configured
                        </p>
                      ) : (
                        envPairs.map((env, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <Input
                              placeholder="KEY"
                              value={env.key}
                              onChange={(e) =>
                                updateEnvVar(index, "key", e.target.value)
                              }
                              className="w-1/3"
                            />
                            <span className="text-muted-foreground">=</span>
                            <Input
                              placeholder="value"
                              value={env.value}
                              onChange={(e) =>
                                updateEnvVar(index, "value", e.target.value)
                              }
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeEnvVar(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="volumes" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          Volumes
                        </CardTitle>
                        <CardDescription>
                          Mount volumes and bind mounts
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={addVolume}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Volume
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {volumePairs.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No volumes configured
                        </p>
                      ) : (
                        volumePairs.map((volume, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <Input
                              placeholder="/host/path"
                              value={volume.host}
                              onChange={(e) =>
                                updateVolume(index, "host", e.target.value)
                              }
                              className="flex-1"
                            />
                            <span className="text-muted-foreground">→</span>
                            <Input
                              placeholder="/container/path"
                              value={volume.container}
                              onChange={(e) =>
                                updateVolume(index, "container", e.target.value)
                              }
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeVolume(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="network" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Network & Ports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">
                          Network Mode
                        </span>
                        <select
                          id="networkMode"
                          className="w-full px-3 py-2 border rounded-md"
                          value={networkMode}
                          onChange={(e) => setNetworkMode(e.target.value)}
                        >
                          <option value="bridge">Bridge</option>
                          <option value="host">Host</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <span className="text-sm font-medium">Port Bindings</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: Port binding editing will be available in a future
                        update
                      </p>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Current ports:{" "}
                        {Object.keys(portBindings).join(", ") ||
                          "None configured"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">
                          Memory Limit (bytes)
                        </span>
                        <Input
                          id="memory"
                          type="number"
                          value={memory || ""}
                          onChange={(e) =>
                            setMemory(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            )
                          }
                          placeholder="536870912"
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium">CPU Shares</span>
                        <Input
                          id="cpuShares"
                          type="number"
                          value={cpuShares || ""}
                          onChange={(e) =>
                            setCpuShares(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            )
                          }
                          placeholder="1024"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">
                        Restart Policy
                      </span>
                      <select
                        id="restartPolicy"
                        className="w-full px-3 py-2 border rounded-md"
                        value={restartPolicy.Name}
                        onChange={(e) =>
                          setRestartPolicy({
                            ...restartPolicy,
                            Name: e.target.value,
                          })
                        }
                      >
                        <option value="no">No</option>
                        <option value="always">Always</option>
                        <option value="on-failure">On Failure</option>
                        <option value="unless-stopped">Unless Stopped</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="privileged"
                        checked={privileged}
                        onChange={(e) => setPrivileged(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">
                        Privileged mode
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Grants extended privileges to this container. Use with
                      caution.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Labels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(labels).map(([key, value]) => (
                        <div key={key} className="flex gap-2 items-center">
                          <Input
                            placeholder="key"
                            value={key}
                            onChange={(e) => {
                              const newLabels = { ...labels };
                              delete newLabels[key];
                              newLabels[e.target.value] = value;
                              setLabels(newLabels);
                            }}
                            className="w-1/3"
                          />
                          <span className="text-muted-foreground">=</span>
                          <Input
                            placeholder="value"
                            value={value}
                            onChange={(e) =>
                              setLabels({ ...labels, [key]: e.target.value })
                            }
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newLabels = { ...labels };
                              delete newLabels[key];
                              setLabels(newLabels);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLabels({ ...labels, "": "" })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Label
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
