interface NtfyConfig {
  enabled: boolean;
  topic: string;
  server?: string;  // Default: https://ntfy.sh
}

let config: NtfyConfig = {
  enabled: false,
  topic: '',
  server: 'https://ntfy.sh',
};

export function setNtfyConfig(newConfig: Partial<NtfyConfig>): void {
  config = { ...config, ...newConfig };
}

export function getNtfyConfig(): NtfyConfig {
  return { ...config };
}

export async function sendNotification(options: {
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5;  // 1=min, 5=max
  tags?: string[];
  click?: string;  // URL to open on click
}): Promise<void> {
  if (!config.enabled || !config.topic) {
    return;
  }

  const { title, message, priority = 3, tags = [], click } = options;

  try {
    await fetch(`${config.server}/${config.topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': String(priority),
        ...(tags.length > 0 ? { 'Tags': tags.join(',') } : {}),
        ...(click ? { 'Click': click } : {}),
      },
      body: message,
    });
  } catch (err) {
    console.error('[Ntfy] Failed to send notification:', err);
  }
}

// Convenience functions
export async function notifyNeedsInput(agentName: string, projectName: string): Promise<void> {
  await sendNotification({
    title: `🔔 ${agentName} needs input`,
    message: projectName,
    priority: 4,
    tags: ['robot', 'warning'],
  });
}

export async function notifyAgentError(agentName: string, error: string): Promise<void> {
  await sendNotification({
    title: `❌ ${agentName} error`,
    message: error.slice(0, 200),
    priority: 5,
    tags: ['x', 'rotating_light'],
  });
}

export async function notifyAgentComplete(agentName: string, projectName: string): Promise<void> {
  await sendNotification({
    title: `✅ ${agentName} complete`,
    message: projectName,
    priority: 2,
    tags: ['white_check_mark'],
  });
}
