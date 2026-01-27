"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDocker } from "@/providers/docker.provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Ship,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Package,
  Boxes,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  containerTemplates,
  composeTemplates,
  type DeploymentTemplate,
  type ComposeTemplate,
} from "@/lib/deployment-templates";
import { RestartPolicy } from "@/types";

type DeploymentStep = "host" | "type" | "template" | "configure" | "deploy";
type DeploymentType = "single" | "compose";

export default function DeployPage() {
  const router = useRouter();
  const { hosts } = useDocker();
  const hostsLoading = !hosts.length;

  // Wizard state
  const [currentStep, setCurrentStep] = useState<DeploymentStep>("host");
  const [deploymentType, setDeploymentType] =
    useState<DeploymentType>("single");
  const [selectedHost, setSelectedHost] = useState<
    (typeof hosts)[number] | null
  >(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DeploymentTemplate | null>(null);
  const [selectedComposeTemplate, setSelectedComposeTemplate] =
    useState<ComposeTemplate | null>(null);

  // Configuration state
  const [containerName, setContainerName] = useState("");
  const [imageName, setImageName] = useState("");
  const [cmd, setCmd] = useState("");
  const [envVars, setEnvVars] = useState<
    Array<{ key: string; value: string; description?: string }>
  >([]);
  const [ports, setPorts] = useState<
    Array<{ host: string; container: string }>
  >([]);
  const [volumes, setVolumes] = useState<
    Array<{ host: string; container: string }>
  >([]);
  const [memory, setMemory] = useState<number>(512);
  const [cpuShares, setCpuShares] = useState<number>(1024);
  const [restartPolicy, setRestartPolicy] =
    useState<RestartPolicy>("unless-stopped");

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string>("");
  const [deploymentStatus, setDeploymentStatus] = useState<
    "idle" | "pulling" | "creating" | "starting" | "success" | "error"
  >("idle");
  const [createdContainerId, setCreatedContainerId] = useState<string | null>(
    null,
  );

  const steps: DeploymentStep[] = [
    "host",
    "type",
    "template",
    "configure",
    "deploy",
  ];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleSelectTemplate = (template: DeploymentTemplate) => {
    setSelectedTemplate(template);
    setContainerName(template.config.name || "");
    setImageName(template.config.image);
    setCmd(template.config.cmd?.join(" ") || "");
    setEnvVars(
      template.config.env?.map((e) => ({
        key: e.key,
        value: e.value,
        description: e.description,
      })) || [],
    );
    setPorts(
      template.config.ports?.map((p) => ({
        host: p.host,
        container: p.container,
      })) || [],
    );
    setVolumes(
      template.config.volumes?.map((v) => ({
        host: v.host,
        container: v.container,
      })) || [],
    );
    setMemory(
      template.config.memory ? template.config.memory / (1024 * 1024) : 512,
    );
    setCpuShares(template.config.cpuShares || 1024);
    setRestartPolicy(template.config.restartPolicy || "unless-stopped");
    setCurrentStep("configure");
  };

  const handleSelectComposeTemplate = (template: ComposeTemplate) => {
    setSelectedComposeTemplate(template);
    setCurrentStep("configure");
  };

  const handleDeploy = async () => {
    if (!selectedHost) return;

    setIsDeploying(true);
    setDeploymentStatus("pulling");
    setDeploymentLogs("");

    // Connect to WebSocket for deployment
    const ws = new WebSocket(
      `ws://localhost:3000/api/docker/ws/deployment?host=${selectedHost.tunnelUrl}`,
    );

    ws.onopen = () => {
      console.log("[Deploy] WebSocket connected");

      // Prepare deployment config
      const deployConfig = {
        name: containerName,
        image: imageName,
        cmd: cmd ? cmd.split(" ").filter((c) => c.trim()) : undefined,
        env: envVars.filter((e) => e.key && e.value),
        ports: ports.filter((p) => p.host && p.container),
        volumes: volumes.filter((v) => v.host && v.container),
        memory,
        cpuShares,
        restartPolicy,
      };

      if (deploymentType === "single") {
        // Send container deployment message
        ws.send(
          JSON.stringify({
            type: "deploy_container",
            deployConfig,
          }),
        );
      } else if (selectedComposeTemplate) {
        // Send compose deployment message
        ws.send(
          JSON.stringify({
            type: "deploy_compose",
            composeConfig: {
              projectName: selectedComposeTemplate.id,
              services: selectedComposeTemplate.services,
              networks: selectedComposeTemplate.networks,
              volumes: selectedComposeTemplate.volumes,
            },
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "logs" && message.topic === "deployment") {
          setDeploymentLogs((prev) => prev + message.data);

          // Update status based on log content
          if (message.data.includes("Pulling image")) {
            setDeploymentStatus("pulling");
          } else if (message.data.includes("Creating container")) {
            setDeploymentStatus("creating");
          } else if (message.data.includes("Starting container")) {
            setDeploymentStatus("starting");
          }
        }

        if (message.type === "deployment_complete") {
          if (message.data.status === "success") {
            setDeploymentStatus("success");
            setCreatedContainerId(
              message.data.containerId || message.data.containerIds?.[0],
            );
            toast.success("Deployment completed successfully!");
          } else {
            setDeploymentStatus("error");
            toast.error(`Deployment failed: ${message.data.error}`);
          }
          setIsDeploying(false);
          ws.close();
        }

        if (message.type === "error") {
          setDeploymentStatus("error");
          setDeploymentLogs((prev) => prev + `ERROR: ${message.error}\n`);
          toast.error("Deployment error");
          setIsDeploying(false);
          ws.close();
        }
      } catch (err) {
        console.error("[Deploy] Error parsing message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("[Deploy] WebSocket error:", error);
      setDeploymentStatus("error");
      setDeploymentLogs(
        (prev) =>
          prev + `[${new Date().toISOString()}] WebSocket connection error\n`,
      );
      toast.error("Connection error");
      setIsDeploying(false);
    };

    ws.onclose = () => {
      console.log("[Deploy] WebSocket closed");
      if (isDeploying) {
        setIsDeploying(false);
      }
    };
  };

  const goToNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  if (hostsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deploy Container</h1>
        <p className="text-muted-foreground mt-2">
          Deploy Docker containers and compose stacks with advanced
          configuration
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center gap-2 ${index <= currentStepIndex ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  index < currentStepIndex
                    ? "bg-primary border-primary"
                    : index === currentStepIndex
                      ? "border-primary"
                      : "border-muted"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className="text-sm font-medium capitalize hidden sm:inline">
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 mx-2 ${index < currentStepIndex ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* STEP 1: Host Selection */}
          {currentStep === "host" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Select Target Host
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose which host to deploy to
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hosts.map((host) => (
                  <Card
                    key={host.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedHost?.id === host.id
                        ? "border-primary shadow-md"
                        : ""
                    }`}
                    onClick={() => setSelectedHost(host)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{host.name}</h3>
                        <Badge
                          variant={
                            host.status === "Online" ? "default" : "secondary"
                          }
                        >
                          {host.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {host.tunnelUrl}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={goToNext} disabled={!selectedHost}>
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Deployment Type */}
          {currentStep === "type" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Deployment Type</h2>
                <p className="text-sm text-muted-foreground">
                  Choose single container or compose stack
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    deploymentType === "single"
                      ? "border-primary shadow-md"
                      : ""
                  }`}
                  onClick={() => setDeploymentType("single")}
                >
                  <CardContent className="p-6 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold text-lg mb-2">
                      Single Container
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Deploy a single container with custom configuration
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    deploymentType === "compose"
                      ? "border-primary shadow-md"
                      : ""
                  }`}
                  onClick={() => setDeploymentType("compose")}
                >
                  <CardContent className="p-6 text-center">
                    <Boxes className="w-12 h-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold text-lg mb-2">
                      Docker Compose
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Deploy multi-container applications with compose
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={goToPrevious}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Previous
                </Button>
                <Button onClick={goToNext}>
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Template Selection */}
          {currentStep === "template" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {deploymentType === "single"
                    ? "Choose Template or Custom"
                    : "Choose Compose Template"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Start from a template or configure from scratch
                </p>
              </div>

              {deploymentType === "single" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {containerTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardContent className="p-4">
                          <div className="text-3xl mb-2">{template.icon}</div>
                          <h3 className="font-semibold mb-1">
                            {template.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card
                    className="cursor-pointer border-dashed hover:shadow-md transition-all"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setCurrentStep("configure");
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-semibold">Custom Image</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure from scratch
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {composeTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => handleSelectComposeTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="text-3xl mb-2">{template.icon}</div>
                        <h3 className="font-semibold mb-1">{template.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={goToPrevious}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Previous
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Configuration */}
          {currentStep === "configure" && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Configure Container
                </h2>
                <p className="text-sm text-muted-foreground">
                  Customize your deployment settings
                </p>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="network">Network</TabsTrigger>
                  <TabsTrigger value="volumes">Volumes</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Container Name
                    </label>
                    <Input
                      value={containerName}
                      onChange={(e) => setContainerName(e.target.value)}
                      placeholder="my-container"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Image</label>
                    <Input
                      value={imageName}
                      onChange={(e) => setImageName(e.target.value)}
                      placeholder="nginx:alpine"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Command (CMD)</label>
                    <Input
                      value={cmd}
                      onChange={(e) => setCmd(e.target.value)}
                      placeholder="--protocol=http2 --metrics 0.0.0.0:2000"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Override the default command (space-separated arguments)
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Environment Variables
                    </label>
                    {envVars.map((env, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg">
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="KEY"
                            value={env.key}
                            onChange={(e) => {
                              const newEnv = [...envVars];
                              newEnv[index].key = e.target.value;
                              setEnvVars(newEnv);
                            }}
                            className="flex-1"
                          />
                          <Input
                            placeholder="VALUE"
                            value={env.value}
                            onChange={(e) => {
                              const newEnv = [...envVars];
                              newEnv[index].value = e.target.value;
                              setEnvVars(newEnv);
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEnvVars(envVars.filter((_, i) => i !== index))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                        {env.description && (
                          <p className="text-xs text-muted-foreground">
                            {env.description}
                          </p>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEnvVars([
                          ...envVars,
                          { key: "", value: "", description: "" },
                        ])
                      }
                    >
                      Add Variable
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Restart Policy
                    </label>
                    <Select
                      value={restartPolicy}
                      onValueChange={(v: RestartPolicy) => setRestartPolicy(v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="always">Always</SelectItem>
                        <SelectItem value="on-failure">On Failure</SelectItem>
                        <SelectItem value="unless-stopped">
                          Unless Stopped
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="network" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Port Mappings
                    </label>
                    {ports.map((port, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="Host Port"
                          value={port.host}
                          onChange={(e) => {
                            const newPorts = [...ports];
                            newPorts[index].host = e.target.value;
                            setPorts(newPorts);
                          }}
                        />
                        <span className="flex items-center">:</span>
                        <Input
                          placeholder="Container Port"
                          value={port.container}
                          onChange={(e) => {
                            const newPorts = [...ports];
                            newPorts[index].container = e.target.value;
                            setPorts(newPorts);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPorts(ports.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPorts([...ports, { host: "", container: "" }])
                      }
                    >
                      Add Port
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="volumes" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Volume Mounts
                    </label>
                    {volumes.map((volume, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="Host Path"
                          value={volume.host}
                          onChange={(e) => {
                            const newVolumes = [...volumes];
                            newVolumes[index].host = e.target.value;
                            setVolumes(newVolumes);
                          }}
                        />
                        <span className="flex items-center">:</span>
                        <Input
                          placeholder="Container Path"
                          value={volume.container}
                          onChange={(e) => {
                            const newVolumes = [...volumes];
                            newVolumes[index].container = e.target.value;
                            setVolumes(newVolumes);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setVolumes(volumes.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVolumes([...volumes, { host: "", container: "" }])
                      }
                    >
                      Add Volume
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Memory Limit (MB)
                    </label>
                    <Input
                      type="number"
                      value={memory}
                      onChange={(e) =>
                        setMemory(parseInt(e.target.value) || 512)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">CPU Shares</label>
                    <Input
                      type="number"
                      value={cpuShares}
                      onChange={(e) =>
                        setCpuShares(parseInt(e.target.value) || 1024)
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default is 1024
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("template")}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" /> Previous
                </Button>
                <Button onClick={goToNext} disabled={!imageName}>
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Deploy */}
          {currentStep === "deploy" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Deploy</h2>
                <p className="text-sm text-muted-foreground">
                  Review and deploy your configuration
                </p>
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Deployment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Host:</span>
                    <span className="font-medium">{selectedHost?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Image:</span>
                    <span className="font-mono text-xs">{imageName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Container Name:
                    </span>
                    <span className="font-medium">
                      {containerName || "Auto-generated"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ports:</span>
                    <span>{ports.length} mappings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volumes:</span>
                    <span>{volumes.length} mounts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memory:</span>
                    <span>{memory}MB</span>
                  </div>
                </CardContent>
              </Card>

              {/* Deployment Progress */}
              {deploymentStatus !== "idle" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {deploymentStatus === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : deploymentStatus === "error" ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      )}
                      Deployment{" "}
                      {deploymentStatus === "success"
                        ? "Complete"
                        : deploymentStatus === "error"
                          ? "Failed"
                          : "In Progress"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-black rounded-md p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                        {deploymentLogs}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("configure")}
                  disabled={isDeploying}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" /> Previous
                </Button>

                <div className="flex gap-2">
                  {deploymentStatus === "success" && createdContainerId && (
                    <Button
                      onClick={() =>
                        router.push(
                          `/containers/${createdContainerId}?host=${selectedHost?.tunnelUrl}`,
                        )
                      }
                    >
                      <Zap className="mr-2 w-4 h-4" />
                      View Container
                    </Button>
                  )}

                  {deploymentStatus !== "success" && (
                    <Button onClick={handleDeploy} disabled={isDeploying}>
                      {isDeploying ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Ship className="mr-2 w-4 h-4" />
                          Deploy Container
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
