export function buildStreamRequest(model, options) {
  const reasoningEffort = model.slug.toLowerCase() === 'gpt-6-luna' ? 'none' : undefined;
  return {
    requestOptions: {
      ...options,
      model: model.slug,
      ...(reasoningEffort ? { reasoningEffort } : {}),
    },
    reasoningEffort,
  };
}
