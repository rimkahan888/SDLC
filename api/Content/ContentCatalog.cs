using System.Text.Json;

namespace Sdlc.Api;

public sealed class ContentCatalog
{
    private ContentCatalog(
        string stagesJson,
        IReadOnlyDictionary<string, string> stageJson,
        string stylesJson,
        IReadOnlyDictionary<string, string> styleJson,
        IReadOnlyDictionary<string, string> templateJson,
        string promptJson)
    {
        StagesJson = stagesJson;
        StageJson = stageJson;
        StylesJson = stylesJson;
        StyleJson = styleJson;
        TemplateJson = templateJson;
        PromptJson = promptJson;
    }

    public string StagesJson { get; }

    public IReadOnlyDictionary<string, string> StageJson { get; }

    public string StylesJson { get; }

    public IReadOnlyDictionary<string, string> StyleJson { get; }

    public IReadOnlyDictionary<string, string> TemplateJson { get; }

    public string PromptJson { get; }

    public static ContentCatalog Load(string repositoryRoot)
    {
        var styles = LoadStyles(repositoryRoot);
        var stages = LoadStages(repositoryRoot, styles);
        var templates = LoadTemplates(repositoryRoot);
        var prompt = LoadPrompt(repositoryRoot);

        return new ContentCatalog(
            ContentJson.Serialize(stages),
            stages.ToDictionary(stage => stage.Id, ContentJson.Serialize, StringComparer.Ordinal),
            ContentJson.Serialize(styles),
            styles.ToDictionary(style => style.Id, ContentJson.Serialize, StringComparer.Ordinal),
            templates.ToDictionary(template => template.Id, ContentJson.Serialize, StringComparer.Ordinal),
            ContentJson.Serialize(prompt));
    }

    public void Write(string outputDirectory)
    {
        var root = Path.GetFullPath(outputDirectory);
        WriteFile(root, "stages.json", StagesJson);
        foreach (var pair in StageJson)
        {
            WriteFile(root, "stages/" + pair.Key + ".json", pair.Value);
        }

        WriteFile(root, "styles.json", StylesJson);
        foreach (var pair in StyleJson)
        {
            WriteFile(root, "styles/" + pair.Key + ".json", pair.Value);
        }

        foreach (var pair in TemplateJson)
        {
            WriteFile(root, "templates/" + pair.Key + ".json", pair.Value);
        }

        WriteFile(root, "prompt.json", PromptJson);
    }

    private static List<StageDocument> LoadStages(string root, IReadOnlyList<StyleDocument> styles)
    {
        var directory = Path.Combine(root, "content", "stages");
        var byId = styles.ToDictionary(style => style.Id, StringComparer.Ordinal);
        var stages = new List<StageDocument>();
        foreach (var fullPath in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            var relative = Relative(root, fullPath);
            var raw = Deserialize<RawStage>(fullPath, relative);
            stages.Add(ExpandStage(raw, relative, styles, byId));
        }

        stages.Sort((left, right) => left.Order.CompareTo(right.Order));
        return stages;
    }

    private static StageDocument ExpandStage(
        RawStage raw,
        string relative,
        IReadOnlyList<StyleDocument> styles,
        IReadOnlyDictionary<string, StyleDocument> byId)
    {
        Require(raw.Id, relative, "id");
        Require(raw.Name, relative, "name");
        Require(raw.OneLiner, relative, "oneLiner");
        Require(raw.Goal, relative, "goal");
        Require(raw.KeyArtifact, relative, "keyArtifact");
        var groups = (raw.OptionGroups ?? throw Missing(relative, "optionGroups"))
            .Select(group => ExpandGroup(group, relative, styles, byId))
            .ToList();
        return new StageDocument(
            raw.Id,
            raw.Order,
            raw.Name,
            raw.OneLiner,
            raw.Goal,
            raw.KeyArtifact,
            raw.Steps ?? throw Missing(relative, "steps"),
            raw.DoneChecks ?? throw Missing(relative, "doneChecks"),
            raw.Pitfalls ?? throw Missing(relative, "pitfalls"),
            raw.Quotes ?? throw Missing(relative, "quotes"),
            raw.Templates ?? throw Missing(relative, "templates"),
            groups);
    }

    private static OptionGroupDocument ExpandGroup(
        RawGroup group,
        string relative,
        IReadOnlyList<StyleDocument> styles,
        IReadOnlyDictionary<string, StyleDocument> byId)
    {
        Require(group.Id, relative, "option group id");
        List<OptionDocument> options;
        if (string.Equals(group.OptionsFrom, "styles", StringComparison.Ordinal))
        {
            options = styles.Select(StyleOption).ToList();
        }
        else
        {
            options = (group.Options ?? throw Missing(relative, "options for group '" + group.Id + "'"))
                .Select(option => ExpandOption(option, group, relative, byId))
                .ToList();
        }

        return new OptionGroupDocument(
            group.Id,
            group.Label,
            group.Help,
            group.Selection,
            group.Required,
            group.Presentation,
            group.DefaultOptionIds ?? [],
            options);
    }

    private static OptionDocument ExpandOption(
        RawOption option,
        RawGroup group,
        string relative,
        IReadOnlyDictionary<string, StyleDocument> styles)
    {
        Require(option.Id, relative, "option id");
        StylePreviewDocument? preview = null;
        if (string.Equals(group.Presentation, "visual", StringComparison.Ordinal))
        {
            var styleId = option.Preview?.StyleId;
            if (string.IsNullOrWhiteSpace(styleId) || !styles.TryGetValue(styleId, out var style))
            {
                throw new InvalidOperationException(
                    $"{relative}: Visual option '{option.Id}' points at unknown style '{styleId}'.");
            }

            preview = Preview(style);
        }

        IReadOnlyList<string>? starters = option.StarterFiles is { Count: > 0 } files ? files : null;
        return new OptionDocument(option.Id, option.Label, option.Detail, option.PromptFragment, starters, preview);
    }

    private static OptionDocument StyleOption(StyleDocument style) =>
        new(style.Id, style.Name, style.Description, style.PromptFragment, null, Preview(style));

    private static StylePreviewDocument Preview(StyleDocument style) =>
        new(style.Id, style.BestFor, style.Tokens);

    private static List<StyleDocument> LoadStyles(string root)
    {
        var directory = Path.Combine(root, "content", "styles");
        var orderPath = Path.Combine(directory, "order.json");
        var order = Deserialize<List<string>>(orderPath, Relative(root, orderPath));
        var rank = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var index = 0; index < order.Count; index++)
        {
            var id = order[index];
            if (!string.IsNullOrWhiteSpace(id))
            {
                rank.TryAdd(id, index);
            }
        }

        var styles = new List<StyleDocument>();
        foreach (var fullPath in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            if (string.Equals(Path.GetFileName(fullPath), "order.json", StringComparison.Ordinal))
            {
                continue;
            }

            var relative = Relative(root, fullPath);
            var style = Deserialize<StyleDocument>(fullPath, relative);
            Require(style.Id, relative, "id");
            RequireTokens(style.Tokens, relative, style.Id);
            styles.Add(style);
        }

        styles.Sort((left, right) =>
        {
            var leftRank = rank.TryGetValue(left.Id, out var leftIndex) ? leftIndex : int.MaxValue;
            var rightRank = rank.TryGetValue(right.Id, out var rightIndex) ? rightIndex : int.MaxValue;
            var compared = leftRank.CompareTo(rightRank);
            return compared != 0 ? compared : string.CompareOrdinal(left.Id, right.Id);
        });
        return styles;
    }

    private static List<TemplateDocument> LoadTemplates(string root)
    {
        var directory = Path.Combine(root, "content", "templates");
        var templates = new List<TemplateDocument>();
        foreach (var fullPath in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            var relative = Relative(root, fullPath);
            var raw = Deserialize<RawTemplate>(fullPath, relative);
            Require(raw.Id, relative, "id");
            Require(raw.File, relative, "file");
            if (raw.File.Contains('\\') || raw.File.Contains("..", StringComparison.Ordinal) || Path.IsPathRooted(raw.File))
            {
                throw new InvalidOperationException($"{relative}: Template file '{raw.File}' escapes templates/.");
            }

            var markdownPath = Path.GetFullPath(Path.Combine(root, raw.File.Replace('/', Path.DirectorySeparatorChar)));
            var templatesRoot = Path.GetFullPath(Path.Combine(root, "templates")) + Path.DirectorySeparatorChar;
            if (!markdownPath.StartsWith(templatesRoot, StringComparison.Ordinal))
            {
                throw new InvalidOperationException($"{relative}: Template file '{raw.File}' escapes templates/.");
            }

            var markdown = File.ReadAllText(markdownPath);
            templates.Add(new TemplateDocument(raw.Id, raw.Name, raw.Stage, raw.File, markdown));
        }

        return templates;
    }

    private static PromptDocument LoadPrompt(string root)
    {
        var shellPath = Path.Combine(root, "content", "prompt", "shell.md");
        var stagePath = Path.Combine(root, "content", "prompt", "stage.md");
        return new PromptDocument(File.ReadAllText(shellPath), File.ReadAllText(stagePath));
    }

    private static void RequireTokens(StyleTokens? tokens, string relative, string id)
    {
        if (tokens is null)
        {
            throw new InvalidOperationException($"{relative}: Style '{id}' is missing tokens.");
        }

        RequireToken(tokens.Background, "background", relative, id);
        RequireToken(tokens.Surface, "surface", relative, id);
        RequireToken(tokens.Text, "text", relative, id);
        RequireToken(tokens.Muted, "muted", relative, id);
        RequireToken(tokens.Accent, "accent", relative, id);
        RequireToken(tokens.Border, "border", relative, id);
        RequireToken(tokens.Radius, "radius", relative, id);
        RequireToken(tokens.Shadow, "shadow", relative, id);
        RequireToken(tokens.Font, "font", relative, id);
        RequireToken(tokens.Backdrop, "backdrop", relative, id);
    }

    private static void RequireToken(string? value, string key, string relative, string id)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{relative}: Style '{id}' token '{key}' is empty.");
        }
    }

    private static void Require(string? value, string relative, string name)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{relative}: {name} is empty.");
        }
    }

    private static InvalidOperationException Missing(string relative, string name) =>
        new($"{relative}: {name} is missing.");

    private static T Deserialize<T>(string fullPath, string relative)
    {
        try
        {
            var value = JsonSerializer.Deserialize<T>(File.ReadAllText(fullPath), ContentJson.Options);
            if (value is null)
            {
                throw new InvalidOperationException(relative + ": JSON root is empty.");
            }

            return value;
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException(relative + ": JSON is invalid. " + exception.Message, exception);
        }
    }

    private static void WriteFile(string root, string relative, string json)
    {
        var path = Path.Combine(root, relative.Replace('/', Path.DirectorySeparatorChar));
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllText(path, json);
    }

    private static string Relative(string root, string fullPath) =>
        Path.GetRelativePath(root, fullPath).Replace('\\', '/');

    private sealed record RawStage(
        string Id,
        int Order,
        string Name,
        string OneLiner,
        string Goal,
        string KeyArtifact,
        List<StepDocument>? Steps,
        List<TextDocument>? DoneChecks,
        List<TextDocument>? Pitfalls,
        List<QuoteDocument>? Quotes,
        List<string>? Templates,
        List<RawGroup>? OptionGroups);

    private sealed record RawGroup(
        string Id,
        string Label,
        string Help,
        string Selection,
        bool Required,
        string Presentation,
        List<string>? DefaultOptionIds,
        List<RawOption>? Options,
        string? OptionsFrom);

    private sealed record RawOption(
        string Id,
        string Label,
        string Detail,
        string PromptFragment,
        List<string>? StarterFiles,
        RawPreview? Preview);

    private sealed record RawPreview(string? StyleId);

    private sealed record RawTemplate(string Id, string Name, string Stage, string File);
}
