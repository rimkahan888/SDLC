namespace Sdlc.Api;

internal sealed record StyleTokens(
    string Background,
    string Surface,
    string Text,
    string Muted,
    string Accent,
    string Border,
    string Radius,
    string Shadow,
    string Font,
    string Backdrop);

internal sealed record StylePreviewDocument(string StyleId, string BestFor, StyleTokens Tokens);

internal sealed record OptionDocument(
    string Id,
    string Label,
    string Detail,
    string PromptFragment,
    IReadOnlyList<string>? StarterFiles,
    StylePreviewDocument? Preview);

internal sealed record OptionGroupDocument(
    string Id,
    string Label,
    string Help,
    string Selection,
    bool Required,
    string Presentation,
    IReadOnlyList<string> DefaultOptionIds,
    IReadOnlyList<OptionDocument> Options);

internal sealed record StepDocument(string Id, string Title, string Text);

internal sealed record TextDocument(string Id, string Text);

internal sealed record QuoteDocument(string Text, string Source);

internal sealed record StageDocument(
    string Id,
    int Order,
    string Name,
    string OneLiner,
    string Goal,
    string KeyArtifact,
    IReadOnlyList<StepDocument> Steps,
    IReadOnlyList<TextDocument> DoneChecks,
    IReadOnlyList<TextDocument> Pitfalls,
    IReadOnlyList<QuoteDocument> Quotes,
    IReadOnlyList<string> Templates,
    IReadOnlyList<OptionGroupDocument> OptionGroups);

internal sealed record StyleDocument(
    string Id,
    string Name,
    string Description,
    string BestFor,
    StyleTokens Tokens,
    string PromptFragment);

internal sealed record TemplateDocument(
    string Id,
    string Name,
    string Stage,
    string File,
    string Markdown);

internal sealed record PromptDocument(string Shell, string Stage);
