export function createClaudeStream(onText) {
  let buffer = '';
  let result;

  function consume(line) {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch {
      throw new Error('Claude Code returned an unreadable response stream. Retry analysis.');
    }
    if (message?.type === 'stream_event' && !message.parent_tool_use_id &&
        message.event?.type === 'content_block_delta' && message.event.delta?.type === 'text_delta' &&
        typeof message.event.delta.text === 'string') {
      onText(message.event.delta.text);
    } else if (message?.type === 'result' && !message.parent_tool_use_id) result = message;
  }

  return {
    push(chunk) {
      buffer += chunk;
      if (buffer.length > 2 * 1024 * 1024) throw new Error('Claude Code returned too much output. Retry analysis.');
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        consume(line);
      }
    },
    finish() {
      if (buffer.trim()) consume(buffer);
      buffer = '';
      if (result?.is_error || typeof result?.result !== 'string' || !result.result.trim()) {
        throw new Error('Claude Code returned an incomplete proposal. Retry analysis; no browser changes were made.');
      }
      return result.result;
    },
  };
}
